import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role }) {
  const { session, user } = useAuth();

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }
  if (role && session.role !== role) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/hosteller'} replace />;
  }
  return <Outlet />;
}
