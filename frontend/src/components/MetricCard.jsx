import React from 'react';

export default function MetricCard({
  label,
  value,
  unit,
  tone = 'neutral',
  helper = '',
  trend = '',
  active = false,
  onClick,
}) {
  const CardTag = onClick ? 'button' : 'div';

  return (
    <CardTag className={`metric-card ${tone} ${active ? 'active' : ''}`} type={onClick ? 'button' : undefined} onClick={onClick}>
      <div className="metric-topline">
        <p>{label}</p>
        {trend ? <span>{trend}</span> : null}
      </div>
      <h3>
        {value}
        <span>{unit}</span>
      </h3>
      {helper ? <small>{helper}</small> : null}
    </CardTag>
  );
}
