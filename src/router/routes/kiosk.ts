import type { RouteRecordRaw } from 'vue-router'
import KioskView from '@/views/KioskView.vue'
import KioskForm from '@/views/KioskForm.vue'
import KioskListView from '@/views/Kiosk/KioskListView.vue'

export const kioskRoutes: RouteRecordRaw[] = [
  { path: '/kiosk', name: 'kiosk', component: KioskView, meta: { titleKey: 'pageTitles.kiosk' } },
  { path: '/kiosk/form/:formId', name: 'kioskform', component: KioskForm, meta: { titleKey: 'pageTitles.kioskForm' } },
  { path: '/kiosk-assignments', name: 'kioskassignments', component: KioskListView, meta: { titleKey: 'pageTitles.kioskList', requiredRole: 'mfa' } },
]
