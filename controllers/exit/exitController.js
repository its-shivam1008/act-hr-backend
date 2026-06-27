const {
  Resignation,
  NoticePeriod,
  ExitClearance,
  ExitInterview,
  FnFSettlement,
  RelievingLetter,
  AssetClearance,
  RESIGNATION_SEED,
  NOTICE_PERIOD_SEED,
  EXIT_CLEARANCE_SEED,
  EXIT_INTERVIEW_SEED,
  FNF_SETTLEMENT_SEED,
  RELIEVING_LETTER_SEED,
  ASSET_CLEARANCE_SEED,
} = require("../../models/exit/ExitModels");
const { buildListController } = require("../moduleCrudController");

module.exports = {
  resignations: buildListController(Resignation, RESIGNATION_SEED),
  noticePeriods: buildListController(NoticePeriod, NOTICE_PERIOD_SEED),
  clearances: buildListController(ExitClearance, EXIT_CLEARANCE_SEED),
  interviews: buildListController(ExitInterview, EXIT_INTERVIEW_SEED),
  fnfSettlements: buildListController(FnFSettlement, FNF_SETTLEMENT_SEED),
  relievingLetters: buildListController(RelievingLetter, RELIEVING_LETTER_SEED),
  assetClearances: buildListController(AssetClearance, ASSET_CLEARANCE_SEED),
};
