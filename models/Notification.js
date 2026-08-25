const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'PROJECT_MATCH',
          'NEW_BID',
          'BID_ACCEPTED',
          'BID_REJECTED',
          'PROJECT_ASSIGNED',
          'WORK_SUBMITTED',
          'WORK_APPROVED',
          'REVISION_REQUESTED',
          'NEW_MESSAGE',
          'DEADLINE_REMINDER',
          'ACCOUNT_APPROVED',
          'NEW_REVIEW',
          'PORTFOLIO_APPROVED'
        ],
        message: '{VALUE} is not a valid notification type'
      }
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    link: {
      type: String,
      default: ''
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
