const { DataTypes } = require("sequelize");
const sequelize = require("../config/db-2");

const Employee = sequelize.define(
  "Employee",
  {
    EmployeeID: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    DepartmentID: { type: DataTypes.STRING, allowNull: true },
    GradeID: { type: DataTypes.STRING, allowNull: true },
    BranchID: { type: DataTypes.STRING, allowNull: true },
    JobTitleID: { type: DataTypes.STRING, allowNull: true },
    EmployeeName: { type: DataTypes.STRING, allowNull: false },
    Address: { type: DataTypes.STRING, allowNull: true },
    DateOfBirth: { type: DataTypes.DATE, allowNull: true },
    PlaceOfBirth: { type: DataTypes.STRING, allowNull: true },
    DateIn: { type: DataTypes.DATE, allowNull: true },
    DateOut: { type: DataTypes.DATE, allowNull: true },
    MaritialStatus: { type: DataTypes.STRING, allowNull: true },
    EmployeeStatus: { type: DataTypes.STRING, allowNull: true },
    Remarks: { type: DataTypes.TEXT, allowNull: true },
    Sex: { type: DataTypes.STRING, allowNull: true },
    Religion: { type: DataTypes.STRING, allowNull: true },
    Telephone: { type: DataTypes.STRING, allowNull: true },
    HandPhone: { type: DataTypes.STRING, allowNull: true },
    ZipCode: { type: DataTypes.STRING, allowNull: true },
  },
  {
    timestamps: false,
  }
);

module.exports = Employee;
