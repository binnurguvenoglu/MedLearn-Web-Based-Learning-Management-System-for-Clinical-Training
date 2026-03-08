import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import appointmentRoutes from "./routes/appointments.js";
import userRoutes from "./routes/users.js";
import dashboardRoutes from "./routes/dashboard.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import { query } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Database connection failed",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  return res.status(500).json({ message: "Internal server error" });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
