import React, { useState, useEffect } from 'react';
import { fetchPartnerPaymentMethods } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';
import stripeLogo from '../../../../assets/images/payment_provider/stripe_logo.png';
import squareLogo from '../../../../assets/images/payment_provider/square.png';
import ecryptLogo from '../../../../assets/images/payment_provider/ecrypt.png';
import authorizeLogo from '../../../../assets/images/payment_provider/authorization.png';

const PROVIDER_LOGOS = Object.freeze({
  stripe: stripeLogo,
  square: squareLogo,
  ecrypt: ecryptLogo,
  authorize: authorizeLogo,
  authorizenet: authorizeLogo,
  authorization: authorizeLogo,
});

function resolveLogo(name, logo) {
  if (logo) return logo;
  const key = (name || '').toLowerCase().replace(/[\s.]/g, '');
  return PROVIDER_LOGOS[key] || '';
}

function ProviderCard({ provider, onClick }) {
  const logo = resolveLogo(provider.name, provider.logo);

  return (
    <div className="pps-card" onClick={() => onClick(provider)}>
      <div className="pps-card-logo">
        {logo ? (
          <img src={logo} alt={provider.name} className="pps-card-logo-img" />
        ) : (
          <span className="pps-card-icon">
            <i className="ri-secure-payment-line"></i>
          </span>
        )}
      </div>
      <div className="pps-card-body">
        <span className="pps-card-name">{provider.name}</span>
        {provider.is_default && (
          <span className="pps-card-badge">Default</span>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="pps-card pps-card-skeleton">
      <div className="pps-skeleton-logo" />
      <div className="pps-skeleton-line" />
      <div className="pps-skeleton-line pps-skeleton-line-short" />
    </div>
  );
}

export default function PaymentProviderSelector({ invoice, onSelect }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!invoice) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setProviders([]);

      try {
        const res = await fetchPartnerPaymentMethods();
        if (cancelled) return;

        if (res.status) {
          const list = res.data || [];
          setProviders(list);
          if (list.length === 1) {
            onSelect(list[0]);
          }
        } else {
          setError(res.message || 'Failed to load payment providers');
          toast.error(res.message || 'Failed to load payment providers');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err.response?.data?.message || 'Failed to load payment providers';
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [invoice?.id]);

  if (loading) {
    return (
      <div className="pps-grid">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pps-state">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="pps-state">
        <p className="text-muted mb-0">No active payment providers are available.</p>
      </div>
    );
  }

  return (
    <div className="pps-grid">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}