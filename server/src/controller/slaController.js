const { ObjectId } = require("mongodb");
const { getDb } = require("../../config/mongo");

const ALLOWED_PRIORITIES = ["Low", "Medium", "High"];

const normalizePriority = (priority) => {
  if (!priority) return "";
  const p = String(priority).trim().toLowerCase();
  if (p === "low") return "Low";
  if (p === "medium") return "Medium";
  if (p === "high" || p === "critical") return "High";
  return "";
};

const parsePositiveInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const createSlaRule = async (req, res) => {
  const priority = normalizePriority(req.body.priority);
  const responseTime = parsePositiveInt(req.body.responseTime);
  const resolutionTime = parsePositiveInt(req.body.resolutionTime);

  if (!ALLOWED_PRIORITIES.includes(priority) || !responseTime || !resolutionTime) {
    return res.status(400).json({
      status: "failed",
      message:
        "Invalid payload. priority must be Low|Medium|High and responseTime/resolutionTime must be > 0 minutes.",
    });
  }

  try {
    const db = getDb();
    const slaCollection = db.collection("SLA");
    const now = new Date();

    const existing = await slaCollection.findOne({ priority });
    if (existing) {
      return res.status(409).json({
        status: "failed",
        message: `SLA rule for priority '${priority}' already exists. Use update instead.`,
      });
    }

    const payload = { priority, responseTime, resolutionTime, createdAt: now, updatedAt: now };
    const result = await slaCollection.insertOne(payload);
    return res.status(201).json({
      status: "success",
      message: "SLA rule created successfully.",
      data: { _id: result.insertedId, ...payload },
    });
  } catch (err) {
    console.error("createSlaRule error:", err.message);
    return res.status(500).json({ status: "failed", message: "Something went wrong!" });
  }
};

const getAllSlaRules = async (req, res) => {
  try {
    const db = getDb();
    const slaCollection = db.collection("SLA");
    const rules = await slaCollection.find({}).sort({ priority: 1 }).toArray();
    return res.status(200).json({ status: "success", data: rules });
  } catch (err) {
    console.error("getAllSlaRules error:", err.message);
    return res.status(500).json({ status: "failed", message: "Something went wrong!" });
  }
};

const updateSlaRule = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid SLA id" });
  }
  const update = { updatedAt: new Date() };
  if (req.body.priority !== undefined) {
    const p = normalizePriority(req.body.priority);
    if (!ALLOWED_PRIORITIES.includes(p)) {
      return res.status(400).json({ status: "failed", message: "Invalid priority." });
    }
    update.priority = p;
  }
  if (req.body.responseTime !== undefined) {
    const rt = parsePositiveInt(req.body.responseTime);
    if (!rt) return res.status(400).json({ status: "failed", message: "Invalid responseTime." });
    update.responseTime = rt;
  }
  if (req.body.resolutionTime !== undefined) {
    const rt = parsePositiveInt(req.body.resolutionTime);
    if (!rt) return res.status(400).json({ status: "failed", message: "Invalid resolutionTime." });
    update.resolutionTime = rt;
  }
  try {
    const db = getDb();
    const slaCollection = db.collection("SLA");
    const result = await slaCollection.updateOne({ _id: new ObjectId(id) }, { $set: update });
    if (!result.matchedCount) {
      return res.status(404).json({ status: "failed", message: "SLA rule not found." });
    }
    return res.status(200).json({ status: "success", message: "SLA rule updated successfully." });
  } catch (err) {
    console.error("updateSlaRule error:", err.message);
    return res.status(500).json({ status: "failed", message: "Something went wrong!" });
  }
};

const deleteSlaRule = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid SLA id" });
  }
  try {
    const db = getDb();
    const slaCollection = db.collection("SLA");
    const result = await slaCollection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return res.status(404).json({ status: "failed", message: "SLA rule not found." });
    }
    return res.status(200).json({ status: "success", message: "SLA rule deleted successfully." });
  } catch (err) {
    console.error("deleteSlaRule error:", err.message);
    return res.status(500).json({ status: "failed", message: "Something went wrong!" });
  }
};

const getSlaStatus = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const tickets = await requestsCollection.find({}).toArray();
    const totalTickets = tickets.length;

    const breachedTickets = tickets.filter(
      (t) => t.responseSLA === "Breached" || t.resolutionSLA === "Breached"
    );
    const metTickets = tickets.filter(
      (t) =>
        (t.responseSLA === "Met" || t.responseSLA === null || t.responseSLA === undefined) &&
        (t.resolutionSLA === "Met" || t.resolutionSLA === null || t.resolutionSLA === undefined)
    );
    const breachedCount = breachedTickets.length;
    const metCount = metTickets.length;

    const metPct = totalTickets ? Math.round((metCount / totalTickets) * 100) : 0;
    const breachedPct = totalTickets ? Math.round((breachedCount / totalTickets) * 100) : 0;

    return res.status(200).json({
      status: "success",
      data: {
        totalTickets,
        metCount,
        breachedCount,
        metPercentage: metPct,
        breachedPercentage: breachedPct,
        breachedTickets: breachedTickets.slice(0, 100),
      },
    });
  } catch (err) {
    console.error("getSlaStatus error:", err.message);
    return res.status(500).json({ status: "failed", message: "Something went wrong!" });
  }
};

module.exports = {
  createSlaRule,
  getAllSlaRules,
  updateSlaRule,
  deleteSlaRule,
  getSlaStatus,
};
