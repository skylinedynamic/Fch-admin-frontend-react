import React, { useEffect, useState, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import 'summernote/dist/summernote-lite.js';
import Modal from 'bootstrap/js/dist/modal';

const TierTaskModal = ({
    show,
    onHide,
    onSubmit,
    task,
    tierId,
    loadingSave
}) => {
    const isEdit = !!task;
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const editorRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        url: '',
        button_title: '',
        estimated_completion_days: '',
        order: ''
    });
    const [errors, setErrors] = useState({});

    // Initialize Bootstrap Modal
    useEffect(() => {
        if (modalRef.current && !modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false
            });
        }
    }, []);

    // Show/Hide Modal based on prop
    useEffect(() => {
        if (modalInstanceRef.current) {
            if (show) {
                modalInstanceRef.current.show();
            } else {
                modalInstanceRef.current.hide();
            }
        }
    }, [show]);

    // Update form data when task or show changes
    useEffect(() => {
        if (show) {
            if (task) {
                setFormData({
                    title: task.title || '',
                    subtitle: task.subtitle || '',
                    description: task.description || '',
                    url: task.url || '',
                    button_title: task.button_title || '',
                    estimated_completion_days: task.estimated_completion_days || '',
                    order: task.order || ''
                });
            } else {
                setFormData({
                    title: '',
                    subtitle: '',
                    description: '',
                    url: '',
                    button_title: '',
                    estimated_completion_days: '',
                    order: ''
                });
            }
            setErrors({});
        }
    }, [show, task]);

    // Initialize/Destroy Summernote
    useEffect(() => {
        let $editor = null;
        if (show && window.$ && editorRef.current) {
            const $ = window.$;
            $editor = $(editorRef.current);

            if ($editor.summernote) {
                $editor.summernote({
                    height: 200,
                    placeholder: 'Enter task description...',
                    dialogsInBody: true,
                    callbacks: {
                        onChange: (contents) => {
                            setFormData(prev => ({ ...prev, description: contents }));
                        }
                    },
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['bold', 'underline', 'clear']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['table', ['table']],
                        ['insert', ['link', 'picture', 'video']],
                        ['view', ['fullscreen', 'codeview', 'help']]
                    ]
                });

                const descriptionToSet = task ? (task.description || '') : '';
                $editor.summernote('code', descriptionToSet);
            }
        }

        return () => {
            if ($editor && $editor.summernote) {
                try {
                    $editor.summernote('destroy');
                } catch (e) { }
            }
        };
    }, [show, task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        let tempErrors = {};
        let isValid = true;
        if (!formData.title) {
            tempErrors.title = "Title is required";
            isValid = false;
        }
        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                tier_id: tierId,
                estimated_completion_days: formData.estimated_completion_days ? Number(formData.estimated_completion_days) : null,
                order: formData.order ? Number(formData.order) : 0
            });
        }
    };

    return (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEdit ? 'Edit Task' : 'Add New Task'}</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Title <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter task title"
                                    />
                                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Subtitle</label>
                                    <input
                                        type="text"
                                        name="subtitle"
                                        className="form-control"
                                        value={formData.subtitle}
                                        onChange={handleChange}
                                        placeholder="Enter task subtitle"
                                    />
                                </div>

                                {/* <div className="col-md-12">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        ref={editorRef}
                                        name="description"
                                        className="form-control"
                                    ></textarea>
                                </div> */}

                                <div className="col-md-6">
                                    <label className="form-label">Button Title</label>
                                    <input
                                        type="text"
                                        name="button_title"
                                        className="form-control"
                                        value={formData.button_title}
                                        onChange={handleChange}
                                        placeholder="e.g. Apply Now"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">URL</label>
                                    <input
                                        type="text"
                                        name="url"
                                        className="form-control"
                                        value={formData.url}
                                        onChange={handleChange}
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Est. Completion Days</label>
                                    <Dropdown
                                        value={formData.estimated_completion_days ? Number(formData.estimated_completion_days) : ''}
                                        onChange={(e) => handleChange({ target: { name: 'estimated_completion_days', value: e.value } })}
                                        options={Array.from({ length: 90 }, (_, i) => ({ label: `${i + 1} Days`, value: i + 1 }))}
                                        optionLabel="label"
                                        optionValue="value"
                                        filter
                                        className="w-100"
                                        placeholder="Select Days"
                                        appendTo="self"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Order</label>
                                    <input
                                        type="number"
                                        name="order"
                                        className="form-control"
                                        value={formData.order}
                                        onChange={handleChange}
                                        placeholder="Enter display order"
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4 pt-2 border-top">
                                <button type="button" className="btn btn-light me-2" onClick={onHide}>Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loadingSave}
                                >
                                    {loadingSave ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className={`me-1 align-bottom ${isEdit ? 'ri-edit-2-fill' : 'ri-save-3-fill'}`}></i>
                                            {isEdit ? 'Update' : 'Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierTaskModal;
