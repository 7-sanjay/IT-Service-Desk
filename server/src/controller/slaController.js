const { ObjectId } = require("mongodb");
const { getDb } = require("../../config/mongo");

const ALLOWED_PRIORITIES = ["Low", "Medium", "High"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const businessMsBetweenIst = (start, end) => {
  if (!start || !end) return 0;
  const s0 = new Date(start).getTime();
  const e0 = new Date(end).getTime();
  if (!Number.isFinite(s0) || !Number.isFinite(e0)) return 0;
  if (e0 <= s0) return 0;

  const s = s0 + IST_OFFSET_MS;
  const e = e0 + IST_OFFSET_MS;

  let total = 0;
  let dayStart = Math.floor(s / DAY_MS) * DAY_MS;
  while (dayStart < e) {
    const businessStart = dayStart + 8 * HOUR_MS;
    const businessEnd = dayStart + 22 * HOUR_MS;
    const overlapStart = Math.max(s, businessStart);
    const overlapEnd = Math.min(e, businessEnd);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    dayStart += DAY_MS;
  }
  return total;
};

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

    const priorityAcc = {
      Low: { responseTotalMs: 0, responseCount: 0, resolutionTotalMs: 0, resolutionCount: 0 },
      Medium: { responseTotalMs: 0, responseCount: 0, resolutionTotalMs: 0, resolutionCount: 0 },
      High: { responseTotalMs: 0, responseCount: 0, resolutionTotalMs: 0, resolutionCount: 0 },
    };

    for (const t of tickets) {
      const p = normalizePriority(t.priority);
      if (!priorityAcc[p]) continue;

      // Response average:
      // Prefer explicit respondedAt, then fall back to legacy first processing timestamp.
      const responseAt = t.respondedAt || t.start_process_ticket || null;
      if (t.createdAt && responseAt) {
        const responseMs = businessMsBetweenIst(t.createdAt, responseAt);
        if (responseMs > 0) {
          priorityAcc[p].responseTotalMs += responseMs;
          priorityAcc[p].responseCount += 1;
        }
      }

      // Resolution average:
      // Prefer explicit resolvedAt, then fallback to legacy end_date_ticket.
      const resolvedAt = t.resolvedAt || t.end_date_ticket || null;
      if (resolvedAt) {
        let resolutionMs = 0;
        if (typeof t.accumulated_time_ms === "number" && t.accumulated_time_ms > 0) {
          // Preferred source: accumulated active processing time
          resolutionMs = t.accumulated_time_ms;
        } else if (t.createdAt) {
          // Fallback for legacy data
          resolutionMs = businessMsBetweenIst(t.createdAt, resolvedAt);
        }
        if (resolutionMs > 0) {
          priorityAcc[p].resolutionTotalMs += resolutionMs;
          priorityAcc[p].resolutionCount += 1;
        }
      }
    }

    const priorityKpis = ["Low", "Medium", "High"].map((priority) => {
      const row = priorityAcc[priority];
      const avgResponseMs =
        row.responseCount > 0 ? Math.round(row.responseTotalMs / row.responseCount) : null;
      const avgResolutionMs =
        row.resolutionCount > 0 ? Math.round(row.resolutionTotalMs / row.resolutionCount) : null;
      return {
        priority,
        avgResponseMs,
        avgResolutionMs,
        responseSampleCount: row.responseCount,
        resolutionSampleCount: row.resolutionCount,
      };
    });

    return res.status(200).json({
      status: "success",
      data: {
        totalTickets,
        metCount,
        breachedCount,
        metPercentage: metPct,
        breachedPercentage: breachedPct,
        priorityKpis,
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
