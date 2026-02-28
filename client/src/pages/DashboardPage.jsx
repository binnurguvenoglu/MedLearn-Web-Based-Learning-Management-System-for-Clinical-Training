import { useEffect, useState } from "react";
import { api } from "../api";

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const date = todayISO();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getAppointments(date);
        if (active) setAppointments(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [date]);

  return (
    <div>
      <div className="grid">
        <div className="card stat-card">
          <h3>Today</h3>
          <p>{date}</p>
        </div>
        <div className="card stat-card">
          <h3>Appointments</h3>
          <p>{appointments.length}</p>
        </div>
      </div>

      <div className="card">
        <h3>Today's Appointments</h3>
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && appointments.length === 0 && <p>No appointments today.</p>}
        {!loading && appointments.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.start_time).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

