const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer reference is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0, 'Bid amount cannot be negative']
    },
    estimatedDays: {
      type: Number,
      required: [true, 'Estimated delivery days is required'],
      min: [1, 'Estimated days must be at least 1']
    },
    proposal: {
      type: String,
      required: [true, 'Proposal description is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
        message: '{VALUE} is not a valid bid status'
      },
      default: 'PENDING',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for querying bids by project and freelancer
bidSchema.index({ projectId: 1, freelancerId: 1 });
bidSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('Bid', bidSchema);
