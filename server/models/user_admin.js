const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserAdmin = sequelize.define("user_admins", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  id_karyawan: DataTypes.INTEGER,
  DepartmentID: DataTypes.INTEGER,
  username: DataTypes.STRING,
  full_name: DataTypes.STRING,
  email: DataTypes.STRING,
  level: {
    type: DataTypes.ENUM(
      "admin",
      "user",
      "support_engineer",
      "manager",
      // legacy values kept for backward compatibility during migration
      "team",
      "head"
    ),
    allowNull: true,
  },
  last_login: DataTypes.DATE,
  image_login: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = UserAdmin;
