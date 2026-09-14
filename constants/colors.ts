/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F5F7FA',
    tint: '#3DD6C6',
    background: '#07111F',
    foreground: '#F5F7FA',
    card: '#0E1D31',
    cardForeground: '#F5F7FA',
    primary: '#3DD6C6',
    primaryForeground: '#07111F',
    secondary: '#152A41',
    secondaryForeground: '#DCE7F3',
    muted: '#102239',
    mutedForeground: '#8FA8BF',
    accent: '#FFB45B',
    accentForeground: '#07111F',
    destructive: '#FF6B72',
    destructiveForeground: '#FFFFFF',
    border: '#1D3854',
    input: '#1D3854',
  },

  dark: {
    text: '#F5F7FA',
    tint: '#3DD6C6',
    background: '#07111F',
    foreground: '#F5F7FA',
    card: '#0E1D31',
    cardForeground: '#F5F7FA',
    primary: '#3DD6C6',
    primaryForeground: '#07111F',
    secondary: '#152A41',
    secondaryForeground: '#DCE7F3',
    muted: '#102239',
    mutedForeground: '#8FA8BF',
    accent: '#FFB45B',
    accentForeground: '#07111F',
    destructive: '#FF6B72',
    destructiveForeground: '#FFFFFF',
    border: '#1D3854',
    input: '#1D3854',
  },

  radius: 18,
};

export default colors;
