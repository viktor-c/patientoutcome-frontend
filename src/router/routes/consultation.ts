import type { RouteRecordRaw } from 'vue-router'
import ConsultationView from '@/views/Patient/ConsultationView.vue'
import ShowConsultationForms from '@/views/Overview/ShowConsultationForms.vue'

export const consultationRoutes: RouteRecordRaw[] = [
  { path: '/consultation/patient/:patientId/case/:caseId/consultation/:consultationId', name: 'consultation', component: ConsultationView, meta: { titleKey: 'pageTitles.consultation' } },
  { path: '/consultation/forms/external-code/:externalCode', name: 'showConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  { path: '/consultation/forms/consultation/:consultationId', name: 'showInternalConsultationForms', component: ShowConsultationForms, props: true, meta: { titleKey: 'pageTitles.consultationForms' } },
  { path: '/formview/consultation/:consultationId', name: 'formview', component: () => import('@/views/FormView.vue'), meta: { titleKey: 'pageTitles.formView' } },
  { path: '/consultation-overview/:consultationId', name: 'consultationoverview', component: () => import('@/views/Overview/ConsultationOverview.vue'), meta: { titleKey: 'pageTitles.consultationOverview' } },
]
