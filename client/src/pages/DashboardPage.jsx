import { useEffect, useState } from "react";
import { api } from "../api";

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    total_patients: 0,
    total_doctors: 0,
    total_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0,
    today_appointments: 0,
    upcoming_appointments: 0
  });
  const [groupedByStatus, setGroupedByStatus] = useState({
    scheduled: 0,
    arrived: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getDashboardSummary();
        if (!active) return;
        setSummary(data.summary || {});
        setGroupedByStatus(data.grouped_by_status || {});
        setRecentAppointments(data.recent_appointments || []);
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
  }, []);

  return (
    <div>
      <div className="grid">
        <div className="card stat-card">
          <h3>Total Patients</h3>
          <p>{summary.total_patients}</p>
        </div>
        <div className="card stat-card">
          <h3>Total Doctors</h3>
          <p>{summary.total_doctors}</p>
        </div>
        <div className="card stat-card">
          <h3>Total Appointments</h3>
          <p>{summary.total_appointments}</p>
        </div>
        <div className="card stat-card">
          <h3>Completed</h3>
          <p>{summary.completed_appointments}</p>
        </div>
        <div className="card stat-card">
          <h3>Cancelled</h3>
          <p>{summary.cancelled_appointments}</p>
        </div>
        <div className="card stat-card">
          <h3>Today</h3>
          <p>{summary.today_appointments}</p>
        </div>
        <div className="card stat-card">
          <h3>Upcoming</h3>
          <p>{summary.upcoming_appointments}</p>
        </div>
      </div>

      {loading && <div className="card"><p>Loading...</p></div>}
      {error && <div className="card"><p className="error">{error}</p></div>}

      {!loading && !error && (
        <>
          <div className="card">
            <h3>Appointment Status Overview</h3>
            <div className="row">
              <span className="status-chip status-scheduled">scheduled: {groupedByStatus.scheduled || 0}</span>
              <span className="status-chip status-arrived">arrived: {groupedByStatus.arrived || 0}</span>
              <span className="status-chip status-completed">completed: {groupedByStatus.completed || 0}</span>
              <span className="status-chip status-cancelled">cancelled: {groupedByStatus.cancelled || 0}</span>
              <span className="status-chip status-no_show">no_show: {groupedByStatus.no_show || 0}</span>
            </div>
          </div>

          <div className="card">
            <h3>Recent Appointments</h3>
            {recentAppointments.length === 0 ? (
              <p>No recent appointments.</p>
            ) : (
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
                  {recentAppointments.map((item) => (
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
        </>
      )}
    </div>
  );
}
