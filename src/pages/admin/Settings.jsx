import { useState } from 'react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { downloadBackup } from '../../services/database';
import { STORAGE_KEYS } from '../../services/storage';
import { formatDate } from '../../lib/dates';
import { isValidPassword, isValidUsername } from '../../lib/validation';

export default function Settings() {
  const { db, updateAdmin, resetDemoData } = useData();
  const { user } = useAuth();
  const toast = useToast();

  const [account, setAccount] = useState({
    name: user?.name || '',
    username: user?.username || '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [resetOpen, setResetOpen] = useState(false);

  const saveAccount = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!account.name.trim() || account.name.trim().length < 3) {
      nextErrors.name = 'Enter a display name (at least 3 characters).';
    }
    if (!isValidUsername(account.username)) {
      nextErrors.username = 'Use 4–20 letters, numbers, dots or underscores.';
    }
    if (account.currentPassword !== user.password) {
      nextErrors.currentPassword = 'Enter your current password to save changes.';
    }
    if (account.password) {
      if (!isValidPassword(account.password)) {
        nextErrors.password = 'New password must be at least 6 characters.';
      } else if (account.password !== account.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = updateAdmin(user.id, {
      name: account.name,
      username: account.username,
      password: account.password,
    });
    if (!result.ok) {
      setErrors({ username: result.message });
      return;
    }
    setAccount((current) => ({
      ...current,
      currentPassword: '',
      password: '',
      confirmPassword: '',
    }));
    toast.success('Admin account updated. Use the new credentials next time you sign in.');
  };

  const storageSize = (() => {
    try {
      return Math.round(new Blob([JSON.stringify(db)]).size / 1024);
    } catch (error) {
      return 0;
    }
  })();

  const counts = [
    ['Hostellers', db.hostellers.length],
    ['Outing records', db.outings.length],
    ['Food polls', db.foodPolls.length],
    ['Food selections', db.foodSelections.length],
    ['Rent payments', db.rentPayments.length],
    ['Advance entries', db.advancePayments.length],
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage the admin account and the LocalStorage demo database."
      />

      <div className="grid-2">
        <Card title="Admin account" subtitle="Used to sign in to this admin console">
          <form onSubmit={saveAccount} noValidate className="stack-sm">
            <Field label="Display name" htmlFor="admin-name" required error={errors.name}>
              <Input
                id="admin-name"
                value={account.name}
                error={errors.name}
                onChange={(event) => setAccount({ ...account, name: event.target.value })}
              />
            </Field>
            <Field
              label="Username"
              htmlFor="admin-username"
              required
              error={errors.username}
              hint="Must be unique across admins and hostellers."
            >
              <Input
                id="admin-username"
                value={account.username}
                error={errors.username}
                onChange={(event) => setAccount({ ...account, username: event.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field
                label="Current password"
                htmlFor="admin-current"
                required
                error={errors.currentPassword}
              >
                <Input
                  id="admin-current"
                  type="password"
                  autoComplete="current-password"
                  value={account.currentPassword}
                  error={errors.currentPassword}
                  onChange={(event) =>
                    setAccount({ ...account, currentPassword: event.target.value })
                  }
                />
              </Field>
              <Field
                label="New password"
                htmlFor="admin-password"
                error={errors.password}
                hint="Leave blank to keep the current password."
              >
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={account.password}
                  error={errors.password}
                  onChange={(event) => setAccount({ ...account, password: event.target.value })}
                />
              </Field>
              {account.password ? (
                <Field
                  label="Confirm new password"
                  htmlFor="admin-confirm"
                  required
                  error={errors.confirmPassword}
                >
                  <Input
                    id="admin-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={account.confirmPassword}
                    error={errors.confirmPassword}
                    onChange={(event) =>
                      setAccount({ ...account, confirmPassword: event.target.value })
                    }
                  />
                </Field>
              ) : null}
            </div>
            <div className="form-actions" style={{ marginTop: 4 }}>
              <Button type="submit">Save account changes</Button>
            </div>
          </form>
        </Card>

        <div className="stack">
          <Card title="Demo database" subtitle="Phase 1 data is stored in your browser">
            <dl className="info-list">
              <div className="info-row">
                <dt>Storage key</dt>
                <dd>{STORAGE_KEYS.database}</dd>
              </div>
              <div className="info-row">
                <dt>Approximate size</dt>
                <dd>{storageSize} KB</dd>
              </div>
              <div className="info-row">
                <dt>Records</dt>
                <dd>{counts.reduce((total, [, count]) => total + count, 0)}</dd>
              </div>
              {counts.map(([label, count]) => (
                <div className="info-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  downloadBackup(db);
                  toast.success('Backup downloaded as JSON.');
                }}
              >
                Download backup
              </Button>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                Reset demo data
              </Button>
            </div>
          </Card>

          <Card title="About this build">
            <div className="stack-sm small muted">
              <p style={{ margin: 0 }}>
                This is phase 1: a complete frontend with mock data. Admin and hosteller views share
                the same LocalStorage database, so changes appear everywhere immediately.
              </p>
              <p style={{ margin: 0 }}>
                Data access is isolated in the service layer, which makes it possible to replace
                LocalStorage with REST API calls in the next phase without rewriting the pages.
              </p>
              <p style={{ margin: 0 }}>
                Last seeded on {formatDate(db.meta?.seededAt || new Date().toISOString())}. Passwords
                are stored in plain text for demo purposes only.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={resetOpen}
        title="Reset demo data"
        description="This replaces all current records with the original sample hostellers, outings, polls and payments."
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setResetOpen(false);
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <div className="banner banner-danger">
          <p>
            Any hosteller profiles, payments and food selections you added will be lost. Download a
            backup first if you want to keep the records.
          </p>
        </div>
      </Modal>
    </>
  );
}
