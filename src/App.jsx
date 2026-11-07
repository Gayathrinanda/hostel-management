import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import HostellerLayout from './components/layout/HostellerLayout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import Hostellers from './pages/admin/Hostellers';
import HostellerFormPage from './pages/admin/HostellerFormPage';
import HostellerProfile from './pages/admin/HostellerProfile';
import InOutTracking from './pages/admin/InOutTracking';
import FoodManagement from './pages/admin/FoodManagement';
import RentManagement from './pages/admin/RentManagement';
import NotificationsPage from './pages/admin/NotificationsPage';
import Settings from './pages/admin/Settings';
import HostellerHome from './pages/hosteller/HostellerHome';
import HostellerFood from './pages/hosteller/HostellerFood';
import HostellerRent from './pages/hosteller/HostellerRent';
import HostellerOutings from './pages/hosteller/HostellerOutings';

function RootRedirect() {
  const { session, user } = useAuth();
  if (!session || !user) return <Navigate to="/login" replace />;
  return <Navigate to={session.role === 'admin' ? '/admin' : '/hosteller'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="hostellers" element={<Hostellers />} />
          <Route path="hostellers/new" element={<HostellerFormPage />} />
          <Route path="hostellers/:id" element={<HostellerProfile />} />
          <Route path="hostellers/:id/edit" element={<HostellerFormPage />} />
          <Route path="tracking" element={<InOutTracking />} />
          <Route path="food" element={<FoodManagement />} />
          <Route path="rent" element={<RentManagement />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="hosteller" />}>
        <Route path="/hosteller" element={<HostellerLayout />}>
          <Route index element={<HostellerHome />} />
          <Route path="food" element={<HostellerFood />} />
          <Route path="rent" element={<HostellerRent />} />
          <Route path="outings" element={<HostellerOutings />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
