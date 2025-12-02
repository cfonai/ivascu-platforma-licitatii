import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RFQsPage from './pages/RFQsPage';
import RFQDetailPage from './pages/RFQDetailPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ArchivePage from './pages/ArchivePage';
import SupplierMapPage from './features/SupplierMap/SupplierMapPage';
import AutoRejectedRFQsPage from './pages/AutoRejectedRFQsPage';
import StatisticsPage from './pages/StatisticsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs"
            element={
              <ProtectedRoute>
                <RFQsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs/:id"
            element={
              <ProtectedRoute>
                <RFQDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/archive"
            element={
              <ProtectedRoute>
                <ArchivePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier-map"
            element={
              <ProtectedRoute>
                <SupplierMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/oferte-respinse"
            element={
              <ProtectedRoute>
                <AutoRejectedRFQsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
