import { Outlet } from 'react-router-dom';
import AppLayout from './AppLayout';

const nav = [
  { to: '/hosteller', label: 'Dashboard', end: true },
  { to: '/hosteller/food', label: 'Weekly Food Poll' },
  { to: '/hosteller/rent', label: 'Rent & Payments' },
  { to: '/hosteller/outings', label: 'My Outings' },
];

export default function HostellerLayout() {
  return (
    <AppLayout nav={nav} portalLabel="Hosteller Portal">
      <Outlet />
    </AppLayout>
  );
}
