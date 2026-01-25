import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import i18n from '@/plugins/i18n'
import { useUserStore } from '@/stores/userStore'

// Import route modules
import { authRoutes } from './routes/auth'
import { mainRoutes } from './routes/main'
import { patientRoutes } from './routes/patient'
import { kioskRoutes } from './routes/kiosk'
import { consultationRoutes } from './routes/consultation'
import { adminRoutes } from './routes/admin'

// Combine all routes
const routes: RouteRecordRaw[] = [
  ...authRoutes,
  ...mainRoutes,
  ...patientRoutes,
  ...kioskRoutes,
  ...consultationRoutes,
  ...adminRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Add a global navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const allowedUnauthenticatedRoutes = ['Login', 'setup', 'register', 'about', 'logout', 'presentation', 'feedback', 'patientflow', 'showConsultationForms', 'showInternalConsultationForms', 'formview', 'completioninfo']

  if (!allowedUnauthenticatedRoutes.includes(String(to.name)) && !userStore.isAuthenticated()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && userStore.isAuthenticated()) {
    // Redirect authenticated users based on their role
    if (userStore.isKioskUser()) {
      next({ name: 'kiosk' })
    } else {
      next({ name: 'dashboard' })
    }
  } else if (userStore.isAuthenticated() && userStore.isKioskUser() && to.name !== 'kiosk' && !allowedUnauthenticatedRoutes.includes(String(to.name))) {
    // Restrict kiosk users to only the kiosk view and form views
    const allowedKioskRoutes = ['kiosk', 'showConsultationForms', 'showInternalConsultationForms', 'formview', 'kioskform', 'reviewform', 'consultationoverview', 'patientoverview']
    if (!allowedKioskRoutes.includes(String(to.name))) {
      next({ name: 'kiosk' })
    } else {
      next()
    }
  } else if (to.meta.requiredRole && userStore.isAuthenticated()) {
    // Check if user has the required role
    const requiredRole = to.meta.requiredRole as string
    if (!userStore.hasRole(requiredRole)) {
      next({ name: 'dashboard' })
    } else {
      next()
    }
  } else {
    next()
  }
})

// Add a navigation guard to update document title
router.afterEach((to) => {
  const titleKey = to.meta?.titleKey as string
  const appName = i18n.global.t('pageTitles.appName')

  if (titleKey) {
    const pageTitle = i18n.global.t(titleKey)
    document.title = `${pageTitle} - ${appName}`
  } else {
    document.title = appName
  }
})

export default router
