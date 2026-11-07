import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function Login() {
  const { session, login } = useAuth();
  const { db } = useData();
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  if (session) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/hosteller'} replace />;
  }

  const changeRole = (nextRole) => {
    setRole(nextRole);
    setForm({ username: '', password: '' });
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login({ role, username: form.username, password: form.password });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(result.session.role === 'admin' ? '/admin' : '/hosteller', { replace: true });
  };

  const demoHostellers = db.hostellers.filter((hosteller) => hosteller.active).slice(0, 3);

  return (
    <div className="login-page">
      <section className="login-hero">
        <div>
          <span className="brand-mark">HM</span>
          <h1>Hostel management, without the paperwork.</h1>
          <p className="lead">
            Track hostellers, in and out movements, weekly meals and rent reminders from one clean
            dashboard.
          </p>
          <ul className="login-features">
            <li>Live inside/outside status for every hosteller</li>
            <li>Weekly food poll with automatic meal counts</li>
            <li>Rent, advance deposits and washing machine subscriptions</li>
            <li>A separate personal dashboard for each hosteller</li>
          </ul>
        </div>
        <p className="login-hero-foot">
          Phase 1 demo · All records are stored in this browser using LocalStorage.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-box">
          <h2>Sign in</h2>
          <p className="login-sub">Choose your portal and enter your credentials.</p>

          <div className="login-tabs" role="tablist" aria-label="Login type">
            <button
              type="button"
              role="tab"
              aria-selected={role === 'admin'}
              className={`login-tab${role === 'admin' ? ' active' : ''}`}
              onClick={() => changeRole('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'hosteller'}
              className={`login-tab${role === 'hosteller' ? ' active' : ''}`}
              onClick={() => changeRole('hosteller')}
            >
              Hosteller
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div className="banner banner-danger" role="alert">
                <p>{error}</p>
              </div>
            ) : null}

            <Field label="Username" htmlFor="login-username" required>
              <Input
                id="login-username"
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder={role === 'admin' ? 'admin' : 'your.username'}
              />
            </Field>

            <Field label="Password" htmlFor="login-password" required>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Enter your password"
              />
            </Field>

            <Button type="submit" block>
              Sign in to {role === 'admin' ? 'admin dashboard' : 'my dashboard'}
            </Button>
          </form>

          <div className="demo-box">
            <strong>Demo credentials</strong>
            {role === 'admin' ? (
              <p>
                Admin: <code>admin</code> / <code>admin123</code>
              </p>
            ) : demoHostellers.length ? (
              <ul>
                {demoHostellers.map((hosteller) => (
                  <li key={hosteller.id}>
                    <code>{hosteller.username}</code> / <code>{hosteller.password}</code> —{' '}
                    {hosteller.fullName}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hosteller accounts yet. Ask the admin to add one.</p>
            )}
            <p>
              Inactive accounts cannot sign in. Admin-created hostellers use the credentials set when
              their profile was added.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
