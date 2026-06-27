const ORG_ID = "default";

const buildListController = (Model, seed = []) => {
  const ensureSeeded = async () => {
    const count = await Model.countDocuments({ organisationId: ORG_ID });
    if (count > 0 || seed.length === 0) return;

    await Model.insertMany(seed.map((item) => ({ ...item, organisationId: ORG_ID })));
  };

  const parseIdQuery = (id) => {
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) return { _id: id, organisationId: ORG_ID };
    const numeric = Number(id);
    return { id: Number.isNaN(numeric) ? id : numeric, organisationId: ORG_ID };
  };

  const getAll = async (req, res) => {
    try {
      await ensureSeeded();
      const items = await Model.find({ organisationId: ORG_ID }).sort({ createdAt: -1, id: -1 }).lean();
      res.status(200).json({ success: true, count: items.length, data: items });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  const create = async (req, res) => {
    try {
      const max = await Model.findOne({ organisationId: ORG_ID, id: { $type: "number" } }).sort({ id: -1 }).lean();
      const item = await Model.create({
        ...req.body,
        organisationId: ORG_ID,
        id: req.body.id ?? ((max?.id || 0) + 1),
      });
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  const update = async (req, res) => {
    try {
      const item = await Model.findOneAndUpdate(parseIdQuery(req.params.id), req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ success: false, message: "Record not found" });
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  const remove = async (req, res) => {
    try {
      const item = await Model.findOneAndDelete(parseIdQuery(req.params.id));
      if (!item) return res.status(404).json({ success: false, message: "Record not found" });
      res.status(200).json({ success: true, message: "Record deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  return { getAll, create, update, remove };
};

const buildDatasetController = (Model, type, defaultData = {}) => {
  const get = async (req, res) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { organisationId: ORG_ID, type },
        { $setOnInsert: { data: defaultData } },
        { upsert: true, new: true }
      ).lean();
      res.status(200).json({ success: true, data: doc.data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  const update = async (req, res) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { organisationId: ORG_ID, type },
        { data: req.body },
        { upsert: true, new: true }
      ).lean();
      res.status(200).json({ success: true, data: doc.data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  return { get, update };
};

module.exports = { buildListController, buildDatasetController };
