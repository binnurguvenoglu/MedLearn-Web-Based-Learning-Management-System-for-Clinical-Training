import express from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

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
    const { full_name, tc, phone, birth_date } = req.body;
    if (!full_name || !tc || !phone || !birth_date) {
      return res.status(400).json({ message: "full_name, tc, phone, birth_date are required" });
    }

    const result = await query(
      `insert into patients (full_name, tc, phone, birth_date)
       values ($1, $2, $3, $4)
       returning *`,
      [full_name, tc, phone, birth_date]
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
    const result = await query("select * from patients where id = $1", [req.params.id]);
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
    const { full_name, tc, phone, birth_date } = req.body;
    if (!full_name || !tc || !phone || !birth_date) {
      return res.status(400).json({ message: "full_name, tc, phone, birth_date are required" });
    }

    const result = await query(
      `update patients
       set full_name = $1, tc = $2, phone = $3, birth_date = $4
       where id = $5
       returning *`,
      [full_name, tc, phone, birth_date, req.params.id]
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
    const result = await query("delete from patients where id = $1 returning id", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json({ message: "Patient deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

