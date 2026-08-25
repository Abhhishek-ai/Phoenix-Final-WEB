const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.zip',
  '.mp4'
]);

// Dangerous executable extensions
const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.sh',
  '.php',
  '.js',
  '.ts',
  '.py',
  '.cmd',
  '.vbs',
  '.msi',
  '.bin',
  '.com',
  '.jar',
  '.scr'
]);

// Max file size: 100 MB per file
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Multer in-memory storage for controlled Cloudinary streaming
const storage = multer.memoryStorage();

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error(`Security Alert: File type ${ext} is executable and strictly forbidden.`), false);
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new Error(`Unsupported file type '${ext}'. Allowed types: Images (JPG, PNG, WEBP), Documents (PDF, DOC, DOCX), Archives (ZIP), Videos (MP4).`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // up to 5 files per submission
  },
  fileFilter
});

/**
 * Upload buffer to Cloudinary stream
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimeType
 * @param {string} folder
 * @returns {Promise<{ url: string, publicId: string, originalName: string, mimeType: string, size: number }>}
 */
const uploadBufferToCloudinary = (buffer, originalName, mimeType, folder = 'phoenix/deliverables') => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalName).toLowerCase();
    let resourceType = 'auto';
    if (ext === '.pdf' || ext === '.doc' || ext === '.docx' || ext === '.zip') {
      resourceType = 'raw';
    } else if (ext === '.mp4') {
      resourceType = 'video';
    }

    const cleanBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const publicId = `${folder}/${cleanBaseName}_${uniqueSuffix}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${cleanBaseName}_${uniqueSuffix}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Stream Upload Error]:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          originalName,
          mimeType,
          size: buffer.length
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Cleanup / remove uploaded Cloudinary asset if DB operation fails
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary Cleanup] Deleted orphan file: ${publicId}`);
  } catch (err) {
    console.warn(`[Cloudinary Cleanup Warning] Failed to delete file ${publicId}:`, err.message);
  }
};

module.exports = {
  upload,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS
};
