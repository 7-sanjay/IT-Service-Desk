const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Files = require("./files");

const ReplyRequest = sequelize.define("reply_request", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_request: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "requests",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  message: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_reply: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

ReplyRequest.hasOne(Files, {
  foreignKey: "id_reply",
  sourceKey: "id",
});

module.exports = ReplyRequest;
