'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff7043',
    },
    background: {
      default: '#f7f9fc',
    },
  },
  typography: {
    fontFamily: ['"Noto Sans JP"', '"Inter"', 'system-ui', 'sans-serif'].join(', '),
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;
