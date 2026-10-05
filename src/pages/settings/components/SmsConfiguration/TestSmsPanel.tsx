import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useSendTestSms } from '../../../../modules/settings/queries';
import { apiErrorMessage } from './apiErrors';

interface TestSmsPanelProps {
    /** A test needs saved credentials to send with. */
    canTest: boolean;
}

/**
 * Sends one text with the saved credentials - before switching SMS on, this
 * is how an admin finds out the account works.
 */
const TestSmsPanel: React.FC<TestSmsPanelProps> = ({ canTest }) => {
    const [phone, setPhone] = useState('');
    const sendTest = useSendTestSms();

    const handleSend = () => {
        sendTest.mutate(
            { phone: phone.trim() },
            {
                onSuccess: (response) => toast.success(response.message),
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to send the test SMS.')),
            }
        );
    };

    return (
        <div className="bg-light rounded-3 p-3 mt-4">
            <h6 className="mb-1 fw-semibold fs-14 text-dark">Send a Test SMS</h6>
            <p className="text-muted mb-3 fs-13">
                {canTest
                    ? 'Sends a test message with the saved credentials, whether or not SMS is enabled.'
                    : 'Save your credentials first, then send a test message to check them.'}
            </p>
            <div className="d-flex flex-column flex-sm-row gap-2">
                <div className="input-group">
                    <label htmlFor="sms-test-phone" className="input-group-text bg-white text-muted fw-medium mb-0">
                        Test Phone Number
                    </label>
                    <input
                        id="sms-test-phone"
                        type="tel"
                        className="form-control fs-14"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+15551234567"
                        disabled={!canTest || sendTest.isPending}
                        style={{ boxShadow: 'none' }}
                    />
                </div>
                <button
                    type="button"
                    className="btn btn-soft-primary text-nowrap d-flex align-items-center justify-content-center gap-2"
                    onClick={handleSend}
                    disabled={!canTest || !phone.trim() || sendTest.isPending}
                >
                    {sendTest.isPending ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                        <i className="ri-send-plane-line"></i>
                    )}
                    <span>Send Test SMS</span>
                </button>
            </div>
        </div>
    );
};

export default TestSmsPanel;
