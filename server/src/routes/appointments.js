import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: "date query (YYYY-MM-DD) is required" });
    }

    const result = await query(
      `select
         a.*,
         p.full_name as patient_name,
         d.name as doctor_name
       from appointments a
       join patients p on p.id = a.patient_id
       join users d on d.id = a.doctor_id
       where a.start_time::date = $1::date
       order by a.start_time asc`,
      [date]
    );
    return res.json(result.rows);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        message: "Appointment conflict: this doctor already has an appointment at this time"
      });
    }
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

export default router;
