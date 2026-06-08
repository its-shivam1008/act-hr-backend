const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Protect: verifies the Bearer JWT and attaches req.user.
 */
exports.protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized – no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: "Not authorized – invalid or expired token",
    });
  }
};

/**
 * Authorize: restrict to specific roles.
 * Usage: router.get('/admin', protect, authorize('admin'), handler)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized role access: user ${req.user.email} (${req.user.role}) tried to access route requiring [${roles.join(", ")}]`);
      return res.status(403).json({
        success: false,
        message: `Access denied – requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};
