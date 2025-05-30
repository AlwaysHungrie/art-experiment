import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/global'
import prisma from '../clients/prisma'
import {
  generateEcdhKey,
  generateRandomKey,
  generateWallet,
} from '../services/random'

const registerRouter = Router()

const getUsers = async (isAgent: boolean) => {
  const users = await prisma.user.findMany({
    where: {
      isAgent,
    },
    select: {
      id: true,
      walletAddress: true,
      ecdhPublicKey: true,
      apiKey: true,
      invocationKey: true,
    },
  })

  return users
}

registerRouter.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const users = await getUsers(false)
    res.json({
      success: true,
      users,
    })
  })
)

registerRouter.get(
  '/agents',
  asyncHandler(async (req: Request, res: Response) => {
    const agents = await getUsers(true)
    res.json({
      success: true,
      agents,
    })
  })
)

const createUser = async (isAgent: boolean) => {
  const { privateKey, walletAddress } = generateWallet()
  const { ecdhPublicKey, ecdhPrivateKey } = await generateEcdhKey()

  const apiKey = generateRandomKey()
  const invocationKey = isAgent ? undefined : generateRandomKey()

  const user = await prisma.user.create({
    data: {
      isAgent,
      walletPrivateKey: privateKey,
      walletAddress,
      ecdhPublicKey,
      ecdhPrivateKey,
      apiKey,
      invocationKey,
    },
    select: {
      id: true,
      walletAddress: true,
      ecdhPublicKey: true,
      apiKey: true,
      invocationKey: true,
    },
  })

  return user
}

registerRouter.post(
  '/user',
  asyncHandler(async (req: Request, res: Response) => {
    const newUser = await createUser(false)

    console.log(newUser)
    res.json({
      success: true,
      user: newUser,
    })
  })
)

registerRouter.post(
  '/agent',
  asyncHandler(async (req: Request, res: Response) => {
    const newUser = await createUser(true)

    console.log(newUser)
    res.json({
      success: true,
      user: newUser,
    })
  })
)

export default registerRouter
