import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { toDateInput } from '../../lib/dates';
import { advanceBalance } from '../../lib/rent';
import { validateHosteller } from '../../lib/validation';

const ID_TYPES = ['Aadhaar Card', 'Passport', 'Driving Licence', 'Voter ID', 'PAN Card', 'Other'];
const MAX_UPLOAD_BYTES = 400 * 1024;
const ALLOWED_UPLOAD_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
];

function makeBlankValues() {
  return {
    fullName: '',
    phone: '',
    email: '',
    joinDate: toDateInput(new Date()),
    emergencyContact: '',
    idType: 'Aadhaar Card',
    idNumber: '',
    idProof: null,
    roomNumber: '',
    bedNumber: '',
    monthlyRent: '',
    advanceDeposit: '',
    rentDueDay: '10',
    washingEnabled: false,
    washingAmount: '',
    washingStartDate: '',
    username: '',
    password: '',
  };
}

export default function HostellerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { db, addHosteller, updateHosteller } = useData();
  const toast = useToast();
  const existing = isEdit ? db.hostellers.find((hosteller) => hosteller.id === id) : null;

  const makeValues = () => {
    if (!existing) return makeBlankValues();
    return {
      ...makeBlankValues(),
      fullName: existing.fullName,
      phone: existing.phone,
      email: existing.email,
      joinDate: existing.joinDate,
      emergencyContact: existing.emergencyContact,
      idType: existing.idType,
      idNumber: existing.idNumber,
      idProof: existing.idProof || null,
      roomNumber: existing.roomNumber,
      bedNumber: existing.bedNumber,
      monthlyRent: String(existing.monthlyRent),
      rentDueDay: String(existing.rentDueDay),
      advanceDeposit: String(advanceBalance(existing.id, db.advancePayments)),
      washingEnabled: Boolean(existing.washingMachine?.enabled),
      washingAmount: existing.washingMachine?.amount
        ? String(existing.washingMachine.amount)
        : '',
      washingStartDate: existing.washingMachine?.startDate || '',
      username: existing.username,
      password: '',
    };
  };

  const [values, setValues] = useState(makeValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues(makeValues());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        idProof: 'Upload an image (PNG, JPG, WEBP, GIF) or a PDF file.',
      }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrors((current) => ({
        ...current,
        idProof: 'File is larger than 400 KB. Compress the document and try again.',
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValues((current) => ({
        ...current,
        idProof: { name: file.name, type: file.type, dataUrl: String(reader.result) },
      }));
      setErrors((current) => ({ ...current, idProof: undefined }));
    };
    reader.onerror = () => {
      setErrors((current) => ({ ...current, idProof: 'Could not read that file. Please try again.' }));
    };
    reader.readAsDataURL(file);
  };

  if (isEdit && !existing) {
    return (
      <>
        <PageHeader title="Hosteller not found" backTo="/admin/hostellers" backLabel="All hostellers" />
        <Card>
          <EmptyState
            title="This profile is unavailable"
            message="The hosteller record could not be found. It may have been replaced when demo data was reset."
            action={
              <Link className="btn btn-primary btn-sm" to="/admin/hostellers">
                Back to hostellers
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateHosteller(values, {
      hostellers: db.hostellers,
      admins: db.admins,
      hostellerId: existing?.id,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please correct the highlighted fields before saving.');
      return;
    }

    const result = isEdit ? updateHosteller(existing.id, values) : addHosteller(values);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(
      isEdit
        ? 'Hosteller details updated across the dashboard, rent and tracking pages.'
        : `${values.fullName.trim()} was added. Login username: ${values.username.trim()}.`,
    );
    navigate(
      isEdit ? `/admin/hostellers/${existing.id}` : `/admin/hostellers/${result.hosteller.id}`,
    );
  };

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit ${existing.fullName}` : 'Add hosteller'}
        subtitle={
          isEdit
            ? 'Changes update the hosteller list, rent records and the hosteller dashboard immediately.'
            : 'Create the profile, rent setup and login credentials for a new hosteller.'
        }
        backTo={isEdit ? `/admin/hostellers/${id}` : '/admin/hostellers'}
        backLabel={isEdit ? 'Back to profile' : 'All hostellers'}
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <section className="form-section">
            <h2 className="form-section-title">Personal information</h2>
            <div className="form-grid">
              <Field label="Full name" htmlFor="fullName" required error={errors.fullName}>
                <Input
                  id="fullName"
                  value={values.fullName}
                  error={errors.fullName}
                  onChange={(event) => setField('fullName', event.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </Field>
              <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
                <Input
                  id="phone"
                  value={values.phone}
                  error={errors.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  placeholder="10-digit mobile number"
                  inputMode="tel"
                />
              </Field>
              <Field label="Email address" htmlFor="email" required error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  error={errors.email}
                  onChange={(event) => setField('email', event.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
              <Field label="Date of joining" htmlFor="joinDate" required error={errors.joinDate}>
                <Input
                  id="joinDate"
                  type="date"
                  max={toDateInput(new Date())}
                  value={values.joinDate}
                  error={errors.joinDate}
                  onChange={(event) => setField('joinDate', event.target.value)}
                />
              </Field>
              <Field
                label="Emergency contact"
                htmlFor="emergencyContact"
                required
                error={errors.emergencyContact}
                hint="Include the contact's name, relationship and phone number."
                className="field-span-2"
              >
                <Input
                  id="emergencyContact"
                  value={values.emergencyContact}
                  error={errors.emergencyContact}
                  onChange={(event) => setField('emergencyContact', event.target.value)}
                  placeholder="e.g. Sunita Sharma (Mother) · 98123 45670"
                />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <h2 className="form-section-title">Identity documents</h2>
            <div className="form-grid">
              <Field label="Government ID type" htmlFor="idType" required error={errors.idType}>
                <Select
                  id="idType"
                  value={values.idType}
                  error={errors.idType}
                  onChange={(event) => setField('idType', event.target.value)}
                >
                  {ID_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ID number" htmlFor="idNumber" required error={errors.idNumber}>
                <Input
                  id="idNumber"
                  value={values.idNumber}
                  error={errors.idNumber}
                  onChange={(event) => setField('idNumber', event.target.value)}
                  placeholder="Enter the document number"
                />
              </Field>
            </div>

            <div className="form-grid" style={{ marginTop: 16 }}>
              <Field
                label="Upload ID proof"
                htmlFor="idProof"
                error={errors.idProof}
                hint="Images or PDF up to 400 KB. Documents are only visible to the admin."
              >
                <input
                  id="idProof"
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
                  onChange={handleFile}
                />
              </Field>
              <div>
                {values.idProof ? (
                  <div>
                    <div className="doc-frame">
                      {values.idProof.type === 'application/pdf' ? (
                        <iframe src={values.idProof.dataUrl} title="ID proof preview" />
                      ) : (
                        <img src={values.idProof.dataUrl} alt="Uploaded ID proof preview" />
                      )}
                    </div>
                    <div className="upload-row" style={{ marginTop: 8 }}>
                      <span className="small muted">{values.idProof.name}</span>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setField('idProof', null)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="doc-frame">
                    <p className="doc-empty">No document uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2 className="form-section-title">Hostel information</h2>
            <div className="form-grid-3">
              <Field label="Room number" htmlFor="roomNumber" required error={errors.roomNumber}>
                <Input
                  id="roomNumber"
                  value={values.roomNumber}
                  error={errors.roomNumber}
                  onChange={(event) => setField('roomNumber', event.target.value)}
                  placeholder="e.g. 101"
                />
              </Field>
              <Field label="Bed number" htmlFor="bedNumber" required error={errors.bedNumber}>
                <Input
                  id="bedNumber"
                  value={values.bedNumber}
                  error={errors.bedNumber}
                  onChange={(event) => setField('bedNumber', event.target.value)}
                  placeholder="e.g. 2"
                />
              </Field>
              <Field
                label="Monthly rent (₹)"
                htmlFor="monthlyRent"
                required
                error={errors.monthlyRent}
              >
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="1"
                  value={values.monthlyRent}
                  error={errors.monthlyRent}
                  onChange={(event) => setField('monthlyRent', event.target.value)}
                  placeholder="e.g. 6500"
                />
              </Field>
              <Field
                label="Advance / security deposit (₹)"
                htmlFor="advanceDeposit"
                required={!isEdit}
                error={errors.advanceDeposit}
                hint={
                  isEdit
                    ? 'Advances are updated from the profile ledger so rent and deposit stay separate.'
                    : 'Recorded separately from rent in the advance ledger.'
                }
              >
                <Input
                  id="advanceDeposit"
                  type="number"
                  min="0"
                  step="1"
                  value={values.advanceDeposit}
                  error={errors.advanceDeposit}
                  onChange={(event) => setField('advanceDeposit', event.target.value)}
                  placeholder="e.g. 10000"
                  disabled={isEdit}
                  readOnly={isEdit}
                />
              </Field>
              <Field
                label="Rent due day"
                htmlFor="rentDueDay"
                required
                error={errors.rentDueDay}
                hint="Rent reminders follow this day each month."
              >
                <Select
                  id="rentDueDay"
                  value={values.rentDueDay}
                  error={errors.rentDueDay}
                  onChange={(event) => setField('rentDueDay', event.target.value)}
                >
                  {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={String(day)}>
                      {day}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <section className="form-section">
            <h2 className="form-section-title">Additional services</h2>
            <Checkbox
              label="Washing machine subscription"
              description="Track a simple monthly subscription fee for the washing machine."
              checked={values.washingEnabled}
              onChange={(event) => setField('washingEnabled', event.target.checked)}
            />
            {values.washingEnabled ? (
              <div className="form-grid" style={{ marginTop: 14 }}>
                <Field
                  label="Subscription amount (₹ / month)"
                  htmlFor="washingAmount"
                  required
                  error={errors.washingAmount}
                >
                  <Input
                    id="washingAmount"
                    type="number"
                    min="0"
                    step="1"
                    value={values.washingAmount}
                    error={errors.washingAmount}
                    onChange={(event) => setField('washingAmount', event.target.value)}
                    placeholder="e.g. 300"
                  />
                </Field>
                <Field
                  label="Subscription start date"
                  htmlFor="washingStartDate"
                  required
                  error={errors.washingStartDate}
                >
                  <Input
                    id="washingStartDate"
                    type="date"
                    value={values.washingStartDate}
                    error={errors.washingStartDate}
                    onChange={(event) => setField('washingStartDate', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </section>

          <section className="form-section">
            <h2 className="form-section-title">Account information</h2>
            <div className="form-grid">
              <Field
                label="Username"
                htmlFor="username"
                required
                error={errors.username}
                hint="4–20 letters, numbers, dots or underscores. Must be unique."
              >
                <Input
                  id="username"
                  autoComplete="off"
                  value={values.username}
                  error={errors.username}
                  onChange={(event) => setField('username', event.target.value)}
                  placeholder="e.g. rahul"
                />
              </Field>
              <Field
                label={isEdit ? 'New password' : 'Password'}
                htmlFor="password"
                required={!isEdit}
                error={errors.password}
                hint={isEdit ? 'Leave blank to keep the current password.' : 'At least 6 characters.'}
              >
                <Input
                  id="password"
                  type="text"
                  autoComplete="new-password"
                  value={values.password}
                  error={errors.password}
                  onChange={(event) => setField('password', event.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Create a password'}
                />
              </Field>
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              The hosteller signs in from the Hosteller tab on the login page. Passwords are stored in
              LocalStorage for this phase 1 demo only.
            </p>
          </section>

          <div className="form-actions">
            <Link
              className="btn btn-secondary"
              to={isEdit ? `/admin/hostellers/${id}` : '/admin/hostellers'}
            >
              Cancel
            </Link>
            <Button type="submit">{isEdit ? 'Save changes' : 'Save hosteller'}</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
