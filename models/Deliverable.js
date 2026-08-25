const mongoose = require('mongoose');

const deliverableFileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number }
  },
  { _id: false }
);

const deliverableSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user reference is required']
    },
    title: {
      type: String,
      required: [true, 'Deliverable title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    files: [deliverableFileSchema],
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: {
        values: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REVISION_REQUIRED'],
        message: '{VALUE} is not a valid deliverable status'
      },
      default: 'SUBMITTED',
      index: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewFeedback: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

deliverableSchema.index({ projectId: 1, assignmentId: 1, version: -1 });

module.exports = mongoose.model('Deliverable', deliverableSchema);
