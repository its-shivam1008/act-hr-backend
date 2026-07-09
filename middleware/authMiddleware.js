const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const Employee = require("../models/Employee");

// Protect: verifies Bearer JWT and attaches req.user
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized – no token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "Token is valid but user no longer exists" });
    }
    if (user.inviteStatus === "pending") {
      return res.status(403).json({ success: false, message: "Please accept your invitation before logging in." });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized – invalid or expired token" });
  }
};

// Authorize: restrict to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied – requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

// Protect employee portal routes
exports.employeeProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Not authorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "employee")
      return res.status(403).json({ success: false, message: "Employee token required" });
    const emp = await Employee.findById(decoded.id);
    if (!emp) return res.status(401).json({ success: false, message: "Employee not found" });
    req.employee = emp;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Combined middleware for routes accessible by both Admins and Employees
exports.combinedAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Not authorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === "employee") {
      const emp = await Employee.findById(decoded.id);
      if (!emp) return res.status(401).json({ success: false, message: "Employee not found" });
      req.user = emp; // Alias as req.user for shared controllers
      next();
    } else {
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User not found or inactive" });
      req.user = user;
      next();
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
