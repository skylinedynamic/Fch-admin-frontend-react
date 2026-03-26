import React, { useState, useRef, useEffect } from 'react';

export const CustomSelect = ({ value, onChange, options, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const active = options.find(o => o.value === value) || options[0];

  return (
    <div className="ab4-cs-root" ref={ref}>
      {label && <label className="ab4-pl">{label}</label>}
      <div className={`ab4-cs-trigger ${open ? 'ab4-cs--open' : ''}`} onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: active.value }}>{active.label}</span>
        <i className="ri-arrow-down-s-line" />
      </div>
      {open && (
        <div className="ab4-cs-menu">
          {options.map(o => (
            <div key={o.value} className={`ab4-cs-opt ${o.value === value ? 'ab4-cs-opt--sel' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }} style={{ fontFamily: o.value }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Switch = ({ checked, onChange, label }) => (
  <div className={`ab4-switch ${checked ? 'ab4-switch--on' : ''}`} onClick={() => onChange(!checked)}>
    <div className="ab4-switch-track"><div className="ab4-switch-thumb" /></div>
    {label && <span className="ms-2">{label}</span>}
  </div>
);
