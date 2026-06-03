import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FUNDING_ICON_MAP, FUNDING_COLOR_MAP } from '../../../config/funding';

const FundingCard = ({ item }) => {
    const navigate = useNavigate();
    const iconName = FUNDING_ICON_MAP[item.icon] || item.icon || 'file-list-3';
    const colorName = FUNDING_COLOR_MAP[item.icon_color] || item.icon_color || 'primary';

    return (
        <div 
            className="card h-100 border-0" 
            style={{ 
                cursor: 'pointer', 
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', 
                borderRadius: '16px', 
                background: '#ffffff', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.04)'
            }}
            onClick={() => navigate(`/funding/${item.id}`)}
            onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)';
            }}
        >
            <div className="card-body p-4 d-flex flex-column h-100">
                <div className="d-flex justify-content-between align-items-start mb-4">
                    <div className={`bg-soft-${colorName} text-${colorName} rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '52px', height: '52px' }}>
                        <i className={`ri-${iconName}-line fs-24`}></i>
                    </div>
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                        style={{ width: '32px', height: '32px', transition: 'all 0.2s' }}
                        title="View Details"
                    >
                        <i className="ri-arrow-right-up-line text-muted fs-14"></i>
                    </div>
                </div>
                
                <h5 className="fs-16 mb-2 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>{item.name}</h5>
                <p className="text-muted fs-14 mb-4 flex-grow-1" style={{ lineHeight: '1.6' }}>{item.subtitle}</p>
                
                <div className="d-flex align-items-center justify-content-between pt-3" style={{ borderTop: '1px dashed #e9ebec' }}>
                    {item.amount_range && (
                        <div className="d-flex flex-column">
                            <span className="text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Amount</span>
                            <span className="fw-bold" style={{ color: '#0ab39c', fontSize: '14px' }}>{item.amount_range}</span>
                        </div>
                    )}
                    {item.terms && (
                        <div className="d-flex flex-column text-end">
                            <span className="text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Terms</span>
                            <span className="fw-bold text-dark" style={{ fontSize: '14px' }}>{item.terms}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FundingCard;
