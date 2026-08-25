const mongoose = require('mongoose');

const messageAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String },
    mimeType: { type: String }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: [true, 'Conversation ID is required'],
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender user reference is required'],
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver user reference is required'],
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true
    },
    attachments: [messageAttachmentSchema],
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying conversation messages in chronological order
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
