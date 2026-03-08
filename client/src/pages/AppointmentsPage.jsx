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
const emptyFilters = { date: defaultDate, doctor_id: "", status: "", search: "" };

export default function AppointmentsPage() {
  const user = getUser();
  const canManage = useMemo(() => ["admin", "receptionist"].includes(user?.role), [user]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [form, setForm] = useState({
    patient_id: "",
    doctor_id: "",
    start_time: defaultDateTime,
    status: "scheduled"
  });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    patient_id: "",
    doctor_id: "",
    start_time: defaultDateTime,
    status: "scheduled"
  });
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyActionId, setBusyActionId] = useState(null);
  const nowMs = Date.now();

  function isPendingStatusUpdate(item) {
    return item.status === "scheduled" && new Date(item.start_time).getTime() < nowMs;
  }

  async function loadAppointments(activeFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAppointments(activeFilters);
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const doctorsData = await api.getDoctors();
        setDoctors(doctorsData);
      } catch (err) {
        setError(err.message);
      }
      await loadAppointments(emptyFilters);
    }
    init();
  }, []);

  function validatePayload(payload) {
    const patientId = Number(payload.patient_id);
    const doctorId = Number(payload.doctor_id);
    const startTime = new Date(payload.start_time);

    if (!payload.patient_id || !payload.doctor_id || !payload.start_time) {
      return "Patient ID, doctor and start time are required";
    }
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return "Patient ID must be a positive number";
    }
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return "Please select a valid doctor";
    }
    if (Number.isNaN(startTime.getTime())) {
      return "Start time is invalid";
    }
    if (startTime.getTime() < Date.now() - 60000) {
      return "Appointment date/time cannot be in the past";
    }
    return "";
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!canManage) return;
    setError("");
    setSuccess("");
    const validationError = validatePayload(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    try {
      await api.createAppointment({
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        start_time: new Date(form.start_time).toISOString(),
        status: form.status
      });
      setSuccess("Appointment created");
      await loadAppointments(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(item) {
    setEditing(item);
    setEditForm({
      patient_id: String(item.patient_id),
      doctor_id: String(item.doctor_id),
      start_time: new Date(item.start_time).toISOString().slice(0, 16),
      status: item.status
    });
    setError("");
    setSuccess("");
  }

  async function onEditSubmit(e) {
    e.preventDefault();
    if (!canManage || !editing) return;
    setError("");
    setSuccess("");
    const validationError = validatePayload(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateAppointment(editing.id, {
        patient_id: Number(editForm.patient_id),
        doctor_id: Number(editForm.doctor_id),
        start_time: new Date(editForm.start_time).toISOString(),
        status: editForm.status
      });
      setSuccess("Appointment updated");
      setEditing(null);
      await loadAppointments(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function onCancelAppointment(id) {
    if (!canManage) return;
    if (!window.confirm("Cancel this appointment?")) return;
    setError("");
    setSuccess("");
    setBusyActionId(id);
    try {
      await api.cancelAppointment(id);
      setSuccess("Appointment cancelled");
      await loadAppointments(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyActionId(null);
    }
  }

  async function onStatusChange(id, status) {
    setError("");
    setSuccess("");
    setBusyActionId(id);
    try {
      await api.updateAppointmentStatus(id, status);
      setSuccess("Appointment status updated");
      await loadAppointments(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyActionId(null);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Filters</h3>
        <div className="grid-form">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
          />
          <select
            value={filters.doctor_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, doctor_id: e.target.value }))}
          >
            <option value="">All doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} (#{doc.id})
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="scheduled">scheduled</option>
            <option value="arrived">arrived</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
          <input
            placeholder="Search patient or doctor"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <button className="btn" onClick={() => loadAppointments(filters)} disabled={loading}>Apply Filters</button>
          <button
            className="btn btn-muted"
            disabled={loading}
            onClick={() => {
              setFilters(emptyFilters);
              loadAppointments(emptyFilters);
            }}
          >
            Reset
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
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
            disabled={!canManage}
          />
          <select
            value={form.doctor_id}
            onChange={(e) => setForm((prev) => ({ ...prev, doctor_id: e.target.value }))}
            required
            disabled={!canManage}
          >
            <option value="">Select doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} (#{doc.id})
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            required
            disabled={!canManage}
          />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            disabled={!canManage}
          >
            <option value="scheduled">scheduled</option>
            <option value="arrived">arrived</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
          <button className="btn" disabled={!canManage || creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      {editing && (
        <div className="card">
          <h3>Edit Appointment #{editing.id}</h3>
          <form className="grid-form" onSubmit={onEditSubmit}>
            <input
              type="number"
              placeholder="Patient ID"
              value={editForm.patient_id}
              onChange={(e) => setEditForm((prev) => ({ ...prev, patient_id: e.target.value }))}
              required
            />
            <select
              value={editForm.doctor_id}
              onChange={(e) => setEditForm((prev) => ({ ...prev, doctor_id: e.target.value }))}
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} (#{doc.id})
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={editForm.start_time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
              required
            />
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="scheduled">scheduled</option>
              <option value="arrived">arrived</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
            </select>
            <button className="btn" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</button>
            <button
              type="button"
              className="btn btn-muted"
              disabled={savingEdit}
              onClick={() => setEditing(null)}
            >
              Close
            </button>
          </form>
        </div>
      )}

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id} className={isPendingStatusUpdate(item) ? "row-pending-status" : ""}>
                  <td>{item.id}</td>
                  <td>{new Date(item.start_time).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td>
                    <span className={`status-chip status-${item.status}`}>{item.status}</span>
                    {isPendingStatusUpdate(item) && (
                      <span className="status-chip status-pending-update">pending status update</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={item.status}
                      disabled={busyActionId === item.id}
                      onChange={(e) => onStatusChange(item.id, e.target.value)}
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="arrived">arrived</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="no_show">no_show</option>
                    </select>
                    {canManage && (
                      <>
                        <button className="btn btn-small" onClick={() => startEdit(item)}>Edit</button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => onCancelAppointment(item.id)}
                          disabled={item.status === "cancelled" || busyActionId === item.id}
                        >
                          {busyActionId === item.id ? "Working..." : "Cancel"}
                        </button>
                        {isPendingStatusUpdate(item) && (
                          <>
                            <button
                              className="btn btn-small"
                              onClick={() => onStatusChange(item.id, "completed")}
                              disabled={busyActionId === item.id}
                            >
                              Mark Completed
                            </button>
                            <button
                              className="btn btn-small btn-muted"
                              onClick={() => onStatusChange(item.id, "no_show")}
                              disabled={busyActionId === item.id}
                            >
                              Mark No-show
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6}>No appointments scheduled.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
