import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/summary", requireRole("admin", "receptionist", "doctor"), async (_req, res) => {
  try {
    const summaryResult = await query(
      `select
         (select count(*) from patients) as total_patients,
         (select count(*) from users where role = 'doctor') as total_doctors,
         (select count(*) from appointments) as total_appointments,
         (select count(*) from appointments where status::text = 'completed') as completed_appointments,
         (select count(*) from appointments where status::text = 'cancelled') as cancelled_appointments,
         (select count(*) from appointments where start_time::date = current_date) as today_appointments,
         (select count(*) from appointments where start_time > now()) as upcoming_appointments`
    );

    const byStatusResult = await query(
      `select status::text as status, count(*)::int as count
       from appointments
       group by status`
    );

    const recentResult = await query(
      `select
         a.id,
         a.start_time,
         a.status,
         p.full_name as patient_name,
         d.name as doctor_name
       from appointments a
       join patients p on p.id = a.patient_id
       join users d on d.id = a.doctor_id
       order by a.start_time desc
       limit 5`
    );

    const row = summaryResult.rows[0] || {};
    const summary = {
      total_patients: Number(row.total_patients || 0),
      total_doctors: Number(row.total_doctors || 0),
      total_appointments: Number(row.total_appointments || 0),
      completed_appointments: Number(row.completed_appointments || 0),
      cancelled_appointments: Number(row.cancelled_appointments || 0),
      today_appointments: Number(row.today_appointments || 0),
      upcoming_appointments: Number(row.upcoming_appointments || 0)
    };

    const groupedByStatus = {
      scheduled: 0,
      arrived: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    for (const item of byStatusResult.rows) {
      groupedByStatus[item.status] = Number(item.count || 0);
    }

    return res.json({
      summary,
      grouped_by_status: groupedByStatus,
      recent_appointments: recentResult.rows || []
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
