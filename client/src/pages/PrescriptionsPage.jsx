import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "../api";

export default function PrescriptionsPage() {
  const user = getUser();
  const canCreate = useMemo(() => user?.role === "doctor", [user]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    appointment_id: "",
    medication: "",
    dosage: "",
    notes: ""
  });

  async function loadPatients() {
    try {
      const data = await api.getPatients("");
      setPatients(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadPrescriptions(patientId = selectedPatientId) {
    if (!patientId) {
      setPrescriptions([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.getPrescriptions(patientId);
      setPrescriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setError("");
    setSuccess("");

    const patientId = Number(form.patient_id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      setError("Please select a valid patient.");
      return;
    }
    if (!form.medication.trim()) {
      setError("Medication is required.");
      return;
    }
    if (!form.dosage.trim()) {
      setError("Dosage is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createPrescription({
        patient_id: patientId,
        appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
        medication: form.medication.trim(),
        dosage: form.dosage.trim(),
        notes: form.notes.trim()
      });
      setSuccess("Prescription created successfully.");
      const createdPatientId = String(patientId);
      setSelectedPatientId(createdPatientId);
      setForm({
        patient_id: createdPatientId,
        appointment_id: "",
        medication: "",
        dosage: "",
        notes: ""
      });
      await loadPrescriptions(createdPatientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      {canCreate && (
        <div className="card">
          <h3>Create Prescription</h3>
          <form className="grid-form" onSubmit={onSubmit}>
            <select
              value={form.patient_id}
              onChange={(e) => setForm((prev) => ({ ...prev, patient_id: e.target.value }))}
              required
              disabled={submitting}
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} (#{patient.id})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Appointment ID (optional)"
              value={form.appointment_id}
              onChange={(e) => setForm((prev) => ({ ...prev, appointment_id: e.target.value }))}
              disabled={submitting}
            />
            <input
              placeholder="Medication"
              value={form.medication}
              onChange={(e) => setForm((prev) => ({ ...prev, medication: e.target.value }))}
              required
              disabled={submitting}
            />
            <input
              placeholder="Dosage instructions"
              value={form.dosage}
              onChange={(e) => setForm((prev) => ({ ...prev, dosage: e.target.value }))}
              required
              disabled={submitting}
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={submitting}
            />
            <button className="btn" disabled={submitting}>
              {submitting ? "Saving..." : "Save Prescription"}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </div>
      )}

      <div className="card">
        <h3>Prescription History</h3>
        <div className="row">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">Select patient for history</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name} (#{patient.id})
              </option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => loadPrescriptions(selectedPatientId)}
            disabled={!selectedPatientId || loading}
          >
            {loading ? "Loading..." : "Load History"}
          </button>
        </div>

        {!selectedPatientId && <p>Select a patient to view prescription history.</p>}
        {selectedPatientId && !loading && prescriptions.length === 0 && (
          <p>No prescriptions found for this patient.</p>
        )}

        {selectedPatientId && prescriptions.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.doctor_name}</td>
                  <td>{item.medication}</td>
                  <td>{item.dosage}</td>
                  <td>{item.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

