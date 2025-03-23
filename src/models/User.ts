import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    socialAuthProvider: String,
    registrationDate: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
})

const userDetailsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: String,
    lastName: String,
    mobile: String,
    profileImage: String,
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const UserDetails = mongoose.models.UserDetails || mongoose.model('UserDetails', userDetailsSchema)
