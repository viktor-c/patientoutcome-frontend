import { createRouter, createWebHistory } from 'vue-router'
import i18n from '@/plugins/i18n'

// import PatientView from '@/views/Patient/PatientView.vue' // Import the new view
// import CasesView from '@/views/Patient/PatientCaseView.vue' // Disabled for now
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
import SetupView from '@/views/SetupView.vue'
import AdminLayout from '@/views/Admin/AdminLayout.vue'
import UserManagement from '@/views/Admin/UserManagement.vue'
import FormTemplatesTester from '@/views/Admin/FormTemplatesTester.vue'
import BatchUserCreation from '@/views/Admin/BatchUserCreation.vue'
import DepartmentManagement from '@/views/Admin/DepartmentManagement.vue'
import ConsultationTemplates from '@/views/Admin/ConsultationTemplates.vue'
import SurgeryBlueprints from '@/views/Admin/SurgeryBlueprints.vue'
import CaseBlueprints from '@/views/Admin/CaseBlueprints.vue'
import BackupManagement from '@/views/Admin/BackupManagement.vue'
import { useUserStore } from '@/stores/userStore'

const routes = [
  { path: '/', name: 'Login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
  { path: '/setup', name: 'setup', component: SetupView, meta: { titleKey: 'pageTitles.setup' } },
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
  // patient flow, the patient can give the code he was assigned to at registration and begin the flow
  { path: '/flow/:code?', name: 'patientflow', component: BeginPatientFlowView, props: true, meta: { titleKey: 'pageTitles.patientFlow' } },
  { path: '/creation-flow', name: 'creation-flow', component: PatientCaseCreationFlowView, meta: { titleKey: 'pageTitles.creationFlow' } },
  { path: '/consultation/patient/:patientId/case/:caseId/consultation/:consultationId', name: 'consultation', component: ConsultationView, meta: { titleKey: 'pageTitles.consultation' } },
  { path: '/consultation/forms/external-code/:externalCode', name: 'showConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  { path: '/consultation/forms/consultation/:consultationId', name: 'showInternalConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  // { path: '/cases/patient/:patientId', name: 'cases', component: CasesView, props: true, meta: { titleKey: 'pageTitles.cases' } }, // Disabled for now
  { path: '/formview/consultation/:consultationId', name: 'formview', component: () => import('@/views/FormView.vue'), meta: { titleKey: 'pageTitles.formView' } },
  { path: '/review-form/:formId', name: 'reviewform', component: () => import('@/views/Overview/ReviewFormAnswers.vue'), meta: { titleKey: 'pageTitles.reviewForm' } },
  { path: '/consultation-overview/:consultationId', name: 'consultationoverview', component: () => import('@/views/Overview/ConsultationOverview.vue'), meta: { titleKey: 'pageTitles.consultationOverview' } },
  { path: '/testing', name: 'testing', component: () => import('@/views/Misc/TestingView.vue'), meta: { titleKey: 'pageTitles.testing' } },

  // Admin routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { titleKey: 'pageTitles.admin', requiredRole: 'admin' },
    children: [
      {
        path: 'users',
        name: 'admin-users',
        component: UserManagement,
        meta: { titleKey: 'pageTitles.adminUsers', requiredRole: 'admin' }
      },
      {
        path: 'departments',
        name: 'admin-departments',
        component: DepartmentManagement,
        meta: { titleKey: 'pageTitles.departmentManagement', requiredRole: 'admin' }
      },
      {
        path: 'batch-user-creation',
        name: 'admin-batch-user-creation',
        component: BatchUserCreation,
        meta: { titleKey: 'pageTitles.batchUserCreation', requiredRole: 'admin' }
      },
      {
        path: 'form-templates',
        name: 'admin-form-templates',
        component: FormTemplatesTester,
        meta: { titleKey: 'pageTitles.adminFormTemplates', requiredRole: 'admin' }
      },
      {
        path: 'consultation-templates',
        name: 'admin-consultation-templates',
        component: ConsultationTemplates,
        meta: { titleKey: 'pageTitles.consultationTemplates', requiredRole: 'admin' }
      },
      {
        path: 'surgery-blueprints',
        name: 'admin-surgery-blueprints',
        component: SurgeryBlueprints,
        meta: { titleKey: 'pageTitles.surgeryBlueprints', requiredRole: 'admin' }
      },
      {
        path: 'case-blueprints',
        name: 'admin-case-blueprints',
        component: CaseBlueprints,
        meta: { titleKey: 'pageTitles.caseBlueprints', requiredRole: 'admin' }
      },
      {
        path: 'backup-management',
        name: 'admin-backup-management',
        component: BackupManagement,
        meta: { titleKey: 'pageTitles.backupManagement', requiredRole: 'admin' }
      },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Add a global navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const allowedUnauthenticatedRoutes = ['Login', 'setup', 'register', 'about', 'logout', 'presentation', 'feedback', 'patientflow', 'showConsultationForms', 'showInternalConsultationForms', 'formview']

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
