const jwt  = require("jsonwebtoken");
const User = require("../models/User");

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
