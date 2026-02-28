import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "../api";

function toDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const now = new Date();
const defaultDate = toDateISO(now);
const defaultDateTime = `${defaultDate}T09:00`;

export default function AppointmentsPage() {
  const user = getUser();
  const canCreate = useMemo(() => ["admin", "receptionist"].includes(user?.role), [user]);
  const [date, setDate] = useState(defaultDate);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_id: "",
    doctor_id: "",
    start_time: defaultDateTime,
    status: "scheduled"
  });

  async function loadAppointments(selectedDate = date) {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAppointments(selectedDate);
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments(defaultDate);
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!canCreate) return;
    try {
      await api.createAppointment({
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        start_time: new Date(form.start_time).toISOString(),
        status: form.status
      });
      await loadAppointments(date);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Appointments by Date</h3>
        <div className="row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn" onClick={() => loadAppointments(date)}>Load</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Create Appointment</h3>
        <form className="grid-form" onSubmit={onCreate}>
          <input
            type="number"
            placeholder="Patient ID"
            value={form.patient_id}
            onChange={(e) => setForm((prev) => ({ ...prev, patient_id: e.target.value }))}
            required
            disabled={!canCreate}
          />
          <input
            type="number"
            placeholder="Doctor ID"
            value={form.doctor_id}
            onChange={(e) => setForm((prev) => ({ ...prev, doctor_id: e.target.value }))}
            required
            disabled={!canCreate}
          />
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            required
            disabled={!canCreate}
          />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            disabled={!canCreate}
          >
            <option value="scheduled">scheduled</option>
            <option value="cancelled">cancelled</option>
            <option value="arrived">arrived</option>
            <option value="no_show">no_show</option>
          </select>
          <button className="btn" disabled={!canCreate}>Create</button>
        </form>
      </div>

      <div className="card">
        <h3>Appointment List</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{new Date(item.start_time).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={5}>No appointments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

