'use client';

import type { CSSProperties } from 'react';

export type SellerAddressDetails = {
  buildingName: string;
  roomNumber: string;
  street: string;
};

type SellerAddressFieldsProps = {
  value: SellerAddressDetails;
  onChange: (value: SellerAddressDetails) => void;
};

export function SellerAddressFields({ value, onChange }: SellerAddressFieldsProps) {
  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
        Add details that help customers find your entrance. These are optional.
      </p>
      <div style={fieldGridStyle}>
        <label style={labelStyle}>
          Building name
          <input
            maxLength={160}
            value={value.buildingName}
            onChange={(event) => onChange({ ...value, buildingName: event.target.value })}
            placeholder="e.g. Sarit Centre"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Room or unit number
          <input
            maxLength={80}
            value={value.roomNumber}
            onChange={(event) => onChange({ ...value, roomNumber: event.target.value })}
            placeholder="e.g. Room 5B"
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
          Street
          <input
            maxLength={160}
            value={value.street}
            onChange={(event) => onChange({ ...value, street: event.target.value })}
            placeholder="e.g. Karuna Road"
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
}

const fieldGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.8rem' };
const labelStyle: CSSProperties = { display: 'grid', gap: '0.45rem', fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.8rem 0.9rem', fontSize: '0.95rem' };
