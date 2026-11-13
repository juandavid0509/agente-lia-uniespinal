import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SolicitudDetalle from './pages/SolicitudDetalle';
import Register from './pages/Register';
import LoginModal from './components/LoginModal';

// Exige rol de administrador: protege las rutas del panel administrativo.
function RequireAdmin({ children }: { children: ReactElement }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function App() {
  const { user } = useStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <Routes>
          {/* Raíz: login si no hay sesión; admin → panel; estudiante → chat */}
          <Route
            path="/"
            element={
              !user ? (
                <LoginModal />
              ) : user.role === 'ADMIN' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Dashboard />
              )
            }
          />

          {/* Panel administrativo (solo ADMIN) */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/solicitudes/:id"
            element={
              <RequireAdmin>
                <SolicitudDetalle />
              </RequireAdmin>
            }
          />

          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
