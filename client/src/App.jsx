import { Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import { clearSession, getUser, getToken } from "./api";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PatientsPage from "./pages/PatientsPage.jsx";
import AppointmentsPage from "./pages/AppointmentsPage.jsx";

function ProtectedLayout({ children }) {
  const token = getToken();
  const user = getUser();
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  function onLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Clinic Manager</h1>
        <div className="topbar-right">
          <span className="badge">{user?.name} ({user?.role})</span>
          <button onClick={onLogout} className="btn btn-muted">Logout</button>
        </div>
      </header>
      <nav className="nav">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/patients">Patients</Link>
        <Link to="/appointments">Appointments</Link>
      </nav>
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedLayout>
            <PatientsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedLayout>
            <AppointmentsPage />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to={getToken() ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
