require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "ticketing";

const normalizePriority = (priority) => {
  if (priority === null || priority === undefined) return "Medium";
  const raw = String(priority).trim().toLowerCase();
  if (raw === "low") return "Low";
  if (raw === "medium") return "Medium";
  if (raw === "high") return "High";
  if (raw === "critical") return "High"; // legacy mapping
  return "Medium";
};

async function run() {
  if (!uri) throw new Error("MONGO_URI is required in environment.");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const requests = db.collection("requests");
    const cursor = requests.find({}, { projection: { priority: 1 } });
    let updated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const normalized = normalizePriority(doc.priority);
      if (doc.priority !== normalized) {
        await requests.updateOne(
          { _id: doc._id },
          { $set: { priority: normalized, updatedAt: new Date() } }
        );
        updated += 1;
      }
    }

    console.log(`Priority migration completed. Updated ${updated} ticket(s).`);
  } finally {
    await client.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Priority migration failed:", err.message);
    process.exit(1);
  });

