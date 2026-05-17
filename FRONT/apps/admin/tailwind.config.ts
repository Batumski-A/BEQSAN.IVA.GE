import baseConfig from '../web/tailwind.config';
import type { Config } from 'tailwindcss';

// Admin = same tokens as the public web app, but tighter spacing (dense variant).
const config: Config = {
  ...baseConfig,
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      spacing: {
        ...(baseConfig.theme?.extend?.spacing ?? {}),
        // Admin uses 48-72px section padding instead of 96-128 in web.
        'dense-sm': '32px',
        'dense-md': '48px',
        'dense-lg': '64px',
      },
    },
  },
};

export default config;
