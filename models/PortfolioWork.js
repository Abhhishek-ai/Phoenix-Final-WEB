const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String },
    originalName: { type: String }
  },
  { _id: false }
);

const portfolioWorkSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Portfolio title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Portfolio description is required']
    },
    category: {
      type: String,
      required: [true, 'Portfolio category is required'],
      trim: true,
      index: true
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
      }
    ],
    media: [mediaSchema],
    projectLink: {
      type: String,
      trim: true,
      default: ''
    },
    githubLink: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
        message: '{VALUE} is not a valid portfolio status'
      },
      default: 'PENDING_REVIEW',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

portfolioWorkSchema.index({ freelancerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PortfolioWork', portfolioWorkSchema);
