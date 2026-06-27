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

/**
 * Deletes a file from Cloudinary given its URL.
 * @param {string} url - Cloudinary secure/insecure URL.
 */
const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return;
  try {
    const urlParts = url.split("/upload/");
    if (urlParts.length < 2) return;
    
    const pathAfterUpload = urlParts[1].replace(/^v\d+\//, "");
    const firstPartParts = urlParts[0].split("/");
    const resourceType = firstPartParts[firstPartParts.length - 1] || "image";
    
    let publicId = pathAfterUpload;
    if (resourceType !== "raw") {
      const extIndex = pathAfterUpload.lastIndexOf(".");
      if (extIndex !== -1) {
        publicId = pathAfterUpload.substring(0, extIndex);
      }
    }
    
    console.log(`[Cloudinary Destroy] resourceType: ${resourceType}, publicId: ${publicId}`);
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary deletion failed:", err.message);
  }
};

module.exports = { cloudinary, uploadBuffer, deleteFromCloudinary };
