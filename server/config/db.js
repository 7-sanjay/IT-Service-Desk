require("dotenv").config();
const { Sequelize } = require("sequelize");
const config = require("./config.json");

const sequelize = new Sequelize(
  process.env.DB_NAME_1,
  process.env.DB_USERNAME_1,
  process.env.DB_PASSWORD_1,
  {
    host: process.env.DB_HOST_1,
    dialect: process.env.DB_CONNECTION_1,
  }
);

// Production
// const sequelize = new Sequelize(
//   config.production.database,
//   config.production.username,
//   config.production.password,
//   {
//     host: config.production.host,
//     dialect: "mariadb",
//   }
// );

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
  } catch (error) {
    console.log("error connection: " + error);
  }
}

testConnection();

module.exports = sequelize;
