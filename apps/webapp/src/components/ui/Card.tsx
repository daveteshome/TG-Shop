import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  hover = false,
  padding = 'md',
  style,
  className,
}) => {
  const paddingMap = {
    none: '0',
    sm: 'var(--spacing-md)',
    md: 'var(--spacing-lg)',
    lg: 'var(--spacing-xl)',
  };

  const baseStyle: React.CSSProperties = {
    background: 'var(--color-bg-primary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border-light)',
    padding: paddingMap[padding],
    transition: 'all 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
  };

  const hoverStyle: React.CSSProperties = hover || onClick ? {
    boxShadow: 'var(--shadow-md)',
    borderColor: 'var(--color-border-main)',
    transform: 'translateY(-2px)',
  } : {};

  return (
    <div
      className={className}
      style={{ ...baseStyle, ...style }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, {
          boxShadow: 'none',
          borderColor: 'var(--color-border-light)',
          transform: 'translateY(0)',
        });
      }}
    >
      {children}
    </div>
  );
};
