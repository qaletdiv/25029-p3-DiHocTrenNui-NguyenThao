const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary from server-only environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if Cloudinary credentials are fully configured.
 * @returns {boolean}
 */
function isConfigured() {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return Boolean(cloud_name && api_key && api_secret);
}

/**
 * Stream a memory Buffer directly to Cloudinary.
 * @param {Buffer} buffer - File buffer in memory
 * @param {Object} options - Cloudinary upload options (folder, tags, etc.)
 * @returns {Promise<Object>} Resolves with Cloudinary upload result
 */
function uploadStream(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('Cloudinary is not configured. Missing required environment variables.'));
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid buffer provided for upload.'));
    }

    const defaultOptions = {
      folder: 'dhtn/images',
      resource_type: 'image',
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(defaultOptions, (error, result) => {
      if (error) {
        return reject(new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`));
      }
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<Object>} Cloudinary destroy result
 */
async function deleteAsset(publicId) {
  if (!isConfigured()) {
    console.warn('[Cloudinary] Cannot delete asset: Cloudinary credentials not configured.');
    return { result: 'not_configured' };
  }

  if (!publicId || typeof publicId !== 'string') {
    return { result: 'invalid_public_id' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`[Cloudinary] Failed to delete asset ${publicId}:`, error.message);
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadStream,
  deleteAsset,
  isConfigured,
};