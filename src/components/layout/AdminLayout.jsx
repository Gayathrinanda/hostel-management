import { Outlet } from 'react-router-dom';
import AppLayout from './AppLayout';

const nav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/hostellers', label: 'Hosteller Management' },
  { to: '/admin/tracking', label: 'In/Out Tracking' },
  { to: '/admin/food', label: 'Food Management' },
  { to: '/admin/rent', label: 'Rent Management' },
  { to: '/admin/notifications', label: 'Notifications', notifications: true },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  return (
    <AppLayout nav={nav} portalLabel="Admin Console" showNotifications>
      <Outlet />
    </AppLayout>
  );
}
