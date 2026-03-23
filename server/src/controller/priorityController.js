const { getDb } = require("../../config/mongo");
const { ObjectId } = require("mongodb");

const normalizePriority = (priority) => {
  if (priority === null || priority === undefined) return "Medium";
  const raw = String(priority).trim().toLowerCase();
  if (raw === "low") return "Low";
  if (raw === "medium") return "Medium";
  if (raw === "high") return "High";
  if (raw === "critical") return "High"; // legacy mapping
  return null;
};

const getPriorities = (req, res) => {
  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .find({})
      .project({ priority: 1 })
      .toArray()
      .then((priorities) => {
        const allowed = ["Low", "Medium", "High"];
        const normalized = Array.from(
          new Set(
            priorities
              .map((p) => normalizePriority(p.priority))
              .filter((p) => p && allowed.includes(p))
          )
        ).map((p) => ({ priority: p }));
        res.status(200).json({
          status: "success",
          message: "Successfully get priorities!",
          data: normalized,
        });
      })
      .catch((err) => {
        console.error("Mongo getPriorities error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo getPriorities error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const createPriority = (req, res) => {
  const normalizedPriority = normalizePriority(req.body.priority);
  if (!normalizedPriority) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid priority. Allowed values are Low, Medium, High.",
    });
  }
  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .insertOne({
        priority: normalizedPriority,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .then((result) => {
        res.status(200).json({
          status: "success",
          message: "Successfully create priority!",
          data: { _id: result.insertedId, priority: normalizedPriority },
        });
      })
      .catch((err) => {
        console.error("Mongo createPriority error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo createPriority error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const deletePriority = (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .deleteOne({ _id: new ObjectId(id) })
      .then((result) => {
        res.status(200).json({
          status: "success",
          message: "Successfully delete priority!",
          data: result,
        });
      })
      .catch((err) => {
        console.error("Mongo deletePriority error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo deletePriority error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const searchPriority = (req, res) => {
  const { priority } = req.query;

  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .find({
        priority: { $regex: priority, $options: "i" },
      })
      .project({ priority: 1 })
      .toArray()
      .then((priorities) => {
        const normalized = priorities
          .map((p) => ({ priority: normalizePriority(p.priority) }))
          .filter((p) => !!p.priority);
        res.status(200).json({
          status: "success",
          message: "Successfully search priority!",
          data: normalized,
        });
      })
      .catch((err) => {
        console.error("Mongo searchPriority error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo searchPriority error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

module.exports = {
  getPriorities,
  createPriority,
  deletePriority,
  searchPriority,
};

