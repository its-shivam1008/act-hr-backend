/**
 * Generic CRUD factory for org-scoped, list-based resources.
 *
 * Each resource model is expected to have:
 *   - organisationId  (String, indexed)
 *   - id              (Number, unique per org)  — auto assigned as max+1
 *   - any other fields (schema uses strict:false for flexibility)
 *
 * On the very first GET (when collection is empty for the org) the factory
 * seeds it with `seedData` so the UI always has data to show.
 */
const SEED_LOCK = {};

const nextNumericId = (items) => {
  if (!items || items.length === 0) return 1;
  return items.reduce((max, it) => Math.max(max, Number(it.id) || 0), 0) + 1;
};

const buildCrud = (Model, seedData = []) => ({
  // GET /  -> { success, total, items }
  getAll: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      let items = await Model.find({ organisationId: orgId }).sort({ id: 1 }).lean();

      // Auto-seed demo data the first time
      if (items.length === 0 && seedData.length > 0) {
        const lockKey = `${Model.modelName}:${orgId}`;
        if (!SEED_LOCK[lockKey]) {
          SEED_LOCK[lockKey] = true;
          try {
            const toInsert = seedData.map((d) => ({ ...d, organisationId: orgId }));
            await Model.insertMany(toInsert, { ordered: false });
            items = await Model.find({ organisationId: orgId }).sort({ id: 1 }).lean();
          } catch (e) {
            // ignore duplicate-key races during seed
            items = await Model.find({ organisationId: orgId }).sort({ id: 1 }).lean();
          }
        }
      }

      return res.json({ success: true, total: items.length, items });
    } catch (err) {
      console.error(`[getAll:${Model.modelName}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /:id
  getOne: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      const item = await Model.findOne({ id: Number(req.params.id), organisationId: orgId }).lean();
      if (!item) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, item });
    } catch (err) {
      console.error(`[getOne:${Model.modelName}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /
  create: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      const existing = await Model.find({ organisationId: orgId }).lean();
      const id = nextNumericId(existing);
      const doc = await Model.create({ ...req.body, id, organisationId: orgId });
      return res.status(201).json({ success: true, item: doc.toObject() });
    } catch (err) {
      console.error(`[create:${Model.modelName}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /:id
  update: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      const doc = await Model.findOneAndUpdate(
        { id: Number(req.params.id), organisationId: orgId },
        { $set: req.body },
        { new: true, runValidators: false }
      ).lean();
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, item: doc });
    } catch (err) {
      console.error(`[update:${Model.modelName}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /:id
  remove: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      const doc = await Model.findOneAndDelete({ id: Number(req.params.id), organisationId: orgId });
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, message: "Deleted" });
    } catch (err) {
      console.error(`[delete:${Model.modelName}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
});

/**
 * Dataset handler for read-mostly aggregate pages (effectiveness, skill-gap).
 * Stores a single document per org (keyed by `type`) and seeds it on first read.
 * GET    -> { success, data }
 * PUT    -> { success, data }   (replace whole dataset)
 */
const buildDataset = (Model, type, defaultData) => ({
  get: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      let doc = await Model.findOne({ organisationId: orgId, type }).lean();
      if (!doc) {
        doc = await Model.create({ organisationId: orgId, type, data: defaultData });
        doc = doc.toObject();
      }
      return res.json({ success: true, data: doc.data });
    } catch (err) {
      console.error(`[getDataset:${type}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  update: async (req, res) => {
    try {
      const orgId = req.user.organisationId;
      const doc = await Model.findOneAndUpdate(
        { organisationId: orgId, type },
        { $set: { data: req.body.data || req.body } },
        { new: true, upsert: true }
      ).lean();
      return res.json({ success: true, data: doc.data });
    } catch (err) {
      console.error(`[updateDataset:${type}]`, err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
});

module.exports = { buildCrud, buildDataset };
