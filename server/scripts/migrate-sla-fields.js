require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "ticketing";

const normalizePriority = (priority) => {
  if (priority === null || priority === undefined) return "Medium";
  const raw = String(priority).trim().toLowerCase();
  if (raw === "low") return "Low";
  if (raw === "medium") return "Medium";
  if (raw === "high" || raw === "critical") return "High";
  return "Medium";
};

const computeSlaFlag = (actualAt, dueAt) => {
  if (!dueAt) return null;
  if (!actualAt) return null;
  return new Date(actualAt).getTime() <= new Date(dueAt).getTime()
    ? "Met"
    : "Breached";
};

async function run() {
  if (!uri) throw new Error("MONGO_URI is required in environment.");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const requests = db.collection("requests");
    const slaCollection = db.collection("SLA");

    const slaRules = await slaCollection.find({}).toArray();
    const slaMap = new Map(slaRules.map((r) => [normalizePriority(r.priority), r]));

    if (slaMap.size === 0) {
      throw new Error("No SLA rules found in 'SLA' collection. Create SLA rules first.");
    }

    const cursor = requests.find(
      {},
      {
        projection: {
          _id: 1,
          priority: 1,
          createdAt: 1,
          updatedAt: 1,
          ticket_status: 1,
          start_process_ticket: 1,
          end_date_ticket: 1,
          responseDueAt: 1,
          resolutionDueAt: 1,
          respondedAt: 1,
          resolvedAt: 1,
          responseSLA: 1,
          resolutionSLA: 1,
          escalated: 1,
        },
      }
    );

    let scanned = 0;
    let updated = 0;
    let skippedNoRule = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      scanned += 1;

      const normalizedPriority = normalizePriority(doc.priority);
      const rule = slaMap.get(normalizedPriority);
      if (!rule) {
        skippedNoRule += 1;
        continue;
      }

      const createdAt =
        doc.createdAt ||
        (ObjectId.isValid(doc._id) ? new ObjectId(doc._id).getTimestamp() : new Date());

      const responseDueAt =
        doc.responseDueAt ||
        new Date(new Date(createdAt).getTime() + Number(rule.responseTime) * 60 * 1000);
      const resolutionDueAt =
        doc.resolutionDueAt ||
        new Date(new Date(createdAt).getTime() + Number(rule.resolutionTime) * 60 * 1000);

      let respondedAt = doc.respondedAt || null;
      const status = doc.ticket_status;
      if (!respondedAt && ["P", "D", "C", "E", "R"].includes(status)) {
        respondedAt = doc.start_process_ticket || doc.updatedAt || createdAt;
      }

      let resolvedAt = doc.resolvedAt || null;
      if (!resolvedAt && ["D", "C"].includes(status)) {
        resolvedAt = doc.end_date_ticket || doc.updatedAt || createdAt;
      }

      const responseSLA =
        doc.responseSLA || computeSlaFlag(respondedAt, responseDueAt) || null;
      const resolutionSLA =
        doc.resolutionSLA || computeSlaFlag(resolvedAt, resolutionDueAt) || null;
      const escalated =
        typeof doc.escalated === "boolean"
          ? doc.escalated
          : status === "E" || resolutionSLA === "Breached";

      const nextData = {
        responseDueAt,
        resolutionDueAt,
        respondedAt,
        resolvedAt,
        responseSLA,
        resolutionSLA,
        escalated,
        updatedAt: new Date(),
      };

      const changed =
        String(doc.responseDueAt || "") !== String(nextData.responseDueAt || "") ||
        String(doc.resolutionDueAt || "") !== String(nextData.resolutionDueAt || "") ||
        String(doc.respondedAt || "") !== String(nextData.respondedAt || "") ||
        String(doc.resolvedAt || "") !== String(nextData.resolvedAt || "") ||
        String(doc.responseSLA || "") !== String(nextData.responseSLA || "") ||
        String(doc.resolutionSLA || "") !== String(nextData.resolutionSLA || "") ||
        doc.escalated !== nextData.escalated;

      if (changed) {
        await requests.updateOne({ _id: doc._id }, { $set: nextData });
        updated += 1;
      }
    }

    console.log(
      `SLA backfill completed. Scanned: ${scanned}, Updated: ${updated}, Skipped (no SLA rule): ${skippedNoRule}`
    );
  } finally {
    await client.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SLA backfill migration failed:", err.message);
    process.exit(1);
  });
