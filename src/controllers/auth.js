// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty } from 'lodash'
import speakeasy from 'speakeasy'
import dotenv from 'dotenv'

const admin = require('firebase-admin')

dotenv.config()

// * Models
import { User, TOTP } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// * Utilities
import { getRoleShortName, USER_TYPES, SYSTEM_USER_ROLE } from '../utils/user'
import Email from '../utils/email'
import { comparePassword, generateOTToken, generatePassword, generateToken, verifyTOTPToken } from '../utils'

export const CONTROLLER_AUTH = {
  getCode: asyncMiddleware(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (user) {
      return res.status(400).json({
        message: 'Email provided is already register',
      })
    } else {
      var secret = speakeasy.generateSecret({ length: 20 }).base32
      var token = speakeasy.totp({
        digits: 4,
        secret: secret,
        encoding: 'base32',
        window: 6,
      })

      // console.log('token', token)

      // await sendSMS(`Your time based one time login code is: ${token}`, phoneNumber) // UTL

      const TOTPToken = await generateOTToken({ secret })

      // Find if the document with the phoneNumber exists in the database
      let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })

      if (isEmpty(totp)) {
        new TOTP({
          email,
          token: TOTPToken,
        }).save()
      }
      const sendEmail = await new Email({ email })
      const emailProps = { token }
      await sendEmail.registerAccount(emailProps)

      res.json({ message: 'Verification code sent' })
    }
  }),

  verifyAccount: asyncMiddleware(async (req, res) => {
    const { email, code } = req.body

    let totp = await TOTP.findOneAndDelete({ email })
    if (!totp) {
      return res.status(400).json({ message: 'No OTP record found or it has already been used.' })
    }

    let decoded = await verifyTOTPToken(totp.token)
    let verified = speakeasy.totp.verify({
      digits: 4,
      secret: decoded.secret,
      encoding: 'base32',
      token: code,
      window: 10,
    })

    if (verified) {
      // const hashedPassword = await generatePassword(newPassword)

      // await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

      // console.log(`Password updated for ${email}`)
      res.json({ message: 'Account verified successfully' })
    } else {
      res.status(400).json({ message: 'Invalid verification code' })
    }
  }),

  signUp: asyncMiddleware(async (req, res) => {
    let { name, email, password, phone, fcmToken } = req.body

    const user = await User.findOne({
      email: email,
    })

    if (user)
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Email already exists.',
      })

    const hasedPassword = await generatePassword(password)

    const newUser = new User({
      name,
      email,
      password: hasedPassword,
      file: 'https://res.cloudinary.com/dojo-dev/image/upload/v1721912391/biddi-cars-dev/1721912406433.png',
      fcmToken,
      phone,
      userTypes: [USER_TYPES.USR],
      role: { name: SYSTEM_USER_ROLE.USR, shortName: getRoleShortName(USER_TYPES.USR, SYSTEM_USER_ROLE.USR) },
    })

    await newUser.save()

    const tokenPayload = {
      _id: newUser._id,
      _email: newUser.email,
      role: newUser.role,
      userTypes: newUser.userTypes,
      campus: '',
    }

    const tokens = await generateToken(tokenPayload)

    // email temp here

    const sendEmail = await new Email({ email })
    const emailProps = { name }
    await sendEmail.welcomeToZeal(emailProps)

    res.status(StatusCodes.OK).json({
      data: {
        user: { ...newUser._doc },
        ...tokens,
      },
      message: 'User registered successfully',
    })
  }),

  signIn: asyncMiddleware(async (req, res) => {
    const { email, password, fcmToken } = req.body // Changed from req.query to req.body
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const isAuthenticated = await comparePassword(password, user.password)

    if (!isAuthenticated) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Incorrect Password or Email.',
      })
    }

    if (fcmToken) {
      user.fcmToken = fcmToken
    }
    delete user.password

    const tokenPayload = {
      _id: user._id,
      role: user.role,
      userTypes: user.userTypes,
      campus: user.student['school'],
    }

    const tokens = await generateToken(tokenPayload)

    user.refreshTokens = [tokens.refreshToken]

    await user.save()

    res.status(StatusCodes.OK).json({
      data: {
        user: { ...user._doc },
        ...tokens,
      },
      message: 'Logged In Successfully',
    })
  }),

  signOut: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const user = await User.findById(userId)

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    if (user) {
      ;(user.refreshTokens = ''), (user.accessToken = ''), (user.fcmToken = ''), await user.save()
    }

    res.status(StatusCodes.OK).json({ message: 'Logged out successfully' })
  }),

  forgotPassword: asyncMiddleware(async (req, res) => {
    // console.log('INSIDE1')
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({
        message: 'Email provided is not valid',
      })
    }

    const name = user.name

    // if (!user) {
    //   return res.status(400).json({
    //     message: 'Email provided is not valid',
    //   })
    // }

    var secret = speakeasy.generateSecret({ length: 20 }).base32
    var token = speakeasy.totp({
      digits: 4,
      secret: secret,
      encoding: 'base32',
      window: 6,
    })

    // console.log('token', token)

    // await sendSMS(`Your time based one time login code is: ${token}`, phoneNumber) // UTL

    const TOTPToken = await generateOTToken({ secret })

    // Find if the document with the phoneNumber exists in the database
    let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })

    if (isEmpty(totp)) {
      new TOTP({
        email,
        token: TOTPToken,
      }).save()
    }
    const sendEmail = await new Email({ email })
    const emailProps = { token, name }
    await sendEmail.sendForgotPassword(emailProps)

    res.json({ message: 'Verification code sent' })
  }),

  verifyUpdatePasswordCode: asyncMiddleware(async (req, res) => {
    const { email, code } = req.body

    let totp = await TOTP.findOneAndDelete({ email })
    if (!totp) {
      return res.status(400).json({ message: 'No TOTP record found or it has already been used.' })
    }

    let decoded = await verifyTOTPToken(totp.token)
    let verified = speakeasy.totp.verify({
      digits: 4,
      secret: decoded.secret,
      encoding: 'base32',
      token: code,
      window: 10,
    })

    if (verified) {
      res.json({ message: 'code verified' })
    } else {
      res.status(400).json({ message: 'Invalid verification code' })
    }
  }),

  forgotPasswordUpdate: asyncMiddleware(async (req, res) => {
    const { email, newPassword } = req.body

    const hashedPassword = await generatePassword(newPassword)

    const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

    if (!user) {
      return res.status(400).json({ message: 'User not found' })
    }
    // console.log(`Password updated for ${email}`)
    res.json({ message: 'Password updated successfully' })
  }),

  sendNotification: asyncMiddleware(async (req, res) => {
    const { title, body } = req.body

    const token =
      'dVmV0BybjkAulTH8DLfGZm:APA91bFWHUpZ0D94IGR32tGdNsRDyj_29FstYdF9Nq_K2m8KgAGUk144juITDh0QZsMUy6OWfmyAjPKaWnGg4suHOPeV3cMpgRLTOfAUTlQ5lShVKHeDgxg'

    const message = {
      notification: {
        title: 'i am title',
        body: 'body is here',
      },
      token,
    }

    // admin.messaging().sendMulticast(message)
    admin.messaging().send(message)

    res.json({ message: 'notification sent successfully' })
  }),

  changePassword: asyncMiddleware(async (req, res) => {
    const id = req.query.id
    const { newPassword, oldPassword } = req.body

    const user = await User.findById(id).select('password')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const isAuthenticated = await comparePassword(oldPassword, user.password)

    if (!isAuthenticated) {
      return res.status(400).json({ message: 'Incorrect Password' })
    }

    // Check if the new password is the same as the old password
    const isSamePassword = await comparePassword(newPassword, user.password)
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password' })
    }

    const hashedPassword = await generatePassword(newPassword)

    await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true })

    // console.log(`Password updated for ${email}`)
    res.json({ message: 'Password updated successfully' })
  }),
}
