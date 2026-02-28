import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      setSession(data.token, data.user);
      navigate("/dashboard");
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
          <h1>Better patient flow starts with one secure dashboard.</h1>
          <p>
            Manage patients, daily appointments, and front-desk operations from a clean
            and role-based clinical panel.
          </p>
          <div className="auth-metrics">
            <article>
              <strong>Fast</strong>
              <span>Quick appointment check-ins</span>
            </article>
            <article>
              <strong>Secure</strong>
              <span>JWT-based protected access</span>
            </article>
            <article>
              <strong>Reliable</strong>
              <span>Conflict-safe scheduling flow</span>
            </article>
          </div>
        </section>

        <form className="card auth-card" onSubmit={onSubmit}>
          <p className="auth-form-kicker">Welcome back</p>
          <h2>Sign in to Clinic Manager</h2>

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
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />

          {error && <p className="error">{error}</p>}
          <button className="btn auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
          <p className="auth-switch">
            No account yet? <Link to="/register">Create account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
