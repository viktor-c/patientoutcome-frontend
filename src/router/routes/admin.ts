import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/views/Admin/AdminLayout.vue'
import UserManagement from '@/views/Admin/UserManagement.vue'
import FormTemplatesTester from '@/views/Admin/FormTemplatesTester.vue'
import BatchUserCreation from '@/views/Admin/BatchUserCreation.vue'
import DepartmentManagement from '@/views/Admin/DepartmentManagement.vue'
import ConsultationTemplates from '@/views/Admin/ConsultationTemplates.vue'
import SurgeryBlueprints from '@/views/Admin/SurgeryBlueprints.vue'
import CaseBlueprints from '@/views/Admin/CaseBlueprints.vue'
import BackupManagement from '@/views/Admin/BackupManagement.vue'
import SettingsManagement from '@/views/Admin/SettingsManagement.vue'
import DeletedItemsManagement from '@/views/Admin/DeletedItemsManagement.vue'

export const adminRoutes: RouteRecordRaw[] = [
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
      {
        path: 'settings',
        name: 'admin-settings',
        component: SettingsManagement,
        meta: { titleKey: 'pageTitles.settingsManagement', requiredRole: 'admin' }
      },
      {
        path: 'deleted-items',
        name: 'admin-deleted-items',
        component: DeletedItemsManagement,
        meta: { titleKey: 'pageTitles.deletedItemsManagement', requiredRole: 'admin' }
      },
    ]
  },
]
