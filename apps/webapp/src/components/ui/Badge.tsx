import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
}) => {
  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary-bg)',
      color: 'var(--color-primary-dark)',
    },
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success-dark)',
    },
    warning: {
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning-dark)',
    },
    error: {
      background: 'var(--color-error-bg)',
      color: 'var(--color-error-dark)',
    },
    info: {
      background: 'var(--color-info-bg)',
      color: 'var(--color-info-dark)',
    },
    neutral: {
      background: '#F3F4F6',
      color: '#4B5563',
    },
  };

  const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
    sm: {
      fontSize: '11px',
      padding: '3px 8px',
    },
    md: {
      fontSize: '12px',
      padding: '4px 10px',
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };

  return (
    <span
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon && icon}
      {children}
    </span>
  );
};
