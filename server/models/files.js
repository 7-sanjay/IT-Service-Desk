const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Files = sequelize.define("file", {
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
  id_reply: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "reply_requests",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  image: { type: DataTypes.STRING, allowNull: true },
  file_document: { type: DataTypes.STRING, allowNull: true },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = Files;
