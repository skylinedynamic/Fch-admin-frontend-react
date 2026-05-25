import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useSendTestMail } from '../../../modules/settings/queries';
import { SendTestMailPayload } from '../../../modules/settings/types';

interface FormErrors {
    email?: string | null;
    body?: string | null;
}

const TestMailForm: React.FC = () => {
    const [formData, setFormData] = useState<SendTestMailPayload>({
        email: '',
        body: ''
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const sendTestMailMutation = useSendTestMail();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.email) {
            newErrors.email = 'Recipient email is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email address.';
        }

        if (!formData.body) {
            newErrors.body = 'Message body is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        sendTestMailMutation.mutate(formData, {
            onSuccess: (response: any) => {
                toast.success(response.message || 'Test email sent successfully!');
                setFormData({ email: '', body: '' });
            },
            onError: (error: any) => {
                console.error('Failed to send test mail:', error);
                toast.error(error.response?.data?.message || 'Failed to send test email.');
            }
        });
    };

    const loading = sendTestMailMutation.isPending;

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0">Test Email Configuration</h5>
                <p className="text-muted small mb-0">Use this form to verify your Mail server settings by sending a test message.</p>
            </div>
            <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                        <div className="col-12">
                            <label className="form-label fw-bold">Recipient Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                placeholder="Enter recipient email (e.g., test@example.com)"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                        </div>

                        <div className="col-12">
                            <label className="form-label fw-bold">Message Body</label>
                            <textarea
                                name="body"
                                className={`form-control ${errors.body ? 'is-invalid' : ''}`}
                                rows={5}
                                placeholder="Write your test message here..."
                                value={formData.body}
                                onChange={handleInputChange}
                            ></textarea>
                            {errors.body && <div className="invalid-feedback">{errors.body}</div>}
                        </div>

                        <div className="col-12 mt-4 pt-2 border-top">
                            <div className="d-flex justify-content-end">
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 d-flex align-items-center"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-send-plane-fill me-2"></i> Send Test Email
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TestMailForm;
