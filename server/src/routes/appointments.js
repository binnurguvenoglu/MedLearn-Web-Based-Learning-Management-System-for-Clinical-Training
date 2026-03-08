import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const appointmentStatuses = new Set(["scheduled", "arrived", "completed", "cancelled", "no_show"]);
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidISODate(value) {
  return isoDateRegex.test(String(value || ""));
}

function parseStartTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateAppointmentPayload(payload) {
  const patientId = parsePositiveInt(payload.patient_id);
  const doctorId = parsePositiveInt(payload.doctor_id);
  const startDate = parseStartTime(payload.start_time);
  const status = payload.status || "scheduled";
  const errors = [];

  if (!patientId) errors.push("patient_id must be a positive integer");
  if (!doctorId) errors.push("doctor_id must be a positive integer");
  if (!startDate) {
    errors.push("start_time must be a valid date-time");
  } else if (startDate.getTime() < Date.now() - 60 * 1000) {
    errors.push("start_time cannot be in the past");
  }
  if (!appointmentStatuses.has(status)) {
    errors.push("status is invalid");
  }

  return {
    errors,
    normalized: {
      patient_id: patientId,
      doctor_id: doctorId,
      start_time: startDate ? startDate.toISOString() : null,
      status
    }
  };
}

router.use(requireAuth);

router.get("/", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const { date, date_from, date_to, doctor_id, status, search } = req.query;
    const conditions = [];
    const values = [];

    if (date) {
      if (!isValidISODate(date)) {
        return res.status(400).json({ message: "date must be YYYY-MM-DD" });
      }
      values.push(date);
      conditions.push(`a.start_time::date = $${values.length}::date`);
    } else {
      if (date_from) {
        if (!isValidISODate(date_from)) {
          return res.status(400).json({ message: "date_from must be YYYY-MM-DD" });
        }
        values.push(date_from);
        conditions.push(`a.start_time::date >= $${values.length}::date`);
      }
      if (date_to) {
        if (!isValidISODate(date_to)) {
          return res.status(400).json({ message: "date_to must be YYYY-MM-DD" });
        }
        values.push(date_to);
        conditions.push(`a.start_time::date <= $${values.length}::date`);
      }
    }

    if (doctor_id) {
      const parsedDoctorId = parsePositiveInt(doctor_id);
      if (!parsedDoctorId) {
        return res.status(400).json({ message: "doctor_id must be a positive integer" });
      }
      values.push(parsedDoctorId);
      conditions.push(`a.doctor_id = $${values.length}`);
    }

    if (status) {
      if (!appointmentStatuses.has(status)) {
        return res.status(400).json({ message: "Invalid appointment status filter" });
      }
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${String(search).trim()}%`);
      conditions.push(`(p.full_name ilike $${values.length} or d.name ilike $${values.length})`);
    }

    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const result = await query(
      `select
         a.*,
         p.full_name as patient_name,
         d.name as doctor_name
       from appointments a
       join patients p on p.id = a.patient_id
       join users d on d.id = a.doctor_id
       ${where}
       order by a.start_time asc
       limit 300`,
      values
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const { errors, normalized } = validateAppointmentPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const patientCheck = await query("select id from patients where id = $1", [normalized.patient_id]);
    if (!patientCheck.rows[0]) {
      return res.status(400).json({ message: "Patient does not exist" });
    }

    const doctorCheck = await query(
      "select id from users where id = $1 and role = 'doctor'",
      [normalized.doctor_id]
    );
    if (!doctorCheck.rows[0]) {
      return res.status(400).json({ message: "Doctor does not exist or user is not a doctor" });
    }

    const conflict = await query(
      `select id from appointments
       where doctor_id = $1 and start_time = $2
       limit 1`,
      [normalized.doctor_id, normalized.start_time]
    );
    if (conflict.rows[0]) {
      return res.status(400).json({
        message: "Appointment conflict: this doctor already has an appointment at this time"
      });
    }

    const result = await query(
      `insert into appointments (patient_id, doctor_id, start_time, status)
       values ($1, $2, $3, $4)
       returning *`,
      [
        normalized.patient_id,
        normalized.doctor_id,
        normalized.start_time,
        normalized.status
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const appointmentId = parsePositiveInt(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const { errors, normalized } = validateAppointmentPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const existing = await query("select id from appointments where id = $1", [appointmentId]);
    if (!existing.rows[0]) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patientCheck = await query("select id from patients where id = $1", [normalized.patient_id]);
    if (!patientCheck.rows[0]) {
      return res.status(400).json({ message: "Patient does not exist" });
    }

    const doctorCheck = await query(
      "select id from users where id = $1 and role = 'doctor'",
      [normalized.doctor_id]
    );
    if (!doctorCheck.rows[0]) {
      return res.status(400).json({ message: "Doctor does not exist or user is not a doctor" });
    }

    const conflict = await query(
      `select id from appointments
       where doctor_id = $1 and start_time = $2 and id <> $3
       limit 1`,
      [normalized.doctor_id, normalized.start_time, appointmentId]
    );
    if (conflict.rows[0]) {
      return res.status(400).json({
        message: "Appointment conflict: this doctor already has an appointment at this time"
      });
    }

    const result = await query(
      `update appointments
       set patient_id = $1, doctor_id = $2, start_time = $3, status = $4
       where id = $5
       returning *`,
      [
        normalized.patient_id,
        normalized.doctor_id,
        normalized.start_time,
        normalized.status,
        appointmentId
      ]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        message: "Appointment conflict: this doctor already has an appointment at this time"
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/status", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const appointmentId = parsePositiveInt(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const { status } = req.body;
    if (!status || !appointmentStatuses.has(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const result = await query(
      `update appointments
       set status = $1
       where id = $2
       returning *`,
      [status, appointmentId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/cancel", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const appointmentId = parsePositiveInt(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const result = await query(
      `update appointments
       set status = 'cancelled'
       where id = $1
       returning *`,
      [appointmentId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
