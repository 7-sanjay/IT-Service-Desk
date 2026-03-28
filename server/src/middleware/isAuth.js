const jwt = require("jsonwebtoken");
const isManager = (level) => level === "manager" || level === "head";
const isSupportEngineer = (level) =>
  level === "support_engineer" || level === "team";

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
    next();
  });
};
