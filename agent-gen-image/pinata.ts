import FormData from 'form-data'
import path from 'path'
import axios from 'axios'

export class PinataUploader {
  jwtToken: string
  apiUrl: string

  constructor(jwtToken: string, apiUrl: string) {
    this.jwtToken = jwtToken
    this.apiUrl = apiUrl
  }

  /**
   * Upload any file from buffer/blob
   * @param {Buffer} fileBuffer - File data as buffer
   * @param {string} filename - Filename with extension
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Returns the CID of the uploaded file
   */
  async uploadFileBuffer(
    fileBuffer: Buffer,
    filename: string,
    options: {
      name?: string
      keyvalues?: Record<string, any>
      network?: string
      contentType?: string
    } = {}
  ) {
    try {
      const displayName = options.name || filename
      const mimeType = options.contentType || 'application/octet-stream'

      // Create form data
      const form = new FormData()

      // Add file buffer
      form.append('file', fileBuffer, {
        filename: displayName,
        contentType: mimeType,
      })

      // Add network (public/private)
      form.append('network', options.network || 'public')

      // Add name
      form.append('name', displayName)

      // Upload to Pinata v3 API
      const response = await axios.post(`${this.apiUrl}/files`, form, {
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })

      if (response.status < 200 || response.status >= 300) {
        const errorText = JSON.stringify(response.data)
        throw new Error(
          `Pinata upload failed (${response.status}): ${errorText}`
        )
      }

      // Return the CID
      return response.data.data.cid
    } catch (error) {
      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        })

        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.response?.statusText ||
          'Unknown API error'

        throw new Error(
          `Pinata API error (${error.response?.status}): ${errorMessage}`
        )
      }

      if (error instanceof Error) {
        throw new Error(
          `Failed to upload file buffer to Pinata: ${error.message}`
        )
      }
      throw new Error(`Failed to upload file buffer to Pinata: ${error}`)
    }
  }

  /**
   * Upload image from buffer/blob
   * @param {Buffer} imageBuffer - Image data as buffer
   * @param {string} filename - Filename with extension
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Returns the CID of the uploaded file
   */
  async uploadImageBuffer(
    imageBuffer: Buffer,
    filename: string,
    options: {
      name?: string
      keyvalues?: Record<string, any>
      network?: string
    } = {}
  ) {
    const fileExtension = path.extname(filename).toLowerCase()

    // Validate image file
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
    ]
    if (!imageExtensions.includes(fileExtension)) {
      throw new Error(`Unsupported image format: ${fileExtension}`)
    }

    // Determine MIME type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
    }
    const mimeType = mimeTypes[fileExtension as keyof typeof mimeTypes] || 'application/octet-stream'

    return this.uploadFileBuffer(imageBuffer, filename, {
      ...options,
      contentType: mimeType,
    })
  }
}

