require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const router = require("./routes/index");
const { connectMongo } = require("./config/mongo");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/public", express.static("public"));

app.get("/", (req, res) => {
  res.send("Hello World");
  console.log("Hello World");
});

app.use("/api", router);

app.use("*", (req, res) => {
  res.json({
    status: "failed",
    message: "404 Page Not Found",
  });
});

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to start server because MongoDB connection failed.");
    console.error(err);
    process.exit(1);
  });
