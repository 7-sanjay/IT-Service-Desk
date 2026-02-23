const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Requests_Detail = sequelize.define("requests_detail", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_requests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "requests",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  title_request: DataTypes.STRING,
  subject_request: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = Requests_Detail;
