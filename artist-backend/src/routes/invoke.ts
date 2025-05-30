import { Router } from 'express'
import {
  asyncHandler,
  RequestWithUser,
  validateRequest,
  verifyApiKey,
} from '../middleware/global'
import prisma from '../prisma'
import { invokeLambdaFunction } from '../clients/aws'
import Joi from 'joi'
import { generateRandomKey } from '../services/random'

const invokeRouter = Router()

invokeRouter.post(
  '/:cid',
  validateRequest(
    Joi.object({
      payload: Joi.object().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { cid } = req.params
    const payload = req.body?.payload || {}

    const user = await prisma.user.findUnique({
      where: {
        id: 'artist-0',
      },
    })

    // check if invocation key is valid
    const invocationKey = req.headers.invocationkey as string
    console.log(invocationKey, user?.invocationKey)
    if (!invocationKey || invocationKey !== user?.invocationKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid invocation key',
      })
    }

    const userFunction = await prisma.userFunction.findUnique({
      where: {
        cid,
      },
    })

    if (!userFunction) {
      return res.status(404).json({
        success: false,
        message: 'Function not found',
      })
    }

    const { functionArn } = userFunction

    const randomId = generateRandomKey()
    invokeLambdaFunction(functionArn, {
      body: JSON.stringify({
        ...payload,
        INVOCATION_KEY: user.invocationKey,
        FUNCTION_INVOCATION_ID: randomId,

        USER_PRIVATE_KEY: user.ecdhPrivateKey,
        USER_PUBLIC_KEY: user.ecdhPublicKey,

        USER_WALLET_ADDRESS: user.walletAddress,
        USER_WALLET_PRIVATE_KEY: user.walletPrivateKey,
      }),
    })

    res.json({
      status: 'success',
      FUNCTION_INVOCATION_ID: randomId,
    })
  })
)

export default invokeRouter
