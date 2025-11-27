import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: 'var(--radius-lg)',
    transition: 'all 0.2s ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      fontSize: '13px',
      padding: '8px 14px',
      minHeight: '32px',
    },
    md: {
      fontSize: '14px',
      padding: '10px 18px',
      minHeight: '40px',
    },
    lg: {
      fontSize: '16px',
      padding: '12px 24px',
      minHeight: '48px',
    },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
      color: '#fff',
      boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border-main)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    danger: {
      background: 'var(--color-error)',
      color: '#fff',
      boxShadow: 'var(--shadow-sm)',
    },
    success: {
      background: 'var(--color-success)',
      color: '#fff',
      boxShadow: 'var(--shadow-sm)',
    },
  };

  const hoverStyle: React.CSSProperties = !disabled && !loading ? {
    transform: 'translateY(-1px)',
    boxShadow: variant !== 'ghost' ? 'var(--shadow-md)' : undefined,
  } : {};

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, {
          transform: 'translateY(0)',
          boxShadow: variantStyles[variant].boxShadow || 'none',
        });
      }}
      {...props}
    >
      {loading && <Spinner />}
      {!loading && icon && icon}
      {children}
    </button>
  );
};

const Spinner = () => (
  <div
    style={{
      width: '14px',
      height: '14px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }}
  />
);

// Add keyframes for spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
