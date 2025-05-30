import { Router } from 'express'
import {
  asyncHandler,
  RequestWithUser,
  uploadFiles,
  validateRequest,
  verifyApiKey,
} from '../middleware/global'
import Joi from 'joi'
import pinataUploader from '../clients/pinata'
import { config } from '../config'
import axios from 'axios'
import fs from 'fs'
import JSZip from 'jszip'
import {
  checkLambdaFunction,
  createLambdaFunction,
  deleteLambdaFunction,
} from '../clients/aws'
import prisma from '../prisma'

const router = Router()

router.post(
  '/deploy',
  uploadFiles,
  validateRequest(
    Joi.object({
      lambdaFunctionName: Joi.string().required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { lambdaFunctionName } = req.body
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0) {
      return res.json({
        status: 'error',
        message: 'No files uploaded',
      })
    }

    // Upload to IPFS
    const file = files[0] // We'll use the first file
    const fileBuffer = fs.readFileSync(file.path)
    const cid = await pinataUploader.uploadFileBuffer(
      fileBuffer,
      file.originalname,
      {
        contentType: file.mimetype,
      }
    )

    // Create Lambda function
    let functionArn = await checkLambdaFunction(cid)
    if (!functionArn) {
      const fileBuffer = await axios.get(`${config.PINATA_GATEWAY}/ipfs/${cid}`)

      // save file to local file system
      fs.writeFileSync(`temp/${lambdaFunctionName}`, fileBuffer.data)

      // zip the file
      const zip = new JSZip()
      zip.file(`${lambdaFunctionName}`, fileBuffer.data)
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

      // save zip to local file system
      fs.writeFileSync(`temp/${cid}.zip`, zipBuffer)

      // delete the file from local file system
      // fs.unlinkSync(`temp/${lambdaFunctionName}`)

      functionArn = await createLambdaFunction(cid, `temp/${cid}.zip`)

      // delete the zip file from local file system
      // fs.unlinkSync(`temp/${cid}.zip`)
    }

    if (!functionArn) {
      return res.json({
        status: 'error',
        message: 'Failed to create lambda function',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: 'artist-0',
      },
    })

    if (!user) {
      await prisma.user.create({
        data: {
          id: 'artist-0',
          walletAddress: 'artist-0',
          walletPrivateKey: 'artist-0',
          ecdhPublicKey: 'artist-0',
          ecdhPrivateKey: 'artist-0',
          apiKey: 'artist-0',
          invocationKey: 'artist-0',
        },
      })
    }

    await prisma.userFunction.create({
      data: {
        cid,
        functionArn,
        userId: 'artist-0',
      },
    })

    res.json({
      status: 'success',
      result: {
        functionArn,
        cid,
        fileName: file.originalname,
      },
    })
  })
)

// get all functions
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const functions = await prisma.userFunction.findMany({
      where: { userId: 'artist-0' },
    })

    res.json({ status: 'success', result: functions })
  })
)

// delete a function
router.delete(
  '/:cid',
  asyncHandler(async (req, res) => {
    const { cid } = req.params

    const deletedFunction = await prisma.userFunction.delete({
      where: { userId: 'artist-0', cid },
    })

    if (!deletedFunction) {
      return res.json({ status: 'error', message: 'Function not found' })
    }

    await deleteLambdaFunction(deletedFunction.functionArn)
    res.json({ status: 'success' })
  })
)

export default router
