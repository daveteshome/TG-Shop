import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: icon ? '10px 14px 10px 40px' : '10px 14px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${error ? 'var(--color-error)' : isFocused ? 'var(--color-primary)' : 'var(--color-border-main)'}`,
    outline: 'none',
    transition: 'all 0.2s ease',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    boxShadow: isFocused ? `0 0 0 3px ${error ? 'var(--color-error-bg)' : 'var(--color-primary-bg)'}` : 'none',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    color: 'var(--color-text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? 'var(--color-error)' : 'var(--color-text-tertiary)',
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {icon && <div style={iconStyle}>{icon}</div>}
        <input
          style={{ ...inputStyle, ...style }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <span style={helperStyle}>{error || helperText}</span>
      )}
    </div>
  );
};
