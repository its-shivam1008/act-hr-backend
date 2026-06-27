const mongoose = require("mongoose");

/**
 * Flexible, org-scoped list model. `strict:false` lets the frontend store
 * whatever fields it needs without schema churn.
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

const Program = flexSchema("TrainingProgram");
const CalendarSession = flexSchema("TrainingCalendarSession");
const AttendanceSession = flexSchema("TrainingAttendanceSession");
const Participant = flexSchema("TrainingParticipant");
const Certification = flexSchema("TrainingCertification");
const SafetyModule = flexSchema("TrainingSafetyModule");
const SafetyRisk = flexSchema("TrainingSafetyRisk");
const Incident = flexSchema("TrainingIncident");

// Dataset (single-doc) model for read-mostly aggregate pages

// ── Seed data (mirrors frontend mock so UI is populated immediately) ────────
const PROGRAM_SEED = [
  { id: 1, title: "POSH Awareness", category: "Compliance", duration: "2 Hours", mode: "Online", trainer: "Legal Dept", rating: 4.8, enrolled: 1250, image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80", mandatory: true, description: "Prevention of Sexual Harassment (POSH) training covers legal frameworks, employee rights, and redressal mechanisms to ensure a safe workplace.", syllabus: ["Introduction to POSH Act", "Defining Sexual Harassment", "Internal Complaints Committee (ICC)", "Redressal Mechanism"] },
  { id: 2, title: "Advanced React Patterns", category: "Technical", duration: "3 Days", mode: "Classroom", trainer: "External (Udemy)", rating: 4.5, enrolled: 45, image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80", mandatory: false, description: "Deep dive into React hooks, context, performance optimization, and scalable architecture patterns for senior developers.", syllabus: ["Hooks in Depth", "Context API & State Management", "Performance Optimization", "Design Systems with React"] },
  { id: 3, title: "First Time Manager", category: "Leadership", duration: "1 Week", mode: "Classroom", trainer: "HR L&D", rating: 4.9, enrolled: 12, image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80", mandatory: false, description: "Essential skills for new managers including delegation, feedback, conflict resolution, and team motivation.", syllabus: ["Transitioning to Leadership", "Effective Delegation", "Giving & Receiving Feedback", "Conflict Resolution"] },
  { id: 4, title: "Fire Safety & Evacuation", category: "Safety", duration: "4 Hours", mode: "Classroom", trainer: "Admin Dept", rating: 4.2, enrolled: 300, image: "https://images.unsplash.com/photo-1599256621730-535171e28e50?auto=format&fit=crop&w=800&q=80", mandatory: true, description: "Standard operating procedures for fire emergencies, including extinguisher usage and evacuation routes.", syllabus: ["Fire Triangle & Classes", "Extinguisher Types & Usage", "Evacuation Protocols", "Emergency Contacts"] },
  { id: 5, title: "Effective Communication", category: "Soft Skills", duration: "1 Day", mode: "Hybrid", trainer: "External", rating: 4.6, enrolled: 85, image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80", mandatory: false, description: "Enhance your verbal and non-verbal communication skills to build better relationships and influence stakeholders.", syllabus: ["Active Listening", "Verbal vs Non-Verbal", "Email Etiquette", "Presentation Skills"] },
];

const CALENDAR_SEED = [
  { id: 1, program: "Effective Communication", batch: "Batch 12", date: "2023-10-25", time: "10:00 - 16:00", trainer: "John Maxwell", location: "Conference Room A", capacity: 20, enrolled: 18, status: "Scheduled", type: "Classroom" },
  { id: 2, program: "Fire Safety Drill", batch: "Safety Q3", date: "2023-10-26", time: "15:00 - 17:00", trainer: "Safety Officer", location: "Assembly Point B", capacity: 50, enrolled: 45, status: "Scheduled", type: "Classroom" },
  { id: 3, program: "React Advanced", batch: "Dev Team Alpha", date: "2023-10-20", time: "09:00 - 17:00", trainer: "Tech Lead", location: "Training Room 1", capacity: 15, enrolled: 15, status: "Completed", type: "Classroom" },
  { id: 4, program: "POSH Awareness", batch: "New Joiners Oct", date: "2023-10-28", time: "11:00 - 13:00", trainer: "Legal Team", location: "Zoom Meeting", capacity: 100, enrolled: 85, status: "Scheduled", type: "Online" },
  { id: 5, program: "Leadership 101", batch: "Managers", date: "2023-10-05", time: "10:00 - 13:00", trainer: "External", location: "Conference Room B", capacity: 20, enrolled: 20, status: "Completed", type: "Classroom" },
];

const ATT_SESSION_SEED = [
  { id: 1, name: "React Advanced Patterns - Batch A", date: "Oct 25, 2023", time: "10:00 AM - 04:00 PM", trainer: "John Maxwell", enrolled: 15 },
  { id: 2, name: "POSH Awareness - Q3", date: "Oct 26, 2023", time: "02:00 PM - 04:00 PM", trainer: "Legal Team", enrolled: 45 },
  { id: 3, name: "Leadership 101 - Managers", date: "Oct 28, 2023", time: "09:00 AM - 05:00 PM", trainer: "External", enrolled: 12 },
];

const PARTICIPANT_SEED = [
  { id: 101, sessionId: 1, name: "Alice Johnson", empId: "NX001", dept: "Engineering", status: "Present", score: 85, feedback: "Submitted" },
  { id: 102, sessionId: 1, name: "Bob Smith", empId: "NX002", dept: "Product", status: "Present", score: 92, feedback: "Pending" },
  { id: 103, sessionId: 1, name: "Charlie Brown", empId: "NX003", dept: "Engineering", status: "Absent", score: 0, feedback: "-" },
  { id: 104, sessionId: 1, name: "Diana Prince", empId: "NX004", dept: "Design", status: "Present", score: 78, feedback: "Submitted" },
  { id: 105, sessionId: 1, name: "Ethan Hunt", empId: "NX005", dept: "Sales", status: "Excused", score: 0, feedback: "-" },
  { id: 106, sessionId: 1, name: "Fiona Gallagher", empId: "NX006", dept: "HR", status: "Present", score: 88, feedback: "Submitted" },
  { id: 107, sessionId: 1, name: "George Martin", empId: "NX007", dept: "Marketing", status: "Present", score: 75, feedback: "Pending" },
  { id: 108, sessionId: 1, name: "Hannah Lee", empId: "NX008", dept: "Engineering", status: "Absent", score: 0, feedback: "-" },
];

const DatasetSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
DatasetSchema.index({ organisationId: 1, type: 1 }, { unique: true });
const Dataset = mongoose.model("TrainingDataset", DatasetSchema);

const CERT_SEED = [
  { id: "CRT-2023-001", employee: "Alice Johnson", course: "React Advanced Patterns", date: "Oct 25, 2023", grade: "A+", status: "Issued", template: "Technical Standard", avatar: "https://picsum.photos/seed/alice/40/40" },
  { id: "CRT-2023-002", employee: "Bob Smith", course: "Product Strategy 101", date: "Oct 20, 2023", grade: "A", status: "Issued", template: "Leadership Gold", avatar: "https://picsum.photos/seed/bob/40/40" },
  { id: "CRT-2023-003", employee: "Charlie Brown", course: "Fire Safety Drill", date: "Oct 15, 2023", grade: "Pass", status: "Pending Signature", template: "Safety Compliance", avatar: "https://picsum.photos/seed/charlie/40/40" },
  { id: "CRT-2023-004", employee: "Diana Prince", course: "POSH Awareness", date: "Oct 10, 2023", grade: "Pass", status: "Issued", template: "HR Standard", avatar: "https://picsum.photos/seed/diana/40/40" },
  { id: "CRT-2023-005", employee: "Ethan Hunt", course: "Advanced Negotiation", date: "Oct 05, 2023", grade: "B+", status: "Draft", template: "Leadership Gold", avatar: "https://picsum.photos/seed/ethan/40/40" },
];

const SAFETY_MODULE_SEED = [
  { id: 1, name: "Fire Safety & Evacuation", type: "Drill", frequency: "Quarterly", lastRun: "Oct 10, 2023", nextDue: "Jan 10, 2024", coverage: 92, totalEmp: 450, trained: 414, status: "Compliant" },
  { id: 2, name: "First Aid Basics", type: "Workshop", frequency: "Annual", lastRun: "Jan 15, 2023", nextDue: "Jan 15, 2024", coverage: 75, totalEmp: 450, trained: 337, status: "Due Soon" },
  { id: 3, name: "Workplace Ergonomics", type: "E-Learning", frequency: "One-time", lastRun: "-", nextDue: "-", coverage: 98, totalEmp: 450, trained: 441, status: "Compliant" },
  { id: 4, name: "Chemical Handling (HazMat)", type: "Certification", frequency: "Bi-annual", lastRun: "Jun 20, 2023", nextDue: "Dec 20, 2023", coverage: 100, totalEmp: 45, trained: 45, status: "Compliant" },
];

const SAFETY_RISK_SEED = [
  { id: 1, employee: "John Doe", dept: "Operations", module: "Fire Safety", status: "Expired", dueDate: "Oct 01, 2023", avatar: "https://picsum.photos/seed/john/40/40" },
  { id: 2, employee: "Jane Smith", dept: "Lab", module: "HazMat", status: "Expired", dueDate: "Sep 15, 2023", avatar: "https://picsum.photos/seed/jane/40/40" },
  { id: 3, employee: "Mike Ross", dept: "Sales", module: "First Aid", status: "Due in 5 Days", dueDate: "Oct 30, 2023", avatar: "https://picsum.photos/seed/mike/40/40" },
  { id: 4, employee: "Rachel Zane", dept: "Legal", module: "Fire Safety", status: "Not Started", dueDate: "Oct 25, 2023", avatar: "https://picsum.photos/seed/rachel/40/40" },
];

const INCIDENT_SEED = [
  { id: 1, month: "May", count: 0 },
  { id: 2, month: "Jun", count: 1 },
  { id: 3, month: "Jul", count: 0 },
  { id: 4, month: "Aug", count: 2 },
  { id: 5, month: "Sep", count: 0 },
  { id: 6, month: "Oct", count: 0 },
];

const EFFECTIVENESS_DEFAULT = {
  kpiStats: [
    { title: "Avg Feedback", value: "4.6/5", subtext: "Level 1: Reaction", color: "bg-amber-500" },
    { title: "Knowledge Gain", value: "+28%", subtext: "Level 2: Learning", color: "bg-blue-500" },
    { title: "Manager Rating", value: "4.2/5", subtext: "Level 3: Behavior", color: "bg-indigo-500" },
    { title: "Est. ROI", value: "185%", subtext: "Level 4: Results", color: "bg-emerald-500" },
  ],
  prePostData: [
    { name: "React Advanced", pre: 45, post: 85 },
    { name: "Leadership 101", pre: 60, post: 75 },
    { name: "Comm. Skills", pre: 50, post: 80 },
    { name: "Safety Drill", pre: 40, post: 95 },
    { name: "POSH", pre: 30, post: 90 },
  ],
  feedbackBreakdown: [
    { category: "Trainer Quality", score: 4.8, fullMark: 5 },
    { category: "Content Relevance", score: 4.5, fullMark: 5 },
    { category: "Platform/Venue", score: 4.2, fullMark: 5 },
    { category: "Pacing", score: 4.0, fullMark: 5 },
    { category: "Practical Examples", score: 4.6, fullMark: 5 },
  ],
  programRoi: [
    { id: 1, program: "Sales Negotiation Masterclass", cost: 15000, participants: 20, metric: "Sales Conversion", improvement: "+12%", valueAdd: 45000, roi: "200%", status: "High Impact" },
    { id: 2, program: "Advanced React Patterns", cost: 5000, participants: 10, metric: "Bug Rate Reduction", improvement: "-25%", valueAdd: 12000, roi: "140%", status: "High Impact" },
    { id: 3, program: "Time Management", cost: 2000, participants: 50, metric: "Productivity", improvement: "+5%", valueAdd: 3000, roi: "50%", status: "Moderate" },
    { id: 4, program: "Diversity & Inclusion", cost: 8000, participants: 100, metric: "NPS / Culture", improvement: "+8%", valueAdd: "Intangible", roi: "N/A", status: "Strategic" },
  ],
  performanceTrend: [
    { month: "Month 1", trained: 65, untrained: 60 },
    { month: "Month 2", trained: 72, untrained: 62 },
    { month: "Month 3", trained: 85, untrained: 63 },
    { month: "Month 4", trained: 88, untrained: 64 },
    { month: "Month 5", trained: 86, untrained: 65 },
    { month: "Month 6", trained: 89, untrained: 65 },
  ],
};

const SKILLGAP_DEFAULT = {
  employees: [
    { id: 1, name: "Alice Johnson", role: "Senior Engineer", dept: "Engineering", avatar: "https://picsum.photos/seed/alice/40/40" },
    { id: 2, name: "Bob Smith", role: "Product Manager", dept: "Product", avatar: "https://picsum.photos/seed/bob/40/40" },
    { id: 3, name: "Charlie Brown", role: "DevOps Engineer", dept: "Engineering", avatar: "https://picsum.photos/seed/charlie/40/40" },
    { id: 4, name: "Diana Prince", role: "QA Lead", dept: "Engineering", avatar: "https://picsum.photos/seed/diana/40/40" },
    { id: 5, name: "Ethan Hunt", role: "Sales Director", dept: "Sales", avatar: "https://picsum.photos/seed/ethan/40/40" },
    { id: 6, name: "Fiona Gallagher", role: "HR Specialist", dept: "HR", avatar: "https://picsum.photos/seed/fiona/40/40" },
  ],
  skillsData: {
    1: [
      { skill: "React", current: 4.5, target: 4.0 },
      { skill: "Node.js", current: 3.5, target: 4.0 },
      { skill: "System Design", current: 2.5, target: 4.5 },
      { skill: "Leadership", current: 3.5, target: 3.0 },
      { skill: "Communication", current: 4.0, target: 4.0 },
      { skill: "Cloud (AWS)", current: 3.0, target: 4.0 },
    ],
    2: [
      { skill: "Product Strategy", current: 4.0, target: 4.5 },
      { skill: "Agile", current: 4.8, target: 4.0 },
      { skill: "Data Analysis", current: 2.0, target: 4.0 },
      { skill: "Leadership", current: 4.0, target: 4.0 },
      { skill: "Communication", current: 4.5, target: 4.5 },
      { skill: "UX Design", current: 3.5, target: 3.0 },
    ],
    3: [
      { skill: "Kubernetes", current: 4.2, target: 4.0 },
      { skill: "CI/CD", current: 4.5, target: 4.0 },
      { skill: "Python", current: 3.0, target: 3.5 },
      { skill: "Security", current: 3.5, target: 4.5 },
      { skill: "Cloud (AWS)", current: 4.5, target: 4.0 },
      { skill: "Communication", current: 2.5, target: 3.5 },
    ],
  },
  recommendations: [
    { id: 1, skill: "System Design", course: "Advanced System Architecture", provider: "Udemy", duration: "12h", type: "Technical" },
    { id: 2, skill: "Data Analysis", course: "Data Science for PMs", provider: "Coursera", duration: "20h", type: "Technical" },
    { id: 3, skill: "Node.js", course: "Node.js: The Complete Guide", provider: "Internal L&D", duration: "8h", type: "Technical" },
    { id: 4, skill: "Security", course: "DevSecOps Fundamentals", provider: "Pluralsight", duration: "15h", type: "Technical" },
    { id: 5, skill: "Communication", course: "Effective Business Comm.", provider: "Internal L&D", duration: "4h", type: "Soft Skills" },
    { id: 6, skill: "Cloud (AWS)", course: "AWS Solutions Architect", provider: "Amazon", duration: "30h", type: "Technical" },
  ],
};

module.exports = {
  Program, CalendarSession, AttendanceSession, Participant, Certification,
  SafetyModule, SafetyRisk, Incident, Dataset,
  PROGRAM_SEED, CALENDAR_SEED, ATT_SESSION_SEED, PARTICIPANT_SEED, CERT_SEED,
  SAFETY_MODULE_SEED, SAFETY_RISK_SEED, INCIDENT_SEED,
  EFFECTIVENESS_DEFAULT, SKILLGAP_DEFAULT,
};

