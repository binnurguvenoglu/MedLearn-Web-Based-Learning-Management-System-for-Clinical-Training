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
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [counts, setCounts] = useState({
    totalToday: 0,
    scheduled: 0,
    arrived: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const date = todayISO();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [today, upcoming] = await Promise.all([
          api.getAppointments({ date }),
          api.getAppointments({ date_from: date })
        ]);
        if (!active) return;

        const nextFive = upcoming
          .filter((item) => new Date(item.start_time) >= new Date())
          .slice(0, 5);

        const statusCounts = today.reduce(
          (acc, item) => {
            acc.totalToday += 1;
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
          },
          { totalToday: 0, scheduled: 0, arrived: 0, completed: 0, cancelled: 0, no_show: 0 }
        );

        setTodayAppointments(today);
        setUpcomingAppointments(nextFive);
        setCounts(statusCounts);
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
          <h3>Total Today</h3>
          <p>{counts.totalToday}</p>
        </div>
        <div className="card stat-card">
          <h3>Scheduled</h3>
          <p>{counts.scheduled}</p>
        </div>
        <div className="card stat-card">
          <h3>Completed</h3>
          <p>{counts.completed}</p>
        </div>
      </div>

      <div className="card">
        <h3>Today's Appointments</h3>
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && todayAppointments.length === 0 && <p>No appointments today.</p>}
        {!loading && todayAppointments.length > 0 && (
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
              {todayAppointments.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.start_time).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td><span className={`status-chip status-${item.status}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Upcoming Appointments</h3>
        {!loading && upcomingAppointments.length === 0 && <p>No upcoming appointments.</p>}
        {!loading && upcomingAppointments.length > 0 && (
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
              {upcomingAppointments.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.start_time).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td><span className={`status-chip status-${item.status}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
