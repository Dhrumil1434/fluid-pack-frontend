export const LOGO_ASSETS = {
  // Mapped to files present in src/assets/logo
  // primary-logo.png used on light backgrounds (login/register headers)
  // avtaar.png used on dark/loader backgrounds
  // favicon.png reserved for favicons/compact usage
  primary: 'assets/logo/primary-logo.png',
  white: 'assets/logo/avtaar.png',
  smallWhite: 'assets/logo/avtaar.png',
} as const;

export type LogoVariant = 'primary' | 'white';
