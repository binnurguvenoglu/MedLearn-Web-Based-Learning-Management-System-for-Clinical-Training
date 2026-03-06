import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/doctors", requireRole("admin", "receptionist", "doctor"), async (_req, res) => {
  try {
    const result = await query(
      `select id, name, email
       from users
       where role = 'doctor'
       order by name asc`
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

