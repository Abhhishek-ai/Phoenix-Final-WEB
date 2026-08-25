const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigning user reference is required']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    deadline: {
      type: Date
    },
    status: {
      type: String,
      enum: {
        values: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'],
        message: '{VALUE} is not a valid assignment status'
      },
      default: 'ASSIGNED',
      index: true
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0
    }
  },
  {
    timestamps: true
  }
);

assignmentSchema.index({ projectId: 1, freelancerId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
