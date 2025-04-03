import { Schema, model } from 'mongoose'
import crypto from 'crypto'
import Joi from 'joi'
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

userSchema.plugin(mongooseAggregatePaginate)

export const User = model('User', userSchema)
