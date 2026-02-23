const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Requests_detail = require("./request_detail");
const Files = require("./files");
const ReplyRequest = require("./reply_request");

const Requests = sequelize.define("request", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  user_request: DataTypes.STRING,
  category: DataTypes.STRING,
  email_request: DataTypes.STRING,
  department: DataTypes.STRING,
  ticket_status: DataTypes.STRING,
  user_process: DataTypes.STRING,
  priority: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  start_process_ticket: DataTypes.DATE,
  end_date_ticket: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

Requests.hasOne(Requests_detail, {
  foreignKey: "id_requests",
  sourceKey: "id",
});

Requests.hasOne(Files, {
  foreignKey: "id_requests",
  sourceKey: "id",
});

Requests.hasMany(ReplyRequest, {
  foreignKey: "id_request",
  sourceKey: "id",
});

module.exports = Requests;
