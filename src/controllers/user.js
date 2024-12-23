// * Libraries
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'
const admin = require('firebase-admin')
dotenv.config()
// * SERVICES
import {} from '../models'
// * Models
import { User, Restaurants, Diet } from '../models'
const { ObjectId } = mongoose.Types

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
// import speakeasy, { totp } from 'speakeasy'
// * Services
// import {
//   addGroup,
//   getGroupsPaginated,
//   getGroupDetails,
//   updateGroupDetails,
//   getGroupMembersPaginated,
//   createPost,
//   getUserPostsPaginated,
//   updatePost,
//   getPostDetails,
//   getgroupsPostsPaginated,
//   getallPostsPaginated,
//   getPostLike,
//   getPostdisLike,
//   createComment,
//   updateComment,
//   getAllComments,
//   createExercise,
//   getAllExercises,
//   createBadge,
//   getABadge,
//   getAllBadge,
//   updateBadge,
//   createChallenge,
//   updateChallenge,
//   getAllZealAdminChallenges,
//   getFriendsChallenges,
//   getCommunityChallenges,
//   getUserProgress,
//   getUserExerciseLog,
//   getChallengeHistory,
//   getUserAllCurrentChallenges,
//   getAllFeaturedChallenges,
//   getUserCreatedChallenges,
//   getSpecificCommunityChallenges,
//   getAllPopularChallenges,
//   getChallengeDetails,
//   retrieveUserChallange,
//   getAllExercisesCategory,
//   getChallengeLeaderboard,
//   getUsersPaginated,
// } from '../services'

// * Utilities
// import { getLoginLinkByEnv, getSanitizeCompanyName, toObjectId } from '../utils/misc'
// import { stripe } from '../utils/stripe'
// import Email from '../utils/email'
// import { escapeRegex } from '../utils/misc'
// import { comparePassword, generateOTToken, generatePassword, generateToken, verifyTOTPToken } from '../utils'
// import { sendSMS } from '../utils/smsUtil'
// import { getIO } from '../socket'

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_USER = {
  profile: asyncMiddleware(async (req, res) => {
    const { _id } = req.decoded
    const id = req.query.id
    // console.log('id', id)
    let userId
    if (id) {
      userId = id
    } else userId = _id

    const user = await User.findByIdAndUpdate(
      userId,
      { lastActive: new Date() }, // the update operation
      { new: true } // options for the update operation
    )
      .select('-password -role -userTypes -refreshTokens') // selecting fields to exclude
      .lean()

    if (!user)
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })

    res.status(StatusCodes.OK).json({
      data: {
        user,
      },
      message: 'Profiles Fetched Successfully',
    })
  }),

  updateProfile: asyncMiddleware(async (req, res) => {
    const id = req.query.id
    console.log(id)

    let body = JSON.parse(req.body.body)

    body = {
      file: req.file && req.file.path,
      ...body,
    }

    const user = await User.findByIdAndUpdate(id, body, { new: true }).select('-password -refreshToken').lean()

    if (!user)
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })

    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Profile updated Successfully',
    })
  }),

  home: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const category = req.query.category

    const userId = decoded?._id
    const user = await User.findById(userId).select('student')
    const campus = user.student.school
    const date = Date.now()
    const restaurants = await Restaurants.find({
      campus,
      category,
    })
      .select('name id tabItems campus likedBy')
      .lean()

    const diet = await Diet.find({ dietOwner: userId, expiresAt: { $gte: date } })
      .select('name')
      .lean()

    res.status(StatusCodes.OK).json({
      data: { restaurants, diet },
      message: 'home info fetched successfully',
    })
  }),
}
