require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "ticketing";

async function run() {
  if (!uri) {
    throw new Error("MONGO_URI is required in environment.");
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const users = db.collection("users");

    const teamToSupport = await users.updateMany(
      { level: "team" },
      { $set: { level: "support_engineer", updatedAt: new Date() } }
    );
    const headToManager = await users.updateMany(
      { level: "head" },
      { $set: { level: "manager", updatedAt: new Date() } }
    );

    console.log(
      `Updated roles: team->support_engineer ${teamToSupport.modifiedCount}, head->manager ${headToManager.modifiedCount}`
    );
  } finally {
    await client.close();
  }
}

run()
  .then(() => {
    console.log("Role migration completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Role migration failed:", err.message);
    process.exit(1);
  });

