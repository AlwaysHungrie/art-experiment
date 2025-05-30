import crypto from 'crypto'
import { ethers } from 'ethers'

export const generateWallet = () => {
  const hash = crypto
    .createHash('sha256')
    .update(crypto.randomBytes(32))
    .digest('hex')

  const privateKey = `0x${hash}`
  const wallet = new ethers.Wallet(privateKey)
  return {
    privateKey,
    walletAddress: wallet.address,
  }
}

export const generateRandomKey = () => {
  const hash = crypto
    .createHash('sha256')
    .update(crypto.randomBytes(32))
    .digest('hex')

  return hash
}

export const generateEcdhKey = async () => {
  const ecdhKeys = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey']
  )

  const publicKeyBuffer = await crypto.subtle.exportKey(
    'spki',
    ecdhKeys.publicKey
  )
  const privateKeyBuffer = await crypto.subtle.exportKey(
    'pkcs8',
    ecdhKeys.privateKey
  )

  const publicKey = Buffer.from(publicKeyBuffer).toString('base64')
  const privateKey = Buffer.from(privateKeyBuffer).toString('base64')

  return {
    ecdhPublicKey: publicKey,
    ecdhPrivateKey: privateKey,
  }
}

export const loadEcdhKey = async (
  key: string,
  keyType: 'public' | 'private'
) => {
  const keyBuffer = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
  const keyObject = await crypto.subtle.importKey(
    keyType === 'public' ? 'spki' : 'pkcs8',
    keyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )

  return keyObject
}
