import type { RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import LogoutView from '@/views/LogoutView.vue'
import SetupView from '@/views/SetupView.vue'
import TechPresentation from '@/gffc-presentation/TechPresentation.vue'
import NotFound from '@/views/Misc/NotFound.vue'

export const authRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'Login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
  { path: '/setup', name: 'setup', component: SetupView, meta: { titleKey: 'pageTitles.setup' } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { titleKey: 'pageTitles.register' } },
  { path: '/logout', name: 'logout', component: LogoutView, meta: { titleKey: 'pageTitles.logout' } },
  { path: '/about', name: 'about', component: () => import('@/views/Misc/AboutView.vue'), meta: { titleKey: 'pageTitles.about' } },
  { path: '/feedback', name: 'feedback', component: () => import('@/views/FeedbackView.vue'), meta: { titleKey: 'pageTitles.feedback' } },
  { path: '/presentation', name: 'presentation', component: TechPresentation, meta: { titleKey: 'pageTitles.presentation' } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound, meta: { titleKey: 'pageTitles.notFound' } },
]
