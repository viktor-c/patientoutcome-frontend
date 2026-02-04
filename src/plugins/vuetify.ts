import { createVuetify } from 'vuetify';

import 'vuetify/styles'; // Import Vuetify styles
import { aliases as mdiAliases, mdi } from 'vuetify/iconsets/mdi'; // Optional: Material Design Icons

import { mdiIconAliases } from '@jsonforms/vue-vuetify';
import '@mdi/font/css/materialdesignicons.css'; // Ensure you are using css-loader

import DayJsAdapter from '@date-io/dayjs'
import en from 'dayjs/locale/en'
import de from 'dayjs/locale/de'


export default createVuetify({
  date: {
    adapter: DayJsAdapter,
    locale: { en, de },
  },
  // https://vuetifyjs.com/en/getting-started/quick-start
  // we use **vite-plugin-vuetify** to autoimport component; https://www.npmjs.com/package/vite-plugin-vuetify
  icons: {
    defaultSet: 'mdi',
    aliases: { ...mdiAliases, ...mdiIconAliases },
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
        },
      },
    },
  },
  // Global component defaults - set compact density for all input components
  defaults: {
    VTextField: { density: 'compact' },
    VTextarea: { density: 'compact' },
    VSelect: { density: 'compact' },
    VAutocomplete: { density: 'compact' },
    VCombobox: { density: 'compact' },
    VCheckbox: { density: 'compact' },
    VSwitch: { density: 'compact' },
    VRadioGroup: { density: 'compact' },
    VSlider: { density: 'compact' },
    VRangeSlider: { density: 'compact' },
    VDatePicker: { density: 'compact' },
    VTimePicker: { density: 'compact' },
  },
});
