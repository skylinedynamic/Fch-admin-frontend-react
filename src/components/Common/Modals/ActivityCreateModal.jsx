import React, { useState, useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { toast } from 'react-toastify';
import { useSummernote } from '../../../hooks/useSummernote';

export default function ActivityCreateModal({ entityId, entityType }) {
    const referenceRef = useRef(null);
    const categoryRef = useRef(null);
    const dateInputRef = useRef(null);
    const [formData, setFormData] = useState({
        reference: 'Event',
        date: '',
        category: 'Event',
        assignedTo: '',
        summary: '',
        message: '',
        attachments: []
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...files]
        }));
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleCreate = () => {
        if (!formData.summary || !formData.date) {
            toast.error('Summary and Date are required');
            return;
        }

        // TODO: Implement actual create activity logic with API
        console.log('Creating activity:', { ...formData, entityId, entityType });
        toast.success(`Activity "${formData.summary}" created successfully`);

        // Close modal
        if (window.hideGlobalModal) {
            window.hideGlobalModal('activityCreateModal');
        }
    };

    // Use global Summernote hook
    const { editorRef } = useSummernote('message', formData.message, handleInputChange, {
        height: 200,
        placeholder: 'Write your message...'
    });

    // Initialize Choices.js
    useEffect(() => {
        const instances = [];
        if (window.Choices) {
            [referenceRef, categoryRef].forEach(ref => {
                if (ref.current) {
                    try {
                        const instance = new window.Choices(ref.current, {
                            searchEnabled: false,
                            removeItemButton: false,
                            itemSelectText: '',
                        });
                        instances.push(instance);

                        ref.current.addEventListener('change', (e) => {
                            const { name, value } = e.target;
                            setFormData(prev => ({ ...prev, [name]: value }));
                        });
                    } catch (e) {
                        console.warn('Choices.js init failed', e);
                    }
                }
            });
        }
        return () => {
            instances.forEach(instance => instance.destroy());
        };
    }, []);

    // Initialize Flatpickr for date field
    useEffect(() => {
        if (dateInputRef.current) {
            const fp = flatpickr(dateInputRef.current, {
                enableTime: false,
                dateFormat: "Y-m-d",
                defaultDate: formData.date || new Date(),
                onChange: (selectedDates, dateStr) => {
                    setFormData(prev => ({ ...prev, date: dateStr }));
                }
            });
            return () => fp.destroy();
        }
    }, []);

    return (
        <div className="modal fade" id="activityCreateModal" tabIndex="-1" aria-labelledby="activityCreateLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0">
                    <div className="modal-header p-3 ps-4 bg-primary">
                        <h5 className="modal-title text-white" id="activityCreateLabel">
                            <i className="ri-calendar-event-line align-middle me-2"></i>New Activity
                        </h5>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        <form>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Reference <span className="text-danger">*</span></label>
                                    <select
                                        className="form-select"
                                        id="activityReference"
                                        name="reference"
                                        ref={referenceRef}
                                        value={formData.reference}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="Event">Event</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Call">Call</option>
                                        <option value="Email">Email</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Date <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="activityDate"
                                        name="date"
                                        ref={dateInputRef}
                                        placeholder="Select date and time"
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-select"
                                        id="activityCategory"
                                        name="category"
                                        ref={categoryRef}
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Event">Event</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Call">Call</option>
                                        <option value="Sent/Received Email">Sent/Received Email</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Assigned To</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="activityAssignedTo"
                                        name="assignedTo"
                                        placeholder="Assignee"
                                        value={formData.assignedTo}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Summary <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="activitySummary"
                                        name="summary"
                                        value={formData.summary}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Message</label>
                                    <textarea
                                        id="activityMessageEditor"
                                        ref={editorRef}
                                        className="d-none"
                                        name="message"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-md-6">
                                    <label className="form-label">Select Attachments</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            id="activityAttachmentBtn"
                                            className="btn btn-light btn-sm"
                                            onClick={() => document.getElementById('activityAttachmentInput').click()}
                                        >
                                            + Add Attachment
                                        </button>
                                        <input
                                            type="file"
                                            id="activityAttachmentInput"
                                            className="d-none"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    <div id="activityAttachmentList" className="mt-2">
                                        {formData.attachments.map((file, index) => (
                                            <div key={index} className="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                                                <span className="text-muted small">
                                                    <i className="ri-attachment-2 me-1"></i>
                                                    {file.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-ghost-danger"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <i className="ri-close-line"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            <i className="ri-check-line align-middle me-1"></i> Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
