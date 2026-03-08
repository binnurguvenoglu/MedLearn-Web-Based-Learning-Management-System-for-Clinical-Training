import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const phoneRegex = /^\+?\d{10,15}$/;
const tcRegex = /^\d{11}$/;

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateBirthDate(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

function validatePatientPayload(payload) {
  const errors = [];
  const fullName = String(payload.full_name || "").trim();
  const tc = String(payload.tc || "").trim();
  const phone = String(payload.phone || "").trim();
  const birthDate = String(payload.birth_date || "").trim();

  if (fullName.length < 3) errors.push("full_name must be at least 3 characters");
  if (!tcRegex.test(tc)) errors.push("tc must be 11 digits");
  if (!phoneRegex.test(phone)) errors.push("phone must be 10-15 digits, optional + prefix");
  if (!validateBirthDate(birthDate)) errors.push("birth_date must be a valid date in the past");

  return { errors, normalized: { full_name: fullName, tc, phone, birth_date: birthDate } };
}

router.use(requireAuth);

router.get("/", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    if (!search) {
      const result = await query(
        "select * from patients order by created_at desc limit 100"
      );
      return res.json(result.rows);
    }

    const term = `%${search}%`;
    const result = await query(
      `select * from patients
       where full_name ilike $1 or tc ilike $1 or phone ilike $1
       order by created_at desc
       limit 100`,
      [term]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const { errors, normalized } = validatePatientPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const result = await query(
      `insert into patients (full_name, tc, phone, birth_date)
       values ($1, $2, $3, $4)
       returning *`,
      [normalized.full_name, normalized.tc, normalized.phone, normalized.birth_date]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Patient TC already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    const result = await query("select * from patients where id = $1", [patientId]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    const { errors, normalized } = validatePatientPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const result = await query(
      `update patients
       set full_name = $1, tc = $2, phone = $3, birth_date = $4
       where id = $5
       returning *`,
      [normalized.full_name, normalized.tc, normalized.phone, normalized.birth_date, patientId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Patient TC already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    const result = await query("delete from patients where id = $1 returning id", [patientId]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json({ message: "Patient deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
