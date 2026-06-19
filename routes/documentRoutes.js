const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const {
  getDocuments,
  uploadDocument,
  deleteDocument,
} = require("../controllers/documentController");

// Configure Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.use(protect);

router.get("/", getDocuments);
router.post("/upload", upload.single("file"), uploadDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
