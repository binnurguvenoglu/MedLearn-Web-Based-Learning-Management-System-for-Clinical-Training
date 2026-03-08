import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

router.use(requireAuth);

router.post("/", requireRole("doctor"), async (req, res) => {
  try {
    const patientId = parsePositiveInt(req.body?.patient_id);
    const appointmentId = req.body?.appointment_id ? parsePositiveInt(req.body.appointment_id) : null;
    const medication = String(req.body?.medication || "").trim();
    const dosage = String(req.body?.dosage || "").trim();
    const notes = String(req.body?.notes || "").trim();

    const errors = [];
    if (!patientId) errors.push("patient_id must be a positive integer");
    if (!medication) errors.push("medication is required");
    if (!dosage) errors.push("dosage is required");
    if (req.body?.appointment_id && !appointmentId) {
      errors.push("appointment_id must be a positive integer when provided");
    }
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const patientCheck = await query("select id from patients where id = $1", [patientId]);
    if (!patientCheck.rows[0]) {
      return res.status(400).json({ message: "Patient does not exist" });
    }

    if (appointmentId) {
      const appointmentCheck = await query(
        `select id from appointments
         where id = $1 and patient_id = $2 and doctor_id = $3`,
        [appointmentId, patientId, req.user.id]
      );
      if (!appointmentCheck.rows[0]) {
        return res.status(400).json({
          message: "Appointment does not exist for this patient and doctor"
        });
      }
    }

    const result = await query(
      `insert into prescriptions (patient_id, doctor_id, appointment_id, medication, dosage, notes)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [patientId, req.user.id, appointmentId, medication, dosage, notes || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const patientId = req.query.patient_id ? parsePositiveInt(req.query.patient_id) : null;
    if (req.query.patient_id && !patientId) {
      return res.status(400).json({ message: "patient_id must be a positive integer" });
    }

    const values = [];
    let where = "";
    if (patientId) {
      values.push(patientId);
      where = `where pr.patient_id = $1`;
    }

    const result = await query(
      `select
         pr.*,
         p.full_name as patient_name,
         d.name as doctor_name
       from prescriptions pr
       join patients p on p.id = pr.patient_id
       join users d on d.id = pr.doctor_id
       ${where}
       order by pr.created_at desc
       limit 200`,
      values
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", requireRole("admin", "receptionist", "doctor"), async (req, res) => {
  try {
    const prescriptionId = parsePositiveInt(req.params.id);
    if (!prescriptionId) {
      return res.status(400).json({ message: "Invalid prescription id" });
    }

    const result = await query(
      `select
         pr.*,
         p.full_name as patient_name,
         d.name as doctor_name
       from prescriptions pr
       join patients p on p.id = pr.patient_id
       join users d on d.id = pr.doctor_id
       where pr.id = $1`,
      [prescriptionId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

