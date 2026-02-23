require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

if (!process.env.MONGO_URI) {
  console.warn(
    "MONGO_URI is not set in .env. MongoDB connection will fail until it is configured."
  );
}

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function connectMongo() {
  if (db) {
    return db;
  }

  try {
    await client.connect();
    // Use database from connection string or optional MONGO_DB_NAME override
    const dbNameFromEnv = process.env.MONGO_DB_NAME;
    const dbName =
      dbNameFromEnv ||
      (client.options?.dbName ||
        new URL(process.env.MONGO_URI).pathname.replace("/", "") ||
        "test");

    db = client.db(dbName);
    console.log("Connected to MongoDB Atlas database:", dbName);
    // Simple ping
    await db.command({ ping: 1 });
    console.log("Pinged your MongoDB deployment successfully.");
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas:", err);
    throw err;
  }
}

function getDb() {
  if (!db) {
    throw new Error(
      "MongoDB not initialised yet. Call connectMongo() before using getDb()."
    );
  }
  return db;
}

module.exports = {
  connectMongo,
  getDb,
};

