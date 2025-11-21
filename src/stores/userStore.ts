import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { UpdateUserRequest } from '@/api/models/UpdateUserRequest';

import { userApi } from '@/api';

export const useUserStore = defineStore('user', () => {
  // const sessionId = useLocalStorage('sessionId', '')
  const username = useLocalStorage('username', '')
  const belongsToCenter = useLocalStorage('belongsToCenter', [] as string[])
  const department = useLocalStorage('department', '')
  const email = useLocalStorage('email', '')
  // number of days to look back when showing consultations (per-user setting)
  const daysBeforeConsultations = useLocalStorage('daysBeforeConsultations', 7)
  const roles = useLocalStorage('roles', [] as string[])
  // postopWeek for kiosk users - sequential number indicating n-th kiosk user
  const postopWeek = useLocalStorage<number | undefined>('postopWeek', undefined)

  //
  interface SessionData {
    // sessionId: string
    username: string
    belongsToCenter: string[]
    department: string
    email?: string // Optional email field
    roles?: string[] // Optional roles array field
    postopWeek?: number // Optional postopWeek field for kiosk users
  }

  const setSession = (data: SessionData) => {
    // sessionId.value = data.sessionId
    username.value = data.username
    belongsToCenter.value = data.belongsToCenter
    department.value = data.department
    email.value = data.email || '' // Ensure email is set, default to empty string if not provided
    roles.value = data.roles || [] // Ensure roles is set, default to empty array if not provided
    postopWeek.value = data.postopWeek // Set postopWeek for kiosk users
  }

  const clearSession = () => {

    // sessionId.value = ''
    username.value = ''
    belongsToCenter.value = []
    department.value = ''
    email.value = ''
    roles.value = []
    postopWeek.value = undefined
  }

  const logout = async () => {
    try {
      // Backend identifies user via cookies, sessionId is not actually needed
      await userApi.logoutUser();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearSession();
    }
  };

  const isAuthenticated = () => {
    if (username.value && username.value.length > 0) {
      return true
    }
    return false
  }

  const updateUser = async (update: UpdateUserRequest) => {
    return await userApi.updateUser({ updateUserRequest: update });
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    return await userApi.changeUserPassword({
      changeUserPasswordRequest: {
        currentPassword,
        newPassword,
        confirmPassword,
      },
    });
  };

  const isKioskUser = () => {
    return roles.value.includes('kiosk')
  }

  const hasRole = (role: string) => {
    return roles.value.includes(role)
  }

  return {
    username, belongsToCenter, department, email, roles,
    daysBeforeConsultations, postopWeek,
    // Methods
    setSession, clearSession, logout,
    isAuthenticated, updateUser,
    changePassword, isKioskUser, hasRole
  }
})
