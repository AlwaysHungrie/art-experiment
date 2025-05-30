import dotenv from 'dotenv'
dotenv.config()

const PORT = process.env.PORT || 3000

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_API_SECRET = process.env.PINATA_API_SECRET
const PINATA_JWT = process.env.PINATA_JWT
const PINATA_ENDPOINT = process.env.PINATA_ENDPOINT
const PINATA_GATEWAY = process.env.PINATA_GATEWAY

if (
  !PINATA_API_KEY ||
  !PINATA_API_SECRET ||
  !PINATA_JWT ||
  !PINATA_ENDPOINT ||
  !PINATA_GATEWAY
) {
  throw new Error('PINATA variables must be set')
}

export const config = {
  PORT,

  PINATA_API_KEY,
  PINATA_API_SECRET,
  PINATA_JWT,
  PINATA_ENDPOINT,
  PINATA_GATEWAY,
}
