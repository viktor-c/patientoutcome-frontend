# Frontend Development Guide

## Vue.js Architecture
This patient outcome frontend uses **Vue 3 Composition API** with TypeScript, Vuetify 3, and a centralized API client architecture.

### Component Structure
- **Always use**: `<script setup lang="ts">`, then `<template>`, then `<style>`
- **Composition API only**: No Options API patterns
- **Props/Emits**: Define with TypeScript interfaces, use `defineProps<T>()` and `defineEmits<T>()`

## Internationalization (i18n)
- **Always use i18n** except for logging messages (logs stay in English)
- Import `t` function: `import { useI18n } from 'vue-i18n'; const { t } = useI18n()`
- **Never use** `$t` or `this.$t` - use the imported `t` function
- **Don't inline translation strings** - add to `locales/de.ts` and `locales/en.ts`
- Pattern: `t('section.key')` maps to `{ section: { key: 'value' } }` in locale files

## API Integration
- **Use provided API client** from `@/api` - it's pre-configured with authentication
- Available APIs: `userApi`, `patientApi`, `formApi`, `consultationApi`, `codeApi`, `patientCaseApi`, `formTemplateApi`, `kioskApi`, `surgeryApi`, `blueprintApi`
- **Handle errors gracefully** in all API calls
- API client auto-includes credentials and base URL configuration

## State Management
- **Pinia stores** for global state (see `stores/userStore.ts` pattern)
- Use `useLocalStorage()` from `@vueuse/core` for persistent data
- **User Authentication**: Session managed via cookies, check `userStore.isAuthenticated()`
- **Role-based access**: Use `userStore.hasRole(role)` and `userStore.isKioskUser()`

## Key Development Patterns
- **Form components**: Reference existing patterns in `components/forms/` with external submit support
- **Vuetify theming**: Pre-configured in `plugins/vuetify.ts`
- **Date handling**: Use `@vuepic/vue-datepicker` and dayjs utilities
- **Notifications**: Use notifier plugin for user feedback
- **Component composition**: Use `@vueuse/components` for common functionality

## Development Workflow
- **Dev server**: `npm run dev`
- **Testing**: Vitest for unit tests (`npm run test:unit`), Playwright for E2E (`npm run test:e2e`)  
- **Type checking**: `npm run type-check` - always fix TypeScript errors
- **Linting**: ESLint with Prettier (`npm run lint`)
- **API updates**: Regenerate when backend changes (see backend instructions)

## Critical Dependencies
- **Vue 3 + Vuetify 3**: Material Design component library
- **Vue Router**: File-based routing with TypeScript
- **Vue I18n**: Complete internationalization setup
- **Pinia**: State management with TypeScript support
- **VueUse**: Composition utilities for common patterns


# AI Agent Coding Guide: patientoutcome-frontend

## Architecture & Data Flow
- **Vue 3 + TypeScript + Vite**: Uses Composition API exclusively. All components use `<script setup lang="ts">`.
- **Centralized API Layer**: All backend access via pre-configured API clients in `src/api.ts` (see: `userApi`, `patientApi`, etc). These wrap OpenAPI-generated classes in `src/api/apis/` and are auto-authenticated.
- **State Management**: Pinia stores in `src/stores/` (see `userStore.ts` for auth/session, `notifierStore.ts` for notifications). Use `useLocalStorage()` from `@vueuse/core` for persistence.
- **Routing**: File-based routes in `src/router/index.ts`. Route guards enforce authentication and role-based access (see `userStore` methods).
- **Internationalization**: All user-facing strings must use i18n (`useI18n`/`t` from `vue-i18n`). Add new keys to `src/locales/en.ts` and `src/locales/de.ts`. Never inline translation strings.
- **UI**: Vuetify 3 for all UI components. Theming is pre-configured in `src/plugins/vuetify.ts`.

## Project-Specific Patterns
- **Form Handling**: Use patterns from `src/components/forms/` for external submit, validation, and progress. See `FormProgressCard.vue` for multi-step flows.
- **Date Handling**: Use `@vuepic/vue-datepicker` and `src/utils/dayjs.ts` for all date logic.
- **Notifications**: Use the notifier plugin (`src/plugins/notifier.ts`) and `notifierStore` for user feedback.
- **Role/Session Checks**: Use `userStore.isAuthenticated()`, `userStore.hasRole(role)`, and `userStore.isKioskUser()` for access control.
- **Testing/Dev Utilities**: `src/views/Misc/TestingView.vue` provides a sitemap and backend seeding links for local development.

## Developer Workflow
- **Install**: `npm install`
- **Dev Server**: `npm run dev`
- **Type Check**: `npm run type-check` (uses `vue-tsc` for `.vue` support)
- **Build**: `npm run build`
- **Unit Tests**: `npm run test:unit` (Vitest)
- **E2E Tests**: `npm run test:e2e` (Playwright; see `playwright.config.ts` for browser configs)
- **Lint**: `npm run lint` (ESLint + Prettier)
- **API Regeneration**: When backend changes, regenerate API clients (see backend instructions).

## Integration & Conventions
- **API URLs**: Configured via `VITE_API_URL` env var. All API calls use credentials (`credentials: "include"`).
- **Docker**: See `DOCKER_README.md` for build/deploy. Dev and prod Dockerfiles are provided.
- **Nginx**: Used for static file serving in production (`nginx.conf`).
- **Environment Variables**: Configure via `.env` files or Docker Compose as needed.

## Examples
- **i18n Usage**:
	```ts
	import { useI18n } from 'vue-i18n';
	const { t } = useI18n();
	t('section.key'); // Add to locales/en.ts and de.ts
	```
- **API Usage**:
	```ts
	import { patientApi } from '@/api';
	await patientApi.getPatientById(id);
	```
- **Pinia Store**:
	```ts
	import { useUserStore } from '@/stores/userStore';
	const userStore = useUserStore();
	if (userStore.isAuthenticated()) { ... }
	```

## Key Files & Directories
- `src/api.ts`, `src/api/apis/`: API client setup and OpenAPI classes
- `src/stores/`: Pinia stores for global state
- `src/components/forms/`: Form patterns and composition
- `src/plugins/`: Vuetify, i18n, notifier setup
- `src/router/index.ts`: Route definitions and guards
- `src/locales/`: i18n translation files
- `src/views/Misc/TestingView.vue`: Dev/test utilities
- `DOCKER_README.md`: Docker/Nginx/deployment details

## General prompts
- "commit changes" is an alias for "commit changes to patientoutcome-frontend following best practices, logically group related changes into single commits; create multiple commits if necessary for clarity"


---
If any section is unclear or missing project-specific details, please provide feedback for further refinement.