const mongoose = require("mongoose");

/**
 * Flexible, org-scoped list model for Exit & F&F resources.
 */
const flexSchema = (name) => {
  const schema = new mongoose.Schema(
    {
      organisationId: { type: String, required: true, index: true },
      id: { type: mongoose.Schema.Types.Mixed, index: true },
    },
    { strict: false, timestamps: true }
  );
  schema.index({ organisationId: 1, id: 1 }, { unique: true });
  return mongoose.model(name, schema);
};

const Resignation = flexSchema("ExitResignation");
const NoticePeriod = flexSchema("ExitNoticePeriod");
const ExitClearance = flexSchema("ExitClearance");
const ExitInterview = flexSchema("ExitInterview");
const FnFSettlement = flexSchema("ExitFnFSettlement");
const RelievingLetter = flexSchema("ExitRelievingLetter");
const AssetClearance = flexSchema("ExitAssetClearance");

const RESIGNATION_SEED = [
  { id: 1, employee: "Sarah Jenkins", role: "Senior Designer", dept: "Design", resignationDate: "2023-10-15", lwd: "2023-12-15", noticePeriod: "60 Days", reason: "Better Opportunity", status: "Pending Approval", interviewStatus: "Pending", avatar: "https://picsum.photos/seed/sarah/40/40", isRegrettable: true },
  { id: 2, employee: "Mike Ross", role: "Sales Executive", dept: "Sales", resignationDate: "2023-10-10", lwd: "2023-11-10", noticePeriod: "30 Days", reason: "Personal Reasons", status: "Approved", interviewStatus: "Scheduled", avatar: "https://picsum.photos/seed/mike/40/40", isRegrettable: false },
  { id: 3, employee: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", resignationDate: "2023-09-25", lwd: "2023-10-25", noticePeriod: "30 Days", reason: "Relocation", status: "Serving Notice", interviewStatus: "Completed", avatar: "https://picsum.photos/seed/jessica/40/40", isRegrettable: true },
  { id: 4, employee: "David Kim", role: "Backend Dev", dept: "Engineering", resignationDate: "2023-10-01", lwd: "2023-11-30", noticePeriod: "60 Days", reason: "Higher Studies", status: "Withdrawn", interviewStatus: "N/A", avatar: "https://picsum.photos/seed/david/40/40", isRegrettable: false },
];

const NOTICE_PERIOD_SEED = [
  { id: 1, employee: "Sarah Jenkins", role: "Senior Designer", dept: "Design", manager: "Emily Carter", noticeStart: "2023-10-15", lwd: "2023-12-15", daysServed: 12, daysRemaining: 48, status: "Serving", handover: 35, avatar: "https://picsum.photos/seed/sarah/40/40" },
  { id: 2, employee: "Mike Ross", role: "Sales Executive", dept: "Sales", manager: "Harvey Specter", noticeStart: "2023-10-10", lwd: "2023-11-10", daysServed: 17, daysRemaining: 13, status: "Buyout Requested", handover: 60, avatar: "https://picsum.photos/seed/mike/40/40" },
  { id: 3, employee: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", manager: "Louis Litt", noticeStart: "2023-09-25", lwd: "2023-10-25", daysServed: 30, daysRemaining: 0, status: "Completed", handover: 100, avatar: "https://picsum.photos/seed/jessica/40/40" },
];

const EXIT_CLEARANCE_SEED = [
  { id: 1, employee: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", lwd: "Oct 25, 2023", status: "In Progress", progress: 75, avatar: "https://picsum.photos/seed/jessica/40/40", clearances: [
    { id: "c1", dept: "IT", status: "Approved", items: "Laptop, Mouse returned", approver: "IT Admin", date: "Oct 20" },
    { id: "c2", dept: "Finance", status: "Pending", items: "Travel advances settlement", approver: "-", date: "-" },
    { id: "c3", dept: "Admin", status: "Approved", items: "ID Card, Access Key", approver: "Facility Mgr", date: "Oct 21" },
    { id: "c4", dept: "HR", status: "Pending", items: "Exit Interview", approver: "-", date: "-" },
  ] },
  { id: 2, employee: "Mike Ross", role: "Sales Executive", dept: "Sales", lwd: "Nov 09, 2023", status: "Started", progress: 25, avatar: "https://picsum.photos/seed/mike/40/40", clearances: [
    { id: "c5", dept: "IT", status: "Pending", items: "iPad, Mobile", approver: "-", date: "-" },
    { id: "c6", dept: "Finance", status: "Pending", items: "Commission payout", approver: "-", date: "-" },
    { id: "c7", dept: "Admin", status: "Pending", items: "ID Card", approver: "-", date: "-" },
    { id: "c8", dept: "HR", status: "Pending", items: "-", approver: "-", date: "-" },
  ] },
];

const EXIT_INTERVIEW_SEED = [
  { id: 1, employee: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", date: "2023-10-24", time: "11:00 AM", interviewer: "HR Manager", status: "Completed", feedbackScore: 4.2, reason: "Better Opportunity", avatar: "https://picsum.photos/seed/jessica/40/40" },
  { id: 2, employee: "Mike Ross", role: "Sales Executive", dept: "Sales", date: "2023-11-08", time: "03:00 PM", interviewer: "HR Manager", status: "Scheduled", feedbackScore: null, reason: "Personal Reasons", avatar: "https://picsum.photos/seed/mike/40/40" },
];

const FNF_SETTLEMENT_SEED = [
  { id: 1, name: "Jessica Pearson", role: "Legal Advisor", lwd: "Oct 25, 2023", status: "Draft", earnings: { basic: 45000, hra: 22000, special: 15000, bonus: 5000, leaveEncash: 12000 }, deductions: { pf: 5400, tax: 2500, noticeRecovery: 0, assetDamage: 0, loan: 0 }, netPayable: 91100, avatar: "https://picsum.photos/seed/jessica/40/40" },
  { id: 2, name: "Mike Ross", role: "Sales Executive", lwd: "Nov 09, 2023", status: "Pending Approval", earnings: { basic: 35000, hra: 17000, special: 10000, bonus: 0, leaveEncash: 4500 }, deductions: { pf: 4200, tax: 1800, noticeRecovery: 15000, assetDamage: 150, loan: 0 }, netPayable: 45350, avatar: "https://picsum.photos/seed/mike/40/40" },
  { id: 3, name: "Sarah Jenkins", role: "Sr. Designer", lwd: "Dec 15, 2023", status: "Settled", earnings: { basic: 50000, hra: 25000, special: 20000, bonus: 10000, leaveEncash: 8000 }, deductions: { pf: 6000, tax: 4500, noticeRecovery: 0, assetDamage: 0, loan: 20000 }, netPayable: 82500, avatar: "https://picsum.photos/seed/sarah/40/40" },
];

const RELIEVING_LETTER_SEED = [
  { id: 1, name: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", lwd: "Oct 25, 2023", joiningDate: "Jan 12, 2020", status: "Ready", avatar: "https://picsum.photos/seed/jessica/40/40" },
  { id: 2, name: "Mike Ross", role: "Sales Executive", dept: "Sales", lwd: "Nov 09, 2023", joiningDate: "Mar 01, 2021", status: "Pending Clearance", avatar: "https://picsum.photos/seed/mike/40/40" },
  { id: 3, name: "Sarah Jenkins", role: "Sr. Designer", dept: "Design", lwd: "Dec 15, 2023", joiningDate: "Jul 18, 2019", status: "Issued", avatar: "https://picsum.photos/seed/sarah/40/40" },
];

const ASSET_CLEARANCE_SEED = [
  { id: 1, employee: "Jessica Pearson", role: "Legal Advisor", dept: "Legal", lwd: "Oct 25, 2023", avatar: "https://picsum.photos/seed/jessica/40/40", assets: [
    { id: "A001", name: "MacBook Pro 16", type: "Laptop", serial: "MBP-2023-889", issued: "Jan 15, 2022", status: "Returned", condition: "Good", recoveryCost: 0 },
    { id: "A002", name: "iPhone 13", type: "Mobile", serial: "IP13-445", issued: "Feb 01, 2022", status: "Pending", condition: "-", recoveryCost: 0 },
  ] },
  { id: 2, employee: "Mike Ross", role: "Sales Executive", dept: "Sales", lwd: "Nov 09, 2023", avatar: "https://picsum.photos/seed/mike/40/40", assets: [
    { id: "A003", name: "Dell Latitude", type: "Laptop", serial: "DL-2241", issued: "Mar 10, 2021", status: "Damaged", condition: "Screen crack", recoveryCost: 3500 },
    { id: "A004", name: "Access Card", type: "ID", serial: "AC-882", issued: "Mar 10, 2021", status: "Pending", condition: "-", recoveryCost: 0 },
  ] },
];

module.exports = {
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
};
