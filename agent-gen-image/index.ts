import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getImageDescription, getImage } from './openai'
import { PinataUploader } from './pinata'
import axios from 'axios'

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

// Constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
] as const

// Types
interface RequestBody {
  openaiApiKey: string
  pinataJwt: string
  imageUrl: string
  imageMimetype: string
  pinataGateway: string
}

interface ResponseBody {
  imageUrl: string
  prompt: string
  openaiImageUrl: string
}

interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: APIGatewayProxyResult
}

// Utility functions
const createErrorResponse = (
  statusCode: number,
  message: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error: message }),
})

const createSuccessResponse = (data: ResponseBody): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: JSON.stringify(data),
})

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const isValidMimeType = (mimeType: string): boolean => {
  return SUPPORTED_MIME_TYPES.includes(mimeType as any)
}

// Validation functions
const validateRequestBody = (
  event: APIGatewayProxyEvent
): ValidationResult<RequestBody> => {
  if (!event.body) {
    return {
      success: false,
      error: createErrorResponse(400, 'Request body is required'),
    }
  }

  try {
    const requestBody: RequestBody = JSON.parse(event.body)
    const { openaiApiKey, pinataJwt, imageUrl, imageMimetype, pinataGateway } =
      requestBody

    if (
      !openaiApiKey ||
      !pinataJwt ||
      !imageUrl ||
      !imageMimetype ||
      !pinataGateway
    ) {
      return {
        success: false,
        error: createErrorResponse(400, 'Missing required fields'),
      }
    }

    if (!isValidUrl(imageUrl)) {
      return {
        success: false,
        error: createErrorResponse(400, 'Invalid image URL'),
      }
    }

    if (!isValidMimeType(imageMimetype)) {
      return {
        success: false,
        error: createErrorResponse(400, 'Unsupported image MIME type'),
      }
    }

    return {
      success: true,
      data: requestBody,
    }
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse(400, 'Invalid JSON in request body'),
    }
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bodyValidation = validateRequestBody(event)
    if (!bodyValidation.success) {
      return bodyValidation.error!
    }

    const { openaiApiKey, pinataJwt, imageUrl, imageMimetype, pinataGateway } =
      bodyValidation.data!

    // Fetch and validate input image
    const image = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    if (!image.data) {
      return createErrorResponse(400, 'Failed to fetch input image')
    }

    const imageBuffer = Buffer.from(image.data)
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return createErrorResponse(400, 'Input image too large')
    }

    const imageBase64 = imageBuffer.toString('base64')

    // Generate image description
    const description = await getImageDescription(
      openaiApiKey,
      imageMimetype,
      imageBase64
    ).catch((error) => {
      throw new Error(`Failed to generate image description: ${error.message}`)
    })

    if (!description) {
      return createErrorResponse(500, 'Failed to generate image description')
    }

    // Generate new image
    const generatedImageUrl = await getImage(openaiApiKey, description).catch(
      (error) => {
        throw new Error(`Failed to generate image: ${error.message}`)
      }
    )

    // Fetch and validate generated image
    const generatedImage = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
    })
    if (!generatedImage.data) {
      return createErrorResponse(500, 'Failed to fetch generated image')
    }

    const generatedImageBuffer = Buffer.from(generatedImage.data)
    if (generatedImageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return createErrorResponse(500, 'Generated image too large')
    }

    // Upload to Pinata
    const pinataUploader = new PinataUploader(
      pinataJwt,
      process.env.PINATA_API_URL || 'https://uploads.pinata.cloud/v3'
    )

    const pinataResponse = await pinataUploader
      .uploadImageBuffer(
        Buffer.from(generatedImageBuffer),
        'generated-image.png'
      )
      .catch((error) => {
        throw new Error(`Failed to upload to Pinata: ${error.message}`)
      })

    return createSuccessResponse({
      imageUrl: `${pinataGateway}/ipfs/${pinataResponse}`,
      prompt: description,
      openaiImageUrl: generatedImageUrl,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Internal server error'
    )
  }
}
