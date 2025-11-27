// Design System & Theme
export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      main: '#6366F1', // Indigo
      light: '#818CF8',
      dark: '#4F46E5',
      bg: '#EEF2FF',
    },
    // Secondary colors
    secondary: {
      main: '#EC4899', // Pink
      light: '#F472B6',
      dark: '#DB2777',
      bg: '#FCE7F3',
    },
    // Neutral colors
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    // Semantic colors
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      bg: '#D1FAE5',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      bg: '#FEF3C7',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      bg: '#FEE2E2',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      bg: '#DBEAFE',
    },
    // Background colors
    bg: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
    },
    // Text colors
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    // Border colors
    border: {
      light: '#F3F4F6',
      main: '#E5E7EB',
      dark: '#D1D5DB',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },
  
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
} as const;

// Helper functions
export const getStatusColor = (status: string) => {
  const statusMap: Record<string, { bg: string; text: string; border: string }> = {
    pending: {
      bg: theme.colors.warning.bg,
      text: theme.colors.warning.dark,
      border: theme.colors.warning.light,
    },
    paid: {
      bg: theme.colors.info.bg,
      text: theme.colors.info.dark,
      border: theme.colors.info.light,
    },
    shipped: {
      bg: theme.colors.primary.bg,
      text: theme.colors.primary.dark,
      border: theme.colors.primary.light,
    },
    completed: {
      bg: theme.colors.success.bg,
      text: theme.colors.success.dark,
      border: theme.colors.success.light,
    },
    cancelled: {
      bg: theme.colors.error.bg,
      text: theme.colors.error.dark,
      border: theme.colors.error.light,
    },
  };
  
  return statusMap[status.toLowerCase()] || {
    bg: theme.colors.neutral[100],
    text: theme.colors.neutral[700],
    border: theme.colors.neutral[300],
  };
};

export type Theme = typeof theme;
