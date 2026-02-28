import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "../api";

const emptyForm = { full_name: "", tc: "", phone: "", birth_date: "" };

export default function PatientsPage() {
  const user = getUser();
  const canEdit = useMemo(() => ["admin", "receptionist"].includes(user?.role), [user]);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function loadPatients(value = search) {
    setLoading(true);
    setError("");
    try {
      const data = await api.getPatients(value);
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients("");
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    try {
      if (editingId) {
        await api.updatePatient(editingId, form);
      } else {
        await api.createPatient(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadPatients();
    } catch (err) {
      setError(err.message);
    }
  }

  function onEdit(item) {
    setEditingId(item.id);
    setForm({
      full_name: item.full_name,
      tc: item.tc,
      phone: item.phone,
      birth_date: String(item.birth_date).slice(0, 10)
    });
  }

  async function onDelete(id) {
    if (!canEdit) return;
    if (!window.confirm("Delete this patient?")) return;
    try {
      await api.deletePatient(id);
      await loadPatients();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Search Patients</h3>
        <div className="row">
          <input
            placeholder="Search by name / tc / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" onClick={() => loadPatients(search)}>Search</button>
          <button className="btn btn-muted" onClick={() => { setSearch(""); loadPatients(""); }}>Clear</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>{editingId ? "Edit Patient" : "Add Patient"}</h3>
        <form onSubmit={onSubmit} className="grid-form">
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            required
            disabled={!canEdit}
          />
          <input
            placeholder="TC"
            value={form.tc}
            onChange={(e) => setForm((prev) => ({ ...prev, tc: e.target.value }))}
            required
            disabled={!canEdit}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            required
            disabled={!canEdit}
          />
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
            required
            disabled={!canEdit}
          />
          <button className="btn" disabled={!canEdit}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-muted"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Patient List</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>TC</th>
                <th>Phone</th>
                <th>Birth Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.full_name}</td>
                  <td>{item.tc}</td>
                  <td>{item.phone}</td>
                  <td>{String(item.birth_date).slice(0, 10)}</td>
                  <td>
                    <button className="btn btn-small" onClick={() => onEdit(item)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={6}>No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

