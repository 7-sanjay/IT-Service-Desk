const jwt = require("jsonwebtoken");
const isManager = (level) => level === "manager" || level === "head";
const isSupportEngineer = (level) =>
  level === "support_engineer" || level === "team";

const isChangePasswordRequest = (req) =>
  req.method === "PUT" &&
  req.originalUrl.split("?")[0].replace(/\/+$/, "").endsWith("/user/me/password");

const rejectIfMustChangePassword = (req, res, decoded) => {
  if (!decoded.mustChangePassword || isChangePasswordRequest(req)) {
    return true;
  }
  res.status(403).json({
    status: "failed",
    message: "You must change your password before continuing.",
    code: "MUST_CHANGE_PASSWORD",
  });
  return false;
};

exports.isAdmin = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. Please sign in first.",
      });
    } else if (decoded.level !== "admin" && !isManager(decoded.level)) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. only admin can access this resource",
      });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};

exports.isTeam = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. Please sign in first.",
      });
    } else if (!isSupportEngineer(decoded.level)) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. only support engineer can access this resource",
      });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};

exports.isAuth = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. Please sign in first.",
      });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};

exports.isTeamHeadAdmin = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. Please sign in first.",
      });
    } else if (
      decoded.level !== "admin" &&
      !isManager(decoded.level) &&
      !isSupportEngineer(decoded.level)
    ) {
      return res.status(401).json({
        status: "failed",
        message:
          "Unauthorized. Only support engineer, manager, and admin can access this resource",
      });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};

exports.isStrictAdmin = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized. Please sign in first." });
    }
    if (decoded.level !== "admin") {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized. Only admin can access this resource" });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};

exports.isManagerOrAdmin = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized. Please sign in first." });
    }
    if (decoded.level !== "admin" && !isManager(decoded.level)) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized. Only manager and admin can access this resource",
      });
    }
    req.decoded = decoded;
    if (!rejectIfMustChangePassword(req, res, decoded)) return;
    next();
  });
};
