const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String },
    mimeType: { type: String }
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true }
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Project description is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project creator is required'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Project category is required'],
      trim: true,
      index: true
    },
    requiredSkills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        index: true
      }
    ],
    budget: {
      type: budgetSchema,
      default: () => ({ min: 0, max: 0, currency: 'INR' })
    },
    deadline: {
      type: Date,
      required: [true, 'Project deadline is required']
    },
    attachments: [attachmentSchema],
    status: {
      type: String,
      enum: {
        values: [
          'DRAFT',
          'OPEN',
          'BIDDING',
          'ASSIGNED',
          'IN_PROGRESS',
          'SUBMITTED',
          'REVISION_REQUIRED',
          'COMPLETED',
          'CANCELLED'
        ],
        message: '{VALUE} is not a valid project status'
      },
      default: 'OPEN',
      index: true
    },
    selectedBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid'
    }
  },
  {
    timestamps: true
  }
);

// Compound and auxiliary indexes for common queries
projectSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
