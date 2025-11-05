/**
 * Logo Constants
 * Centralized logo path configuration for the Fluid Pack application
 *
 * Update these paths when logo files are added to assets/images/logos/
 */

export const LOGO_PATHS = {
  // Main logo for login/register pages (200x200px recommended)
  MAIN: '/assets/images/logos/logo-main.png',

  // Icon logo for sidebars (64x64px or 128x128px recommended)
  ICON: '/assets/images/logos/logo-icon.png',

  // Favicon for browser tab (32x32px recommended)
  FAVICON: '/assets/images/logos/logo-favicon.png',

  // App icon for PWA/mobile (512x512px recommended)
  APP_ICON: '/assets/images/logos/logo-app-icon.png',

  // Spinner logo for loading states (64x64px recommended)
  SPINNER: '/assets/images/logos/logo-spinner.png',
} as const;

/**
 * Fallback to icon logo if spinner logo is not available
 */
export const LOGO_SPINNER = LOGO_PATHS.SPINNER || LOGO_PATHS.ICON;

/**
 * Check if logo file exists (for conditional rendering)
 * Note: This is a simple check - actual file existence validation
 * should be done at build time or through error handling
 */
export const LOGO_AVAILABLE = {
  MAIN: true, // Set to false if logo-main.png doesn't exist
  ICON: true, // Set to false if logo-icon.png doesn't exist
  FAVICON: true, // Set to false if logo-favicon.png doesn't exist
  APP_ICON: true, // Set to false if logo-app-icon.png doesn't exist
  SPINNER: true, // Set to false if logo-spinner.png doesn't exist
} as const;
