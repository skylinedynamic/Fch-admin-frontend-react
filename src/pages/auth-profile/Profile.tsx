import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUpdatePassword, useUpdateProfile, useUpdateProfilePicture } from '../../modules/auth-profile';
import { useAuthStore } from '../../store/auth';
import { refreshUser } from '../../lib/auth/authApi';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { formatPhoneNumber } from '../../utils/formatters';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_EMPLOYEE } from '../../config/appConfig';

const Profile = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const setCredentials = useAuthStore((state) => state.setCredentials);
    const token = useAuthStore((state) => state.token);
    const rememberMe = useAuthStore((state) => state.rememberMe);

    const { mutateAsync: updatePassword, isPending: isSubmittingPassword } = useUpdatePassword();
    const { mutateAsync: updateProfile, isPending: isSubmittingProfile } = useUpdateProfile();
    const { mutateAsync: updateProfilePic } = useUpdateProfilePicture();

    const [activeTab, setActiveTab] = useState('profile');

    // Profile Form State
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        image: ''
    });
    const [profileErrors, setProfileErrors] = useState({});
    const [showFileManager, setShowFileManager] = useState(false);

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState(0);

    useEffect(() => {
        if (user) {
            const nameParts = (user.name || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            setProfileData({
                first_name: firstName,
                last_name: lastName,
                phone_number: formatPhoneNumber(user.phone_number) || '',
                email: user.email || '',
                image: user.image || ''
            });
        }
    }, [user]);

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        return strength;
    };

    const handleProfileChange = (e) => {
        let { name, value } = e.target;

        if (name === 'phone_number') {
            value = formatPhoneNumber(value);
        }

        setProfileData(prev => ({ ...prev, [name]: value }));
        if (profileErrors[name]) {
            setProfileErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));

        if (name === 'new_password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }

        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateProfile = () => {
        const newErrors = {};
        if (!profileData.first_name) newErrors.first_name = 'First name is required';
        if (!profileData.last_name) newErrors.last_name = 'Last name is required';
        if (!profileData.email) newErrors.email = 'Email is required';
        setProfileErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePassword = () => {
        const newErrors = {};
        if (!passwordData.current_password) newErrors.current_password = 'Current password is required';
        if (!passwordData.new_password) {
            newErrors.new_password = 'New password is required';
        } else if (passwordData.new_password.length < 8) {
            newErrors.new_password = 'Password must be at least 8 characters';
        }
        if (!passwordData.new_password_confirmation) {
            newErrors.new_password_confirmation = 'Please confirm your new password';
        } else if (passwordData.new_password !== passwordData.new_password_confirmation) {
            newErrors.new_password_confirmation = 'Passwords do not match';
        }
        setPasswordErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!validateProfile()) return;

        try {
            const { image, ...dataToUpdate } = profileData;
            const response = await updateProfile(dataToUpdate);
            if (response.status) {
                toast.success(response.message || 'Profile updated successfully!');
                await refreshUser();
            } else {
                toast.error(response.message || 'Failed to update profile');
            }
        } catch (error) {
            if (error?.response?.data?.errors) {
                setProfileErrors(error.response.data.errors);
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!validatePassword()) return;

        try {
            const response = await updatePassword(passwordData);
            if (response.status) {
                toast.success(response.message);
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    new_password_confirmation: ''
                });
                setPasswordStrength(0);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            if (error?.response?.data?.errors) {
                setPasswordErrors(error.response.data.errors);
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 1) return 'danger';
        if (passwordStrength <= 3) return 'warning';
        return 'success';
    };

    const getStrengthText = () => {
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength <= 3) return 'Medium';
        return 'Strong';
    };

    const userFullName = user?.name || '';
    const userNameParts = userFullName.trim().split(' ');
    const userFirstName = userNameParts[0] || '';
    const userLastName = userNameParts.length > 1 ? userNameParts.slice(1).join(' ') : '';

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">My Profile</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Settings</li>
                                        <li className="breadcrumb-item active" aria-current="page">Profile</li>
                                    </ol>
                                </nav>
                            </div>
                            <div>
                                {activeTab === 'profile' ? (
                                    <button
                                        type="submit"
                                        form="profile-form"
                                        className="btn btn-primary px-4 shadow-sm"
                                        disabled={isSubmittingProfile}
                                    >
                                        {isSubmittingProfile ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
                                        ) : 'Save Changes'}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        form="password-form"
                                        className="btn btn-primary px-4 shadow-sm"
                                        disabled={isSubmittingPassword}
                                    >
                                        {isSubmittingPassword ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</>
                                        ) : 'Update Password'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-3">
                        <div className="card border-0 shadow-sm text-center p-4 h-100">
                            <div className="position-relative d-inline-block mx-auto mb-4">
                                <div className="avatar-xl rounded-circle border border-primary p-1 bg-body shadow-sm overflow-hidden" style={{ width: '120px', height: '120px' }}>
                                    <img
                                        src={user?.image ? `${user.image}` : "https://via.placeholder.com/120"}
                                        alt="profile"
                                        className="img-fluid rounded-circle h-100 w-100 object-fit-cover"
                                    />
                                </div>
                                <button
                                    className="btn btn-primary rounded-circle position-absolute bottom-0 end-0 shadow"
                                    onClick={() => setShowFileManager(true)}
                                    title="Update Profile Picture"
                                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <i className="ri-camera-fill fs-18"></i>
                                </button>
                            </div>
                            <h5 className="mb-1 fw-bold">{userFullName || 'User'}</h5>
                            <p className="text-muted mb-0">{user?.role?.toUpperCase()}</p>
                            <div className="mt-4 border-top pt-4 text-start">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-shrink-0 avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
                                        <i className="ri-mail-line"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-muted fs-11 mb-0 text-uppercase">Email</p>
                                        <h6 className="mb-0 text-truncate" style={{ maxWidth: '160px' }}>{user?.email}</h6>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-shrink-0 avatar-xs rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center">
                                        <i className="ri-user-3-line"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-muted fs-11 mb-0 text-uppercase">First Name</p>
                                        <h6 className="mb-0 text-truncate" style={{ maxWidth: '160px' }}>{userFirstName}</h6>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-shrink-0 avatar-xs rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center">
                                        <i className="ri-user-3-line"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-muted fs-11 mb-0 text-uppercase">Last Name</p>
                                        <h6 className="mb-0 text-truncate" style={{ maxWidth: '160px' }}>{userLastName}</h6>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-shrink-0 avatar-xs rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center">
                                        <i className="ri-phone-line"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-muted fs-11 mb-0 text-uppercase">Phone Number</p>
                                        <h6 className="mb-0 text-truncate" style={{ maxWidth: '160px' }}>{user?.phone_number ? formatPhoneNumber(user.phone_number) : 'N/A'}</h6>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0 avatar-xs rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center">
                                        <i className="ri-shield-user-line"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-muted fs-11 mb-0 text-uppercase">Account Type</p>
                                        <h6 className="mb-0">{user?.entity_type || 'Admin'}</h6>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-9">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-header bg-transparent border-bottom p-0">
                                <ul className="nav nav-tabs nav-tabs-custom nav-primary border-bottom-0 px-4" role="tablist">
                                    <li className="nav-item">
                                        <a
                                            className={`nav-link py-3 ${activeTab === 'profile' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('profile')}
                                            role="tab"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className="ri-user-line me-2 align-bottom"></i>
                                            Profile Details
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a
                                            className={`nav-link py-3 ${activeTab === 'password' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('password')}
                                            role="tab"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className="ri-lock-password-line me-2 align-bottom"></i>
                                            Security & Password
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                <div className="tab-content">
                                    {/* Profile Tab */}
                                    {activeTab === 'profile' && (
                                        <div className="tab-pane active" role="tabpanel">
                                            <form id="profile-form" onSubmit={handleProfileSubmit}>
                                                <div className="row g-4">
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">First Name</label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${profileErrors.first_name ? 'is-invalid' : ''}`}
                                                            name="first_name"
                                                            value={profileData.first_name}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter your first name"
                                                            disabled={isSubmittingProfile}
                                                        />
                                                        {profileErrors.first_name && <div className="invalid-feedback">{profileErrors.first_name}</div>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">Last Name</label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${profileErrors.last_name ? 'is-invalid' : ''}`}
                                                            name="last_name"
                                                            value={profileData.last_name}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter your last name"
                                                            disabled={isSubmittingProfile}
                                                        />
                                                        {profileErrors.last_name && <div className="invalid-feedback">{profileErrors.last_name}</div>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">Email Address</label>
                                                        <input
                                                            type="email"
                                                            className={`form-control bg-light text-muted ${profileErrors.email ? 'is-invalid' : ''}`}
                                                            name="email"
                                                            value={profileData.email}
                                                            placeholder="Enter your email"
                                                            readOnly
                                                        />
                                                        {profileErrors.email && <div className="invalid-feedback">{profileErrors.email}</div>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">Phone Number</label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${profileErrors.phone_number ? 'is-invalid' : ''}`}
                                                            name="phone_number"
                                                            value={profileData.phone_number}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter your phone number"
                                                            disabled={isSubmittingProfile}
                                                        />
                                                        {profileErrors.phone_number && <div className="invalid-feedback">{profileErrors.phone_number}</div>}
                                                    </div>
                                                </div>


                                            </form>
                                        </div>
                                    )}

                                    {/* Password Tab */}
                                    {activeTab === 'password' && (
                                        <div className="tab-pane active" role="tabpanel">
                                            <form id="password-form" onSubmit={handlePasswordSubmit}>
                                                <div className="mb-4">
                                                    <label className="form-label fw-semibold">Current Password</label>
                                                    <input
                                                        type="password"
                                                        className={`form-control ${passwordErrors.current_password ? 'is-invalid' : ''}`}
                                                        name="current_password"
                                                        value={passwordData.current_password}
                                                        onChange={handlePasswordChange}
                                                        placeholder="Enter current password"
                                                        disabled={isSubmittingPassword}
                                                    />
                                                    {passwordErrors.current_password && <div className="invalid-feedback">{passwordErrors.current_password}</div>}
                                                </div>

                                                <div className="row g-4">
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">New Password</label>
                                                        <input
                                                            type="password"
                                                            className={`form-control ${passwordErrors.new_password ? 'is-invalid' : ''}`}
                                                            name="new_password"
                                                            value={passwordData.new_password}
                                                            onChange={handlePasswordChange}
                                                            placeholder="Enter new password"
                                                            disabled={isSubmittingPassword}
                                                        />
                                                        {passwordErrors.new_password && <div className="invalid-feedback">{passwordErrors.new_password}</div>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-semibold">Confirm New Password</label>
                                                        <input
                                                            type="password"
                                                            className={`form-control ${passwordErrors.new_password_confirmation ? 'is-invalid' : ''}`}
                                                            name="new_password_confirmation"
                                                            value={passwordData.new_password_confirmation}
                                                            onChange={handlePasswordChange}
                                                            placeholder="Confirm new password"
                                                            disabled={isSubmittingPassword}
                                                        />
                                                        {passwordErrors.new_password_confirmation && <div className="invalid-feedback">{passwordErrors.new_password_confirmation}</div>}
                                                    </div>
                                                </div>

                                                {passwordData.new_password && (
                                                    <div className="mt-4 p-3 bg-light rounded-3 border">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <small className="text-muted fw-medium">Password Strength:</small>
                                                            <small className={`text-${getStrengthColor()} fw-bold text-uppercase`} style={{ fontSize: '10px' }}>
                                                                {getStrengthText()}
                                                            </small>
                                                        </div>
                                                        <div className="progress rounded-pill shadow-none mb-2" style={{ height: '6px' }}>
                                                            <div
                                                                className={`progress-bar bg-${getStrengthColor()}`}
                                                                role="progressbar"
                                                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <small className="text-muted fs-11">
                                                            <i className="ri-information-line align-bottom me-1"></i>
                                                            Must be at least 8 characters with a mix of letters, numbers & symbols.
                                                        </small>
                                                    </div>
                                                )}
                                                {/* Security Tips Card */}
                                                <div className="card border border-light shadow-none mt-4 bg-light bg-opacity-50">
                                                    <div className="card-body">
                                                        <h6 className="card-title fw-semibold mb-3">Password Requirements</h6>
                                                        <ul className="list-unstyled mb-0 text-muted vstack gap-2">
                                                            <li className={passwordData.new_password.length >= 8 ? "text-success" : ""}>
                                                                <i className={`ri-check-line me-2 ${passwordData.new_password.length >= 8 ? "text-success" : "text-muted"}`}></i>
                                                                Minimum 8 characters long
                                                            </li>
                                                            <li className={/[a-z]/.test(passwordData.new_password) && /[A-Z]/.test(passwordData.new_password) ? "text-success" : ""}>
                                                                <i className={`ri-check-line me-2 ${/[a-z]/.test(passwordData.new_password) && /[A-Z]/.test(passwordData.new_password) ? "text-success" : "text-muted"}`}></i>
                                                                Include uppercase and lowercase letters
                                                            </li>
                                                            <li className={/\d/.test(passwordData.new_password) ? "text-success" : ""}>
                                                                <i className={`ri-check-line me-2 ${/\d/.test(passwordData.new_password) ? "text-success" : "text-muted"}`}></i>
                                                                Include at least one number
                                                            </li>
                                                            <li className={/[^a-zA-Z\d]/.test(passwordData.new_password) ? "text-success" : ""}>
                                                                <i className={`ri-check-line me-2 ${/[^a-zA-Z\d]/.test(passwordData.new_password) ? "text-success" : "text-muted"}`}></i>
                                                                Include at least one special character
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>



                                            </form>


                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                entityType={
                    user?.entity_type === ENTITY_TYPE_PARTNER ? 'partners' :
                        user?.entity_type === ENTITY_TYPE_EMPLOYEE ? 'employees' :
                            'users'
                }
                entityId={user?.entity_id || '0'}
                initialPath="/"
                onSelectFiles={async (files) => {
                    if (files && files.length > 0) {
                        const newImage = files[0].path;
                        try {
                            const response = await updateProfilePic({ image: newImage });
                            if (response.status) {
                                toast.success(response.message || 'Profile picture updated successfully!');
                                setProfileData(prev => ({ ...prev, image: newImage }));
                                setCredentials({
                                    token,
                                    user: {
                                        ...user,
                                        image: newImage
                                    },
                                    rememberMe
                                });
                            } else {
                                toast.error(response.message || 'Failed to update profile picture');
                            }
                        } catch (error) {
                            toast.error('Something went wrong while updating profile picture.');
                        }
                        setShowFileManager(false);
                    }
                }}
                section="Profile"
                getAll={false}
            />
        </div>
    );
};

export default Profile;

