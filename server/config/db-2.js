require("dotenv").config();
const { Sequelize } = require("sequelize");
const config = require("./config.json");

const sequelize = new Sequelize(
  process.env.DB_NAME_2,
  process.env.DB_USERNAME_2,
  process.env.DB_PASSWORD_2,
  {
    host: process.env.DB_HOST_2,
    dialect: process.env.DB_CONNECTION_2,
  }
);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database 2 connected!");
  } catch (error) {
    console.log("error connection: " + error);
  }
}

testConnection();

module.exports = sequelize;
