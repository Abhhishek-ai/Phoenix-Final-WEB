const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'FREELANCER', 'CLIENT'],
        message: '{VALUE} is not a valid role'
      },
      default: 'FREELANCER'
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PENDING'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
