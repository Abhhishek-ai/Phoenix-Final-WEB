const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Skill category is required'],
      enum: {
        values: [
          'WEB_DEVELOPMENT',
          'APP_DEVELOPMENT',
          'AI_ML',
          'UI_UX',
          'GRAPHIC_DESIGN',
          'VIDEO_EDITING',
          'CONTENT_WRITING',
          'DIGITAL_MARKETING',
          'DATA_ANALYTICS',
          'PHOTOGRAPHY',
          'OTHER'
        ],
        message: '{VALUE} is not a valid skill category'
      }
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Skill', skillSchema);
