const mongoose = require('mongoose');

const portfolioLinksSchema = new mongoose.Schema(
  {
    github: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    behance: { type: String, trim: true, default: '' },
    dribbble: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const freelancerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    enrollmentNumber: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    branch: {
      type: String,
      required: [true, 'Engineering branch is required'],
      trim: true,
      index: true
    },
    year: {
      type: Number,
      required: [true, 'Academic year is required'],
      min: [1, 'Year must be at least 1'],
      max: [5, 'Year cannot exceed 5']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    profileImage: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        index: true
      }
    ],
    experienceLevel: {
      type: String,
      enum: {
        values: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        message: '{VALUE} is not a valid experience level'
      },
      default: 'BEGINNER'
    },
    portfolioLinks: {
      type: portfolioLinksSchema,
      default: () => ({})
    },
    availability: {
      type: Boolean,
      default: true,
      index: true
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    completedProjects: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);
