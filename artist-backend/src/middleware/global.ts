import { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import prisma from '../prisma'
import { User } from '../generated/prisma'

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export interface RequestWithUser extends Request {
  user: {
    id: string
  }
}

export const verifyApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers.apikey as string
  if (!apiKey) {
    res.status(401).json({ message: 'Missing API key' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        apiKey,
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      res.status(401).json({ message: 'Invalid API key' })
      return
    }

    ;(req as RequestWithUser).user = user

    next()
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
}

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    next()
  }
}

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default error values
  const statusCode = err?.statusCode || 500
  const message = err?.message || 'Something went wrong'

  // Log errors in development and production
  console.error(`${req?.method} ${req?.path} - ${err?.message}`, {
    stack: err?.stack,
    statusCode,
  })

  // Prepare response based on error type
  const response: any = {
    success: false,
    message,
  }

  // Add validation errors if present
  if (err?.errors) {
    response.errors = err?.errors
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err?.stack
  }

  res.status(statusCode).json(response)
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads')
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    )
  },
})

// handle multiple file uploads
// only .js files
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: (req, file, cb) => {
    const validExtensions = /\.js$/
    const validMimeTypes = /text\/javascript|application\/javascript/
    const extname = validExtensions.test(path.extname(file.originalname))
    const mimetype = validMimeTypes.test(file.mimetype)

    if (extname && mimetype) {
      return cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

export const uploadFiles = upload.array('files', 10)
