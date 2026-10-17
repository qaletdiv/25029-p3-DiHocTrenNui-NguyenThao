const multer = require('multer');
const { sendError } = require('../utils/responseHandler');

const MAX_FILE_SIZE_MB = parseFloat(process.env.MAX_FILE_SIZE_MB) || 5;
const MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates actual binary file signatures (magic bytes) to prevent MIME spoofing.
 * @param {Buffer} buffer - File buffer in memory
 * @returns {string|null} - Detected format ('jpeg', 'png', 'webp') or null if invalid
 */
function validateMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  if (isRiff && isWebp) {
    return 'webp';
  }

  return null;
}

// Multer memory storage configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type '${file.mimetype}'. Only JPEG, PNG, and WebP are allowed.`), false);
  }
};

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_BYTES,
  },
  fileFilter,
});

/**
 * Middleware wrapper for single file upload with standard error formatting
 * and deep binary signature validation.
 * @param {string} fieldName - Form field name (default: 'image')
 * @returns {import('express').RequestHandler}
 */
function handleSingleUpload(fieldName = 'image') {
  const upload = multerInstance.single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return sendError(
              res,
              `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_MB}MB`,
              [],
              400
            );
          }
          return sendError(res, `Upload error: ${err.message}`, [], 400);
        }
        return sendError(res, err.message, [], 400);
      }

      // If a file was uploaded, verify actual magic bytes
      if (req.file && req.file.buffer) {
        const detectedFormat = validateMagicBytes(req.file.buffer);
        if (!detectedFormat) {
          return sendError(
            res,
            'Invalid file content: file signature does not match allowed image formats (JPEG, PNG, WebP)',
            [],
            400
          );
        }
        req.file.detectedFormat = detectedFormat;
      }

      next();
    });
  };
}

module.exports = {
  multerInstance,
  handleSingleUpload,
  validateMagicBytes,
  MAX_FILE_SIZE_MB,
  MAX_BYTES,
  ALLOWED_MIME_TYPES,
};
