import React, { useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { formatPhoneNumber } from '../../../utils/formatters';
import 'summernote/dist/summernote-lite.js';

export default function ContactForm({
    contact,
    errors,
    onChange,
    countries,
    states,
    cities
}) {
    const editorRef = useRef(null);

    // Initialize Summernote
    useEffect(() => {
        let $editor = null;
        const $ = window.$;
        if ($ && editorRef.current) {
            $editor = $(editorRef.current);

            if ($editor.summernote) {
                $editor.summernote({
                    height: 200,
                    placeholder: 'Enter notes here...',
                    dialogsInBody: true,
                    callbacks: {
                        onChange: (contents) => {
                            onChange({ target: { name: 'notes', value: contents } });
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

                // Set initial content
                if (contact.notes) {
                    $editor.summernote('code', contact.notes);
                }
            }
        }

        return () => {
            if ($editor && $editor.summernote) {
                try {
                    $editor.summernote('destroy');
                } catch (e) { }
            }
        };
    }, []);

    // Update content when contact.notes changes externally (e.g. after fetch)
    useEffect(() => {
        const $ = window.$;
        if ($ && editorRef.current) {
            const $editor = $(editorRef.current);
            if ($editor.summernote) {
                const currentCode = $editor.summernote('code');
                if (currentCode !== (contact.notes || '')) {
                    $editor.summernote('code', contact.notes || '');
                }
            }
        }
    }, [contact.notes]);

    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="row">
                {/* Full Name */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Full Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                            name="full_name"
                            value={contact.full_name}
                            onChange={onChange}
                            placeholder="Enter full name"
                        />
                        {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
                    </div>
                </div>

                {/* Company */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Company <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.company_name ? 'is-invalid' : ''}`}
                            name="company_name"
                            value={contact.company_name || ''}
                            onChange={onChange}
                            placeholder="Enter company name"
                        />
                        {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
                    </div>
                </div>

                {/* Mobile */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Mobile <span className="text-danger">*</span></label>
                        <div className="input-group">
                            {/* Country Code Display - Simplified for now or match Employee logic if needed */}
                            {(contact.country === 'USA' || contact.country === 'Canada' || contact.country === 'United States') && (
                                <span className="input-group-text bg-light border">
                                    <span className="me-1">{contact.country === 'USA' || contact.country === 'United States' ? 'USA' : 'CAN'}</span>
                                    <span className="text-muted">+1</span>
                                </span>
                            )}
                            <input
                                type="text"
                                className={`form-control ${errors.mobile_number ? 'is-invalid' : ''}`}
                                name="mobile_number"
                                value={contact.mobile_number}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    onChange({ target: { name: 'mobile_number', value: formatted } });
                                }}
                                placeholder="(555) 555-5555"
                            />
                            {errors.mobile_number && <div className="invalid-feedback">{errors.mobile_number}</div>}
                        </div>
                    </div>
                </div>

                {/* Email */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">E-mail <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            name="email"
                            value={contact.email}
                            onChange={onChange}
                            placeholder="Enter email"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                </div>

                {/* Address Section */}
                <div className="col-lg-12">
                    <h5 className="mb-3 text-muted">Address Information</h5>
                </div>

                {/* Address */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Address <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                            name="address"
                            value={contact.address || ''}
                            onChange={onChange}
                            placeholder="Enter address"
                        />
                        {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                    </div>
                </div>

                {/* Country */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Country <span className="text-danger">*</span></label>
                        <Dropdown
                            value={contact.country}
                            options={countries}
                            onChange={(e) => onChange({ target: { name: 'country', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select Country"
                            filter
                            className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                        />
                        {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                    </div>
                </div>

                {/* State */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">State <span className="text-danger">*</span></label>
                        <Dropdown
                            value={contact.state}
                            options={states}
                            onChange={(e) => onChange({ target: { name: 'state', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select State"
                            filter
                            className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                            disabled={!contact.country}
                        />
                        {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                    </div>
                </div>

                {/* City */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">City <span className="text-danger">*</span></label>
                        <Dropdown
                            value={contact.city}
                            options={[...cities, { label: 'Others', value: 'Others' }]}
                            onChange={(e) => onChange({ target: { name: 'city', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select City"
                            filter
                            className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                            disabled={!contact.state}
                        />
                        {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                    </div>
                </div>

                {/* Other City - Shown when "Others" is selected */}
                {contact.city === 'Others' && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Other City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                                name="other_city"
                                placeholder="Enter city name"
                                value={contact.other_city || ''}
                                onChange={onChange}
                            />
                            {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                        </div>
                    </div>
                )}

                {/* Zip Code */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Zip Code</label>
                        <input
                            type="text"
                            className="form-control"
                            name="zip_code"
                            value={contact.zip_code || ''}
                            onChange={onChange}
                            placeholder="Enter zip code"
                        />
                    </div>
                </div>

                {/* Website */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Website</label>
                        <input
                            type="text"
                            className="form-control"
                            name="website"
                            value={contact.website || ''}
                            onChange={onChange}
                            placeholder="www.example.com"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="col-lg-12">
                    <div className="mb-3">
                        <label className="form-label">Notes</label>
                        <textarea
                            ref={editorRef}
                            className="form-control d-none"
                            name="notes"
                        ></textarea>
                    </div>
                </div>
            </div>
        </form>
    );
}
