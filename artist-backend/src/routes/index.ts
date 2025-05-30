import { Router } from 'express'
import functionRouter from './function'
import invokeRouter from './invoke'

const router = Router()

router.use('/function', functionRouter)
router.use('/invoke', invokeRouter)

export default router
