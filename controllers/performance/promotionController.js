const Promotion = require('../../models/performanceModels/Promotion');

exports.createPromotion = async (req, res) => {
  try {
    const promo = new Promotion(req.body);
    await promo.save();
    res.status(201).json(promo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getPromotions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const promotions = await Promotion.find(filter).populate('cycleId');
    res.status(200).json(promotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approvePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
    if (!promo) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({
      message: 'Promotion approved successfully.',
      data: promo
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
