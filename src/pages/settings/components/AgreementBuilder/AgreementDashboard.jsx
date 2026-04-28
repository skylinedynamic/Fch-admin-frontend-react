import React from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../../../lib/auth/auth';
import {
  useAgreements,
  useToggleAgreementStatus,
  useAppConfig,
  useSaveAppConfig
} from '../../../../modules/agreement';
import { Switch } from './CommonUI';
import { AgreementDashboardLoader } from '../../../../components/Loader/AgreementLoader.jsx';
import { usePermissions } from '../../../../lib/auth/usePermissions';

export const AgreementDashboard = ({ onEdit }) => {
  const { hasPermission } = usePermissions();
  const user = getUser();
  const isHost = user?.is_host == 1;
  const { data: listRes, isLoading: loadingList } = useAgreements();
  const list = listRes?.data || [];

  const getStatus = (slug) => list.find(a => a.slug === slug)?.is_active ?? false;

  const toggleMutation = useToggleAgreementStatus();

  const { data: configRes, isLoading: loadingConfig } = useAppConfig('agreement_signing_enabled');
  const saveConfigMutation = useSaveAppConfig();
  const isSigningEnabled = configRes?.data?.value === '1';

  if (loadingList || loadingConfig) {
    return <AgreementDashboardLoader />;
  }

  const handleGlobalToggle = async (val) => {
    try {
      await saveConfigMutation.mutateAsync({
        key: 'agreement_signing_enabled',
        value: val ? '1' : '0'
      });
      toast.success('Agreement signing feature updated');
    } catch (e) {
      toast.error('Failed to update signing feature');
    }
  };

  const handleToggle = async (id, slug, currentStatus) => {
    try {
      const res = await toggleMutation.mutateAsync({
        id,
        slug,
        is_active: !currentStatus
      });
      if (res.status) {
        toast.success(res.message || 'Agreement status updated');
      }
    } catch (error) {
      console.error("Failed to toggle agreement status", error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const AgreementRow = ({ type, label, subtext }) => {
    const agreement = list.find(a => a.slug === type);
    const isActive = agreement?.is_active ?? false;
    const isPending = toggleMutation.isPending && toggleMutation.variables?.id === agreement?.id;

    return (
      <div className="d-flex align-items-center gap-3 py-3 border-bottom border-light last-child-no-border">
        {/* ... */}
        <div className="avatar-sm flex-shrink-0">
          <div className="avatar-title bg-danger-subtle text-danger rounded fs-20">
            <i className="ri-file-pdf-2-line"></i>
          </div>
        </div>
        <div
          className="flex-grow-1"
          style={{ cursor: 'pointer' }}
          onClick={() => onEdit(type)}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <div className="fw-semibold fs-14 text-dark">{label}</div>
          <div className="text-muted fs-13">{isActive ? subtext : 'No active template'}</div>
        </div>
        <div className="d-flex align-items-center gap-3 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className={`fs-12 fw-medium ${isActive ? 'text-success' : 'text-muted'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={isActive}
              onChange={() => agreement && handleToggle(agreement.id, type, isActive)}
              disabled={isPending || !agreement}
            />
          </div>
          <button
            className="btn btn-sm btn-primary waves-effect d-flex align-items-center gap-1"
            onClick={() => onEdit(type)}
          >
            <i className="ri-edit-line fs-14"></i>
            <span>Edit Agreement</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="card-header d-flex align-items-center gap-3">
        <div className="avatar-sm flex-shrink-0">
          <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
            <i className="ri-file-text-line"></i>
          </div>
        </div>
        <div>
          <h5 className="card-title mb-0 fs-15">Agreement Paper Management</h5>
          <p className="text-muted mb-0 fs-13">Manage active agreement templates for partner and borrower onboarding</p>
        </div>
      </div>
      <div className="card-body p-4">
        {/* Global Feature Toggle */}
        {isHost && (
          <div className="p-3 bg-primary-subtle rounded-3 mb-4 d-flex align-items-center justify-content-between border border-primary-subtle">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-xs flex-shrink-0">
                <div className="avatar-title bg-primary text-white rounded-circle fs-14">
                  <i className="ri-shield-check-line"></i>
                </div>
              </div>
              <div>
                <h6 className="mb-0 fs-14 fw-semibold">Agreement Signing Feature</h6>
                <p className="text-muted mb-0 fs-12">Enable or disable digital signing workflow globally</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`fs-12 fw-medium ${isSigningEnabled ? 'text-primary' : 'text-muted'}`}>
                {isSigningEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <div style={{ transform: 'scale(1.1)', transformOrigin: 'right' }}>
                <Switch
                  checked={isSigningEnabled}
                  onChange={handleGlobalToggle}
                  disabled={saveConfigMutation.isPending}
                />
              </div>
            </div>
          </div>
        )}

        {hasPermission('update partner agreement settings') && (
          <AgreementRow
            type="partner"
            label="Partner Agreement Paper"
            subtext="Manage default digital agreement for partner onboarding"
          />
        )}

        {hasPermission('update borrower agreement settings') && (
          <AgreementRow
            type="borrower"
            label="Borrower Agreement Paper"
            subtext="Manage default digital agreement for borrower signatures"
          />
        )}
      </div>
    </div>
  );
};
