// server.js - TimeTracker Backend

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err.message);
  });

// schema for time tracking data
const siteDataSchema = new mongoose.Schema({
  domain: String,
  seconds: Number,
  category: String
});

const dailyReportSchema = new mongoose.Schema({
  date: { type: String, unique: true },
  sites: [siteDataSchema],
  totalSeconds: Number,
  productiveSeconds: Number,
  unproductiveSeconds: Number,
  score: Number,
  updatedAt: { type: Date, default: Date.now }
});

const DailyReport = mongoose.model("DailyReport", dailyReportSchema);

// POST /api/sync - receive data from extension
app.post("/api/sync", async (req, res) => {
  try {
    const { date, data } = req.body;

    if (!date || !data) {
      return res.status(400).json({ error: "Missing date or data" });
    }

    // build site array from data object
    var sitesArray = [];
    var totalSeconds = 0;
    var productiveSeconds = 0;
    var unproductiveSeconds = 0;

    Object.keys(data).forEach(function(domain) {
      var info = data[domain];
      sitesArray.push({
        domain: domain,
        seconds: info.seconds,
        category: info.category
      });
      totalSeconds += info.seconds;
      if (info.category === "productive") {
        productiveSeconds += info.seconds;
      } else if (info.category === "unproductive") {
        unproductiveSeconds += info.seconds;
      }
    });

    var score = 0;
    if (productiveSeconds + unproductiveSeconds > 0) {
      score = Math.round((productiveSeconds / (productiveSeconds + unproductiveSeconds)) * 100);
    }

    // upsert - update if exists, create if not
    await DailyReport.findOneAndUpdate(
      { date: date },
      {
        date: date,
        sites: sitesArray,
        totalSeconds: totalSeconds,
        productiveSeconds: productiveSeconds,
        unproductiveSeconds: unproductiveSeconds,
        score: score,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Data synced for " + date });
  } catch (err) {
    console.log("Sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/report/today - get today's report
app.get("/api/report/today", async (req, res) => {
  try {
    var today = new Date().toISOString().split("T")[0];
    var report = await DailyReport.findOne({ date: today });

    if (!report) {
      return res.json({ message: "No data for today", date: today, sites: [] });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/report/week - get last 7 days
app.get("/api/report/week", async (req, res) => {
  try {
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    var reports = await DailyReport.find({ date: { $in: dates } }).sort({ date: -1 });

    var weekTotal = 0;
    var weekProductive = 0;
    var weekUnproductive = 0;

    reports.forEach(function(r) {
      weekTotal += r.totalSeconds;
      weekProductive += r.productiveSeconds;
      weekUnproductive += r.unproductiveSeconds;
    });

    var weekScore = 0;
    if (weekProductive + weekUnproductive > 0) {
      weekScore = Math.round((weekProductive / (weekProductive + weekUnproductive)) * 100);
    }

    res.json({
      weekTotal: weekTotal,
      weekProductive: weekProductive,
      weekUnproductive: weekUnproductive,
      weekScore: weekScore,
      days: reports
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/all - get all saved reports
app.get("/api/reports/all", async (req, res) => {
  try {
    var reports = await DailyReport.find().sort({ date: -1 }).limit(30);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/report/:date - delete a specific day's data
app.delete("/api/report/:date", async (req, res) => {
  try {
    await DailyReport.findOneAndDelete({ date: req.params.date });
    res.json({ success: true, message: "Deleted report for " + req.params.date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// home route
app.get("/", (req, res) => {
  res.json({
    message: "TimeTracker API is running",
    routes: [
      "POST /api/sync",
      "GET /api/report/today",
      "GET /api/report/week",
      "GET /api/reports/all",
      "DELETE /api/report/:date"
    ]
  });
});

app.listen(PORT, () => {
  console.log("TimeTracker backend running on http://localhost:" + PORT);
});
