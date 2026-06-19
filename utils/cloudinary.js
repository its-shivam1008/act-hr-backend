const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer.
 * @param {string} folder - Destination folder on Cloudinary.
 * @param {string} filename - original filename.
 * @returns {Promise<object>} Upload result.
 */
const uploadBuffer = (buffer, folder = "org-docs", filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: filename ? filename.split(".")[0] + "_" + Date.now() : undefined,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { cloudinary, uploadBuffer };
