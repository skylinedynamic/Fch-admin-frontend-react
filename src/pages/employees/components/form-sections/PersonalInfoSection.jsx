import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { formatPhoneNumber } from '../../../../utils/formatters';
import avatarDefault from "../../../../../assets/images/users/avatar-1.jpg";
import { FileManagerModal } from '../../../../components/FileManagerModal/FileManagerModal';
import { toast } from 'react-toastify';
import { buildStorageUrl } from '../../../../utils/imageHelpers';


export default function PersonalInfoSection({
    employee,
    errors,
    onChange,
    departments,
    onAddDepartment,
    countryCodeOptions,
    phonePrefix,
    onPhonePrefixChange,
    onOpenFileManager, // Now used for parent if needed, but we'll use local state
    profileImage,
    employeeId,
    emailNotice = null
}) {
    const [showFileManager, setShowFileManager] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Filter results from file manager based on allowed extensions - Matches Partner Pattern
    const handleFileSelection = (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const file = selectedFiles[0];
        const extension = file.path.split('.').pop()?.toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png'];

        if (!extension || !allowed.includes(extension)) {
            toast.error(`File type ".${extension}" not allowed. Please select JPG, JPEG or PNG.`);
            return;
        }

        // Set local preview URL for immediate display
        setPreviewUrl(file.url);

        // Update form data with the selected file path for backend
        onChange({
            target: {
                name: 'image',
                value: file.path
            }
        });
        setShowFileManager(false);
    };

    // Helper function to get image source - matches PartnerInformationSection pattern
    const getImageSrc = () => {
        // 1. If user selected a new image file from browser (Blob)
        if (employee.image instanceof File) {
            return URL.createObjectURL(employee.image);
        }

        const buildUrl = (path) => {
            if (!path || typeof path !== 'string' || path === avatarDefault) return avatarDefault;

            let cleanPath = path.trim().replace(/^\/+/, '');

            // Ensure employees structure if missing
            if (employeeId && !cleanPath.includes('employees/')) {
                if (!cleanPath.includes('/')) {
                    cleanPath = `employees/${employeeId}/${cleanPath}`;
                }
            }

            return buildStorageUrl(cleanPath, avatarDefault);
        };

        // 2. If we have a profileImage prop that is a full URL (preview from file manager)
        if (profileImage && typeof profileImage === 'string' && profileImage.startsWith('http')) {
            return profileImage;
        }

        // 3. If we have a preview URL from file manager selection
        if (previewUrl && employee.image && typeof employee.image === 'string' && !employee.image.startsWith('http')) {
            return buildUrl(previewUrl);
        }

        // 4. Fallback to image path if it's a string
        if (typeof employee.image === 'string' && employee.image.trim() !== '') {
            return buildUrl(employee.image);
        }

        // 5. Fallback to profileImage prop if it's not a full URL
        if (typeof profileImage === 'string' && profileImage.trim() !== '') {
            return buildUrl(profileImage);
        }

        return avatarDefault;
    };

    const fileInputRef = React.useRef(null);

    const handleIconClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <>
            <div className="col-lg-12">
                <div className="card mt-3 mt-lg-0">
                    <div className="profile-user position-relative d-inline-block mx-auto mb-4 mt-3 mt-lg-2">
                        <img
                            src={getImageSrc()}
                            className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow"
                            alt="user-profile-image"
                        />
                        <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                            <input
                                type="file"
                                className="d-none"
                                ref={fileInputRef}
                                name="image"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={onChange}
                            />
                            <button
                                type="button"
                                className="btn p-0 border-0 rounded-circle profile-photo-edit avatar-xs"
                                onClick={() => setShowFileManager(true)}
                                title="Select profile image"
                            >
                                <span className="avatar-title rounded-circle bg-light text-body material-shadow">
                                    <i className="ri-camera-fill"></i>
                                </span>
                            </button>
                        </div>
                    </div>

                    <FileManagerModal
                        isOpen={showFileManager}
                        toggle={() => setShowFileManager(!showFileManager)}
                        selectionMode={true}
                        onSelectFiles={handleFileSelection}
                        entityType="employees"
                        entityId={employeeId || employee?.id || employee?.employee_code}
                    />

                    <div className="text-center mb-3">
                        <span className="badge bg-light text-muted border text-wrap lh-base px-3 py-2" style={{ whiteSpace: 'normal' }}>
                            <i className="ri-information-line me-1"></i>
                            Allowed image types: JPG, JPEG, PNG (Maximum size: 1 MB).
                        </span>
                    </div>
                    {errors.image && (
                        <div className="alert alert-danger mt-2 text-center p-1">
                            <small>{errors.image}</small>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                        name="first_name"
                        value={employee.first_name}
                        onChange={onChange}
                        placeholder="Enter full name"
                    />
                    {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Position</label>
                    <input
                        type="text"
                        className={`form-control ${errors.designation ? 'is-invalid' : ''}`}
                        name="designation"
                        value={employee.designation}
                        onChange={onChange}
                        placeholder="Enter position"
                    />
                    {errors.designation && <div className="invalid-feedback">{errors.designation}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label d-flex justify-content-between align-items-center">
                        <span>
                            Department
                        </span>

                        <button
                            type="button"
                            className="btn btn-sm btn-link p-0"
                            onClick={onAddDepartment}
                        >
                            <i className="ri-add-circle-line"></i> Add New
                        </button>
                    </label>
                    <Dropdown
                        inputId="department"
                        value={employee.department}
                        options={departments}
                        onChange={(e) => onChange({ target: { name: 'department', value: e.value } })}
                        optionLabel="name"
                        optionValue="name"
                        placeholder="Select Department"
                        filter
                        className={`w-100 ${errors.department ? 'p-invalid' : ''}`}
                    />
                    {errors.department && <div className="invalid-feedback d-block">{errors.department}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone Number</label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {(employee.country === 'USA' || employee.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{employee.country === 'USA' ? 'USA' : 'CAN'}</span>
                                <span className="text-muted">+1</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className={`form-control ${errors.phone_number_1 ? 'is-invalid' : ''}`}
                            name="phone_number_1"
                            value={employee.phone_number_1}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                onChange({ target: { name: 'phone_number_1', value: formatted } });
                            }}
                            placeholder="(555) 555-5555"
                        />
                        {errors.phone_number_1 && <div className="invalid-feedback">{errors.phone_number_1}</div>}
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    {emailNotice}
                    <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        name="email"
                        value={employee.email}
                        onChange={onChange}
                        placeholder="Enter email"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
            </div>

        </>
    );
}
