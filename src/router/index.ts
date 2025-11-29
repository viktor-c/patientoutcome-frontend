import { createRouter, createWebHistory } from 'vue-router'
import i18n from '@/plugins/i18n'

// import PatientView from '@/views/Patient/PatientView.vue' // Import the new view
import CasesView from '@/views/Patient/PatientCaseView.vue'
import ConsultationView from '@/views/Patient/ConsultationView.vue'
import PatientCaseCreationFlowView from '@/views/Patient/PatientCaseCreationFlowView.vue'
import NotFound from '@/views/Misc/NotFound.vue' // Ensure this file exists at the specified path
import ShowConsultationForms from '@/views/Overview/ShowConsultationForms.vue'
import BeginPatientFlowView from '@/views/PatientFlow/BeginPatientFlowView.vue'
import DashboardView from '@/views/Overview/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import KioskView from '@/views/KioskView.vue'
import KioskForm from '@/views/KioskForm.vue'
import KioskListView from '@/views/Kiosk/KioskListView.vue'
import LogoutView from '@/views/LogoutView.vue'
import TechPresentation from '@/gffc-presentation/TechPresentation.vue'
import ActivityLogView from '@/views/ActivityLogView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import { useUserStore } from '@/stores/userStore'

const routes = [
  { path: '/', name: 'Login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { titleKey: 'pageTitles.register' } },
  { path: '/logout', name: 'logout', component: LogoutView, meta: { titleKey: 'pageTitles.logout' } },
  { path: '/about', name: 'about', component: () => import('@/views/Misc/AboutView.vue'), meta: { titleKey: 'pageTitles.about' } },
  { path: '/feedback', name: 'feedback', component: () => import('@/views/FeedbackView.vue'), meta: { titleKey: 'pageTitles.feedback' } },
  { path: '/presentation', name: 'presentation', component: TechPresentation, meta: { titleKey: 'pageTitles.presentation' } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound, meta: { titleKey: 'pageTitles.notFound' } },

  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { titleKey: 'pageTitles.dashboard' } },
  { path: '/activity-log', name: 'activitylog', component: ActivityLogView, meta: { titleKey: 'pageTitles.activityLog', requiredRole: 'developer' } },
  { path: '/statistics/:caseId', name: 'statistics', component: StatisticsView, props: true, meta: { titleKey: 'pageTitles.statistics' } },
  { path: '/case/:caseId', name: 'patientcaselanding', component: () => import('@/views/Patient/PatientCaseLanding.vue'), props: true, meta: { titleKey: 'pageTitles.patientCaseLanding' } },
  // disabled patients view for now, this should be accessed via dashboard
  //{ path: '/patients', name: 'patients', component: PatientView, meta: { titleKey: 'pageTitles.patients' } },
  { path: '/patient-overview/:patientId', name: 'patientoverview', component: () => import('@/views/Overview/PatientOverview.vue'), props: true, meta: { titleKey: 'pageTitles.patientOverview' } },

  { path: '/kiosk', name: 'kiosk', component: KioskView, meta: { titleKey: 'pageTitles.kiosk' } },
  { path: '/kiosk/form/:formId', name: 'kioskform', component: KioskForm, meta: { titleKey: 'pageTitles.kioskForm' } },
  { path: '/kiosk-assignments', name: 'kioskassignments', component: KioskListView, meta: { titleKey: 'pageTitles.kioskList', requiredRole: 'mfa' } },
  { path: '/flow/', name: 'patientflow', component: BeginPatientFlowView, meta: { titleKey: 'pageTitles.patientFlow' } },
  { path: '/creation-flow', name: 'creation-flow', component: PatientCaseCreationFlowView, meta: { titleKey: 'pageTitles.creationFlow' } },
  { path: '/consultation/patient/:patientId/case/:caseId/consultation/:consultationId', name: 'consultation', component: ConsultationView, meta: { titleKey: 'pageTitles.consultation' } },
  { path: '/consultation/forms/external-code/:externalCode', name: 'showConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  { path: '/consultation/forms/consultation/:consultationId', name: 'showInternalConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  { path: '/cases/patient/:patientId', name: 'cases', component: CasesView, props: true, meta: { titleKey: 'pageTitles.cases' } },
  { path: '/formview/consultation/:consultationId', name: 'formview', component: () => import('@/views/FormView.vue'), meta: { titleKey: 'pageTitles.formView' } },
  { path: '/review-form/:formId', name: 'reviewform', component: () => import('@/views/Overview/ReviewFormAnswers.vue'), meta: { titleKey: 'pageTitles.reviewForm' } },
  { path: '/consultation-overview/:consultationId', name: 'consultationoverview', component: () => import('@/views/Overview/ConsultationOverview.vue'), meta: { titleKey: 'pageTitles.consultationOverview' } },
  { path: '/testing', name: 'testing', component: () => import('@/views/Misc/TestingView.vue'), meta: { titleKey: 'pageTitles.testing' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Add a global navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const allowedUnauthenticatedRoutes = ['Login', 'register', 'about', 'logout', 'presentation', 'feedback']

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
