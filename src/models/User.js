import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { number } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const userSchema = new Schema(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    gender: String,
    file: Object,
    weight: Number,
    height: Number,
    password: { type: String, select: false },
    accountType: String,
    role: Object,
    userTypes: Array,
    refreshTokens: [String],
    lastActive: {
      type: Date,
    },
    fcmToken: String,
    eatOptions: Array,
    goal: String,
    appGoal: Array,
    allergy: Boolean,
    allergyTypes: Array,
    student: {
      school: String,
      gpa: String,
      status: String,
    },
    exercise: String,
    exerciseTypes: Array,
    phone: String,
    dob: {
      type: Date,
    },
    likedMeals: [
      {
        restaurantId: {
          type: Schema.Types.ObjectId,
        },
        mealId: {
          type: Schema.Types.ObjectId,
        },
      },
    ],
    likedRestaurants: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

userSchema.methods.createEmailVerifyToken = function () {
  const emailToken = crypto.randomBytes(32).toString('hex')

  this.emailToken = crypto.createHash('sha256').update(emailToken).digest('hex')

  return emailToken
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

export const validateRegistration = (obj) => {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).required(),
    password: Joi.string().required(),
    gender: Joi.string(),
    age: Joi.string(),
    location: Joi.string(),
    username: Joi.string(),
    about: Joi.string(),
    weight: Joi.object({
      value: Joi.number(),
      unit: Joi.string().valid('imperial', 'metric'),
    }),
    height: Joi.object({
      value: Joi.number(),
      unit: Joi.string().valid('imperial', 'metric'),
    }),
  }).options({ abortEarly: false })

  return schema.validate(obj)
}
userSchema.plugin(mongooseAggregatePaginate)

export const User = model('User', userSchema)
