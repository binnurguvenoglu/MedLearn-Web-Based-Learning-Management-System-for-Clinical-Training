import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "receptionist"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.register(form);
      setSuccess("User created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-hero">
          <p className="auth-chip">Private Clinic Suite</p>
          <h1>Create a secure user for your clinic team.</h1>
          <p>
            Add admin, receptionist, or doctor users and continue managing appointments
            and patients from the same dashboard.
          </p>
          <div className="auth-metrics">
            <article>
              <strong>Role based</strong>
              <span>Admin, receptionist, doctor access</span>
            </article>
            <article>
              <strong>Simple</strong>
              <span>Quick registration for clinic staff</span>
            </article>
            <article>
              <strong>Integrated</strong>
              <span>Works with the current login flow</span>
            </article>
          </div>
        </section>

        <form className="card auth-card" onSubmit={onSubmit}>
          <p className="auth-form-kicker">New account</p>
          <h2>Register Clinic User</h2>

          <label>Full Name</label>
          <input
            type="text"
            placeholder="Dr. Jane Doe"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="name@clinic.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Minimum 6 characters"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />

          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option value="admin">admin</option>
            <option value="receptionist">receptionist</option>
            <option value="doctor">doctor</option>
          </select>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button className="btn auth-submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

