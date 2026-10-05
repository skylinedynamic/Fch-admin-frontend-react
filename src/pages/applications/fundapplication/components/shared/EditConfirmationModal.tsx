import { Modal, ModalBody, ModalFooter } from 'reactstrap';
import {
  useEditConfirmationStore,
  resolveEditConfirmation,
} from '../../../../../store/fundApplication/editConfirmationStore';
import './edit-confirmation-modal.css';

/**
 * Shown the moment a partner tries to save a change to an application the
 * borrower has already signed and submitted.
 *
 * The wording differs from the borrower's copy of this dialog on purpose. The
 * partner is not withdrawing their own signature - they are withdrawing the
 * borrower's, and creating work for someone who is not in the room. That has to
 * be the headline, because it is the part a partner would otherwise not think
 * about until the borrower asks why their application left review.
 *
 * The two buttons name outcomes rather than "Cancel" and "OK", so neither can
 * be clicked without having read what it does.
 *
 * Rendered once by the wizard; every step's save waits on it. `fade` is off
 * because the stylesheet animates it instead.
 */
export default function EditConfirmationModal() {
  const isOpen = useEditConfirmationStore(state => state.isOpen);

  return (
    <Modal
      isOpen={isOpen}
      toggle={() => resolveEditConfirmation(false)}
      centered
      fade={false}
      backdrop="static"
      modalClassName="edit-confirmation-modal"
      aria-labelledby="edit-confirmation-title"
    >
      <ModalBody className="p-4">
        <div className="d-flex gap-3">
          <div className="flex-shrink-0">
            <span className="edit-confirmation-icon">
              <i className="ri-error-warning-fill" aria-hidden="true"></i>
            </span>
          </div>
          <div>
            <h5 id="edit-confirmation-title" className="edit-confirmation-title mb-2">
              This will clear the borrower&apos;s signature
            </h5>
            <p className="text-muted mb-2">
              The borrower has already signed and submitted this application. Saving this change
              withdraws their signature, because it no longer covers what is on the application.
            </p>
            <p className="text-muted mb-0">
              The application will move back to{' '}
              <span className="edit-confirmation-status">Draft</span> and will not continue through
              review until the borrower signs it again. This change is recorded against your account.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="btn btn-light"
          onClick={() => resolveEditConfirmation(false)}
        >
          Leave it as submitted
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => resolveEditConfirmation(true)}
        >
          Save and request re-signature
        </button>
      </ModalFooter>
    </Modal>
  );
}
