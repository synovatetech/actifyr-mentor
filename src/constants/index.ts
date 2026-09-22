// ============================================
// Application Constants
// ============================================

export const APP_NAME = 'Actifyr Mentor Portal';
export const APP_DESCRIPTION = 'Mentor Portal - Manage your mentees, teams, goals, and submissions';

// Colors from Figma
export const COLORS = {
  PRIMARY: '#EE4723',
  BACKGROUND: '#F9FAFB',
  FOREGROUND: '#1E1E1E',
  TEXT_SECONDARY: 'rgba(30, 30, 30, 0.7)',
  TEXT_FEATURE: 'rgba(30, 30, 30, 0.8)',
  SUCCESS: '#00B625',
  INFO: '#00A0FF',
  CARD_BG: 'rgba(255, 255, 255, 0.8)',
  TOGGLE_BG: '#FAFAFA',
  FEATURE_BG: '#FEFBFB',
  WHITE: '#FFFFFF',
} as const;

// Typography from Figma
export const TYPOGRAPHY = {
  TITLE: {
    size: '34px',
    lineHeight: '41px',
    weight: 700,
  },
  SUBTITLE: {
    size: '16px',
    lineHeight: '26px',
    weight: 400,
    letterSpacing: '0.02em',
  },
  PLAN_NAME: {
    size: '22px',
    lineHeight: '26px',
    weight: 700,
  },
  PRICE: {
    size: '30px',
    lineHeight: '36px',
    weight: 700,
  },
  BUTTON: {
    size: '16px',
    lineHeight: '19px',
    weight: 510,
  },
  FEATURE: {
    size: '12px',
    lineHeight: '15px',
    weight: 274,
  },
  BADGE: {
    size: '16px',
    lineHeight: '20px',
    weight: 400,
    letterSpacing: '0.02em',
  },
} as const;

// Card dimensions from Figma
export const CARD_DIMENSIONS = {
  REGULAR: {
    width: 300,
    height: 570,
  },
  CUSTOM: {
    width: 300,
    height: 328,
  },
  GAP: 27,
} as const;

// Layout dimensions from Figma
export const LAYOUT = {
  NAVBAR_HEIGHT: 80,
  CONTENT_WIDTH: 1281,
  CONTENT_LEFT: 116,
  CONTENT_TOP: 135, // 83 + 52
} as const;

// API Configuration
// Always same-origin now: the browser only ever talks to this app's own
// /api/* routes (src/app/api/**/route.ts), which attach the Authorization
// header server-side from the httpOnly auth cookie and forward to the real
// backend (see src/lib/server/apiProxy.ts, which reads NEXT_PUBLIC_API_BASE_URL
// for that real host).
export const API_BASE_URL = '/api';
export const API_TIMEOUT = 1200000; // 20 minutes

// Shown wherever an audio media item has no uploaded thumbnail.
export const DEFAULT_AUDIO_THUMBNAIL = '/images/audio-default-thumbnail.jpg';

// Application Routes
export const ROUTES = {
  HOME: '/',
  PROGRAMS: '/programs',
  PROGRAM_ADMIN: '/programAdmin',
  FEEDBACKS: '/feedbacks',
  SUPPORT: '/support',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
} as const;
