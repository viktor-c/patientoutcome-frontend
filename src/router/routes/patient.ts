import type { RouteRecordRaw } from 'vue-router'
import PatientView from '@/views/Patient/PatientView.vue'
import PatientCaseCreationFlowView from '@/views/Patient/PatientCaseCreationFlowView.vue'

export const patientRoutes: RouteRecordRaw[] = [
  { path: '/patients', name: 'patients', component: PatientView, meta: { titleKey: 'pageTitles.patients' } },
  { path: '/patient-overview/:patientId', name: 'patientoverview', component: () => import('@/views/Overview/PatientOverview.vue'), props: true, meta: { titleKey: 'pageTitles.patientOverview' } },
  { path: '/case/:caseId', name: 'patientcaselanding', component: () => import('@/views/Patient/PatientCaseLanding.vue'), props: true, meta: { titleKey: 'pageTitles.patientCaseLanding' } },
  { path: '/creation-flow', name: 'creation-flow', component: PatientCaseCreationFlowView, meta: { titleKey: 'pageTitles.creationFlow' } },
]
