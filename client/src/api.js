const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_KEY = "clinic_token";
const USER_KEY = "clinic_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error("Backend server'a baglanilamadi. Server calisiyor mu?");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = (data && data.message) || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getPatients: (search = "") =>
    request(`/api/patients?search=${encodeURIComponent(search)}`),
  createPatient: (payload) =>
    request("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getPatient: (id) => request(`/api/patients/${id}`),
  updatePatient: (id, payload) =>
    request(`/api/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deletePatient: (id) =>
    request(`/api/patients/${id}`, {
      method: "DELETE"
    }),
  getAppointments: (date) =>
    request(`/api/appointments?date=${encodeURIComponent(date)}`),
  createAppointment: (payload) =>
    request("/api/appointments", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
