const { getDb } = require("../../config/mongo");

const getCategories = (req, res) => {
  try {
    const db = getDb();
    const categoriesCollection = db.collection("categories");

    categoriesCollection
      .find({})
      .project({ category: 1, id_type: 1 })
      .toArray()
      .then((categories) => {
        res.status(200).json({
          status: "success",
          message: "Successfully get categories!",
          data: categories,
        });
      })
      .catch((err) => {
        console.error("Mongo getCategories error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo getCategories error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const createCategory = (req, res) => {
  const { category, id_type } = req.body;
  try {
    const db = getDb();
    const categoriesCollection = db.collection("categories");

    categoriesCollection
      .insertOne({
        category,
        id_type,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .then((result) => {
        res.status(200).json({
          status: "success",
          message: "Successfully create category!",
          data: { _id: result.insertedId, category, id_type },
        });
      })
      .catch((err) => {
        console.error("Mongo createCategory error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo createCategory error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const deleteCategory = (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const categoriesCollection = db.collection("categories");

    categoriesCollection
      .deleteOne({ _id: new require("mongodb").ObjectId(id) })
      .then((result) => {
        res.status(200).json({
          status: "success",
          message: "Successfully delete category!",
          data: result,
        });
      })
      .catch((err) => {
        console.error("Mongo deleteCategory error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo deleteCategory error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const searchCategory = (req, res) => {
  const { category } = req.query;

  try {
    const db = getDb();
    const categoriesCollection = db.collection("categories");

    categoriesCollection
      .find({
        category: { $regex: category, $options: "i" },
      })
      .project({ category: 1 })
      .toArray()
      .then((categories) => {
        res.status(200).json({
          status: "success",
          message: "Successfully search category!",
          data: categories,
        });
      })
      .catch((err) => {
        console.error("Mongo searchCategory error:", err.message);
        res.status(500).json({
          status: "failed",
          message: "Something went wrong!",
        });
      });
  } catch (err) {
    console.error("Mongo searchCategory error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
  searchCategory,
};
