const { getDb } = require("../../config/mongo");
const { ObjectId } = require("mongodb");

const getPriorities = (req, res) => {
  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .find({})
      .project({ priority: 1 })
      .toArray()
      .then((priorities) => {
        res.status(200).json({
          status: "success",
          message: "Successfully get priorities!",
          data: priorities,
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
  const { priority } = req.body;
  try {
    const db = getDb();
    const prioritiesCollection = db.collection("priorities");

    prioritiesCollection
      .insertOne({
        priority,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .then((result) => {
        res.status(200).json({
          status: "success",
          message: "Successfully create priority!",
          data: { _id: result.insertedId, priority },
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
        res.status(200).json({
          status: "success",
          message: "Successfully search priority!",
          data: priorities,
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

