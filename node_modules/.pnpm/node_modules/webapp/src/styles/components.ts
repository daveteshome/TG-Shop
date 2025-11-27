// Reusable component styles
import { theme } from './theme';
import type { CSSProperties } from 'react';

export const buttonStyles = {
  base: {
    fontFamily: theme.typography.fontFamily.base,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.lg,
    border: 'none',
    cursor: 'pointer',
    transition: theme.transitions.base,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    outline: 'none',
  } as CSSProperties,
  
  primary: {
    background: `linear-gradient(135deg, ${theme.colors.primary.main} 0%, ${theme.colors.primary.dark} 100%)`,
    color: theme.colors.text.inverse,
    boxShadow: theme.shadows.sm,
  } as CSSProperties,
  
  secondary: {
    background: theme.colors.bg.primary,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.main}`,
  } as CSSProperties,
  
  ghost: {
    background: 'transparent',
    color: theme.colors.text.secondary,
    border: 'none',
  } as CSSProperties,
  
  danger: {
    background: theme.colors.error.main,
    color: theme.colors.text.inverse,
  } as CSSProperties,
  
  small: {
    fontSize: theme.typography.fontSize.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  } as CSSProperties,
  
  large: {
    fontSize: theme.typography.fontSize.lg,
    padding: `${theme.spacing.lg} ${theme.spacing['2xl']}`,
  } as CSSProperties,
};

export const cardStyles = {
  base: {
    background: theme.colors.bg.primary,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    transition: theme.transitions.base,
  } as CSSProperties,
  
  hover: {
    boxShadow: theme.shadows.md,
    borderColor: theme.colors.border.main,
  } as CSSProperties,
  
  interactive: {
    cursor: 'pointer',
  } as CSSProperties,
};

export const inputStyles = {
  base: {
    fontFamily: theme.typography.fontFamily.base,
    fontSize: theme.typography.fontSize.base,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border.main}`,
    outline: 'none',
    transition: theme.transitions.base,
    width: '100%',
    background: theme.colors.bg.primary,
    color: theme.colors.text.primary,
  } as CSSProperties,
  
  focus: {
    borderColor: theme.colors.primary.main,
    boxShadow: `0 0 0 3px ${theme.colors.primary.bg}`,
  } as CSSProperties,
  
  error: {
    borderColor: theme.colors.error.main,
  } as CSSProperties,
};

export const badgeStyles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.tight,
  } as CSSProperties,
  
  primary: {
    background: theme.colors.primary.bg,
    color: theme.colors.primary.dark,
  } as CSSProperties,
  
  success: {
    background: theme.colors.success.bg,
    color: theme.colors.success.dark,
  } as CSSProperties,
  
  warning: {
    background: theme.colors.warning.bg,
    color: theme.colors.warning.dark,
  } as CSSProperties,
  
  error: {
    background: theme.colors.error.bg,
    color: theme.colors.error.dark,
  } as CSSProperties,
  
  neutral: {
    background: theme.colors.neutral[100],
    color: theme.colors.neutral[700],
  } as CSSProperties,
};

export const containerStyles = {
  page: {
    minHeight: '100vh',
    background: theme.colors.bg.secondary,
    paddingBottom: '80px',
  } as CSSProperties,
  
  section: {
    padding: theme.spacing.lg,
  } as CSSProperties,
  
  grid: {
    display: 'grid',
    gap: theme.spacing.md,
  } as CSSProperties,
  
  flex: {
    display: 'flex',
    gap: theme.spacing.md,
  } as CSSProperties,
};
