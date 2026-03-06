import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const appointmentStatuses = new Set(["scheduled", "arrived", "completed", "cancelled", "no_show"]);

router.use(requireAuth);

router.get("/", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const { date, date_from, date_to, doctor_id, status, search } = req.query;
    const conditions = [];
    const values = [];

    if (date) {
      values.push(date);
      conditions.push(`a.start_time::date = $${values.length}::date`);
    } else {
      if (date_from) {
        values.push(date_from);
        conditions.push(`a.start_time::date >= $${values.length}::date`);
      }
      if (date_to) {
        values.push(date_to);
        conditions.push(`a.start_time::date <= $${values.length}::date`);
      }
    }

    if (doctor_id) {
      values.push(doctor_id);
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
    const { patient_id, doctor_id, start_time, status } = req.body;
    if (!patient_id || !doctor_id || !start_time) {
      return res.status(400).json({ message: "patient_id, doctor_id, start_time are required" });
    }

    const patientCheck = await query("select id from patients where id = $1", [patient_id]);
    if (!patientCheck.rows[0]) {
      return res.status(400).json({ message: "Patient does not exist" });
    }

    const doctorCheck = await query(
      "select id from users where id = $1 and role = 'doctor'",
      [doctor_id]
    );
    if (!doctorCheck.rows[0]) {
      return res.status(400).json({ message: "Doctor does not exist or user is not a doctor" });
    }

    const conflict = await query(
      `select id from appointments
       where doctor_id = $1 and start_time = $2
       limit 1`,
      [doctor_id, start_time]
    );
    if (conflict.rows[0]) {
      return res.status(400).json({
        message: "Appointment conflict: this doctor already has an appointment at this time"
      });
    }

    const appointmentStatus = status || "scheduled";
    if (!appointmentStatuses.has(appointmentStatus)) {
      return res.status(400).json({ message: "Invalid appointment status" });
    }

    const result = await query(
      `insert into appointments (patient_id, doctor_id, start_time, status)
       values ($1, $2, $3, $4)
       returning *`,
      [patient_id, doctor_id, start_time, appointmentStatus]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", requireRole("admin", "receptionist"), async (req, res) => {
  try {
    const { patient_id, doctor_id, start_time, status } = req.body;
    if (!patient_id || !doctor_id || !start_time) {
      return res.status(400).json({ message: "patient_id, doctor_id, start_time are required" });
    }

    const appointmentStatus = status || "scheduled";
    if (!appointmentStatuses.has(appointmentStatus)) {
      return res.status(400).json({ message: "Invalid appointment status" });
    }

    const existing = await query("select id from appointments where id = $1", [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patientCheck = await query("select id from patients where id = $1", [patient_id]);
    if (!patientCheck.rows[0]) {
      return res.status(400).json({ message: "Patient does not exist" });
    }

    const doctorCheck = await query(
      "select id from users where id = $1 and role = 'doctor'",
      [doctor_id]
    );
    if (!doctorCheck.rows[0]) {
      return res.status(400).json({ message: "Doctor does not exist or user is not a doctor" });
    }

    const conflict = await query(
      `select id from appointments
       where doctor_id = $1 and start_time = $2 and id <> $3
       limit 1`,
      [doctor_id, start_time, req.params.id]
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
      [patient_id, doctor_id, start_time, appointmentStatus, req.params.id]
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
    const { status } = req.body;
    if (!status || !appointmentStatuses.has(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const result = await query(
      `update appointments
       set status = $1
       where id = $2
       returning *`,
      [status, req.params.id]
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
    const result = await query(
      `update appointments
       set status = 'cancelled'
       where id = $1
       returning *`,
      [req.params.id]
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
