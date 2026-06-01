import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Coupons from './pages/Coupons';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route - Login */}
            <Route path="/admin/login" element={<Login />} />

            {/* Protected routes - Require admin authentication */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to admin */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

// Admin layout with sidebar
function AdminLayout() {
  return (
    <>
      <Sidebar />
      <main className="main-content">
        <div className="dashboard-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default App;
