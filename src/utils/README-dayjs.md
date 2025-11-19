# Dayjs Utility Usage

This project includes a centralized dayjs utility for consistent date formatting across the application with proper internationalization support.

## Usage

### In Vue Components (Recommended)

Use the `useDateFormat` composable for reactive locale-aware date formatting:

```typescript
import { useDateFormat } from '@/composables/useDateFormat'

export default {
  setup() {
    const { formatLocalizedDate, formatLocalizedRelativeTime, dateFormats } = useDateFormat()
    
    // Format with full date and time (default)
    const fullDate = formatLocalizedDate('2025-09-05T14:30:00Z')
    
    // Format with custom format
    const shortDate = formatLocalizedDate('2025-09-05T14:30:00Z', dateFormats.shortDate)
    
    // Relative time formatting
    const relativeTime = formatLocalizedRelativeTime('2025-09-05T14:30:00Z')
    
    return {
      fullDate,
      shortDate,
      relativeTime
    }
  }
}
```

### Direct Utility Usage

For use outside Vue components or when you need to specify a locale explicitly:

```typescript
import { formatDate, formatRelativeTime, dateFormats } from '@/utils/dayjs'

// Format with specific locale
const germanDate = formatDate('2025-09-05T14:30:00Z', 'de', dateFormats.fullDate)
const englishDate = formatDate('2025-09-05T14:30:00Z', 'en', dateFormats.fullDate)

// Relative time with specific locale
const germanRelative = formatRelativeTime('2025-09-05T14:30:00Z', 'de')
```

## Available Formats

The `dateFormats` object provides common format presets:

- `shortDate`: 'L' - 09/05/2025 or 05.09.2025
- `mediumDate`: 'LL' - September 5, 2025 or 5. September 2025
- `longDate`: 'LLL' - September 5, 2025 2:30 PM
- `fullDate`: 'LLLL' - Thursday, September 5, 2025 2:30 PM
- `shortTime`: 'LT' - 2:30 PM or 14:30
- `longTime`: 'LTS' - 2:30:25 PM or 14:30:25
- `dateTime`: 'L LT' - 09/05/2025 2:30 PM
- `isoDate`: 'YYYY-MM-DD' - 2025-09-05
- `isoDateTime`: 'YYYY-MM-DD HH:mm:ss' - 2025-09-05 14:30:25

## Supported Locales

Currently supported locales:
- `de` - German
- `en` - English (default fallback)

## Benefits

- **Centralized Configuration**: Dayjs is configured once with all necessary plugins
- **Automatic Locale Detection**: Uses current i18n locale automatically in Vue components
- **Consistent Formatting**: Same date formats across the entire application
- **Type Safety**: Full TypeScript support
- **Performance**: Lightweight compared to moment.js
- **Extensible**: Easy to add new locales and format functions
