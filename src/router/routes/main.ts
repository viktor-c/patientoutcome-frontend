import type { RouteRecordRaw } from 'vue-router'
import BeginPatientFlowView from '@/views/PatientFlow/BeginPatientFlowView.vue'
import DashboardView from '@/views/Overview/DashboardView.vue'
import ActivityLogView from '@/views/ActivityLogView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

export const mainRoutes: RouteRecordRaw[] = [
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { titleKey: 'pageTitles.dashboard' } },
  { path: '/activity-log', name: 'activitylog', component: ActivityLogView, meta: { titleKey: 'pageTitles.activityLog', requiredRole: 'developer' } },
  { path: '/statistics/:caseId', name: 'statistics', component: StatisticsView, props: true, meta: { titleKey: 'pageTitles.statistics' } },
  { path: '/flow/:code?', name: 'patientflow', component: BeginPatientFlowView, props: true, meta: { titleKey: 'pageTitles.patientFlow' } },
  { path: '/review-form/:formId', name: 'reviewform', component: () => import('@/views/Overview/ReviewFormAnswers.vue'), meta: { titleKey: 'pageTitles.reviewForm' } },
  { path: '/testing', name: 'testing', component: () => import('@/views/Misc/TestingView.vue'), meta: { titleKey: 'pageTitles.testing' } },
]
