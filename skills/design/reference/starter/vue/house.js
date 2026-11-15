// House starter: Vuetify theme + component defaults. Copy to src/plugins/house.js and
//   createVuetify({ theme: houseTheme, defaults: houseDefaults })
// Swap the values marked SWAP together with the same four in tokens.css. Vuetify theme colours
// cannot carry alpha, so glass fills, rims and shadows live in tokens.css, not here.

const status = { success: '#2e9e5b', warning: '#d99a1b', error: '#d9503f', info: '#3b82d6' }

export const houseTheme = {
  defaultTheme: 'light',
  themes: {
    light: {
      dark: false,
      colors: {
        background: '#f4f1ea',        // SWAP ground
        surface: '#fdfcf9',
        'surface-variant': '#ece8df',
        'on-surface-variant': '#1b1a17',
        primary: '#0b7a73',           // SWAP accent
        'on-primary': '#ffffff',      // SWAP
        secondary: '#1b1a17',
        'on-secondary': '#f6f2ea',
        'on-background': '#1b1a17',
        'on-surface': '#1b1a17',
        ...status,
      },
      variables: { 'medium-emphasis-opacity': 0.72, 'border-opacity': 0.08 },
    },
    dark: {
      dark: true,
      colors: {
        background: '#171412',        // SWAP ground
        surface: '#25211e',
        'surface-variant': '#372e28',
        'on-surface-variant': '#f3efe8',
        primary: '#3cc2b5',           // SWAP accent
        'on-primary': '#10201e',      // SWAP
        secondary: '#f3efe8',
        'on-secondary': '#1b1a17',
        'on-background': '#f3efe8',
        'on-surface': '#f3efe8',
        ...status,
      },
      variables: { 'medium-emphasis-opacity': 0.72, 'border-opacity': 0.09 },
    },
  },
}

const field = { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto' }

export const houseDefaults = {
  VBtn: { rounded: 'pill', elevation: 0, height: 42 },          // sentence case comes from tokens.css
  VBtnToggle: { rounded: 'pill', density: 'comfortable' },
  VChip: { rounded: 'pill', variant: 'tonal', size: 'small' },  // status uses <StatusPill>, not a raw chip
  VCard: { rounded: 'xl', elevation: 0 },                       // tokens.css draws the surface
  VSheet: { rounded: 'xl' },
  VDialog: { maxWidth: 520 },
  VMenu: { offset: 8 },
  VAppBar: { flat: true },
  VTextField: field,
  VSelect: field,
  VAutocomplete: field,
  VTextarea: field,
  VTable: { density: 'comfortable' },
  VDataTable: { density: 'comfortable' },
  VList: { rounded: 'lg' },
  VTooltip: { location: 'top' },
}

/** Money as plain text (sentences, notes). In columns and KPIs use <Money>, which also aligns digits. */
export function money(value, currency, locale = 'en') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, numberingSystem: 'latn' }).format(value)
}
