const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const { uploadBuffer } = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * POST /api/upload
 * Generic single-file upload to Cloudinary.
 * Returns { success: true, url: "https://res.cloudinary.com/..." }
 */
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const folder = req.body.folder || "hr-documents";
    const result = await uploadBuffer(req.file.buffer, folder, req.file.originalname);

    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

module.exports = router;
