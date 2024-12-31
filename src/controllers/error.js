import { StatusCodes } from 'http-status-codes'
import dotenv from 'dotenv'

const admin = require('firebase-admin')

dotenv.config()

import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_ERROR = {
  errorLog: asyncMiddleware(async (req, res) => {
    let body = req.body

    let error = await createErrorLog({ body })

    res.status(StatusCodes.OK).json({
      data: error,
      message: 'Error log created successfully',
    })
  }),
}
