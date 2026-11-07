import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function HostellerStatusModal({ hosteller, onClose }) {
  const { setHostellerActive } = useData();
  const toast = useToast();

  if (!hosteller) return null;
  const deactivating = hosteller.active;

  const confirm = () => {
    setHostellerActive(hosteller.id, !hosteller.active);
    toast.success(
      deactivating
        ? `${hosteller.fullName} has been deactivated. Historical records are retained.`
        : `${hosteller.fullName} is active and can log in again.`,
    );
    onClose();
  };

  return (
    <Modal
      open
      title={deactivating ? 'Deactivate hosteller' : 'Reactivate hosteller'}
      description={`${hosteller.fullName} · Room ${hosteller.roomNumber}, bed ${hosteller.bedNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={deactivating ? 'danger' : 'primary'} onClick={confirm}>
            {deactivating ? 'Deactivate account' : 'Reactivate account'}
          </Button>
        </>
      }
    >
      {deactivating ? (
        <div className="stack-sm">
          <p className="muted">
            The hosteller will no longer be able to log in or participate in new food polls. Their
            outings, food selections, rent payments and advance history stay in the system for
            reporting.
          </p>
          <p className="muted">
            Any open outing is kept in the history so it can be reviewed from In/Out Tracking.
          </p>
        </div>
      ) : (
        <p className="muted">
          The hosteller can log in again with their existing username and password, and take part in
          the current food poll. No historical records were removed.
        </p>
      )}
    </Modal>
  );
}
