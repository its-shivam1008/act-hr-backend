const Document = require("../models/documentModels/Document");
const { uploadBuffer } = require("../utils/cloudinary");

const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/documents ───────────────────────────────────────────────────────
exports.getDocuments = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (category && category !== "all") {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { owner: { $regex: search, $options: "i" } },
      ];
    }

    const docs = await Document.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/documents/upload ───────────────────────────────────────────────
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a file" });
    }

    const { category, owner } = req.body;
    const originalName = req.file.originalname;

    // Upload file buffer to Cloudinary
    const result = await uploadBuffer(req.file.buffer, "org-docs", originalName);

    // Format size for display (e.g. 1.2 MB)
    const bytes = req.file.size;
    let sizeStr = "0 Bytes";
    if (bytes > 0) {
      const k = 1024;
      const dm = 1;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      sizeStr = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    // Determine type from file extension/mimetype
    let type = "pdf";
    const mime = req.file.mimetype;
    if (mime.includes("image")) {
      type = "image";
    } else if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv") || originalName.endsWith(".xlsx") || originalName.endsWith(".xls")) {
      type = "sheet";
    }

    const doc = await Document.create({
      organisationId: getOrgId(req),
      name: originalName,
      url: result.secure_url,
      category: category || "all",
      owner: owner || "All Employees",
      size: sizeStr,
      type: type,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/documents/:id ────────────────────────────────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
