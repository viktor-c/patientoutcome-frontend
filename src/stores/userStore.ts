import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ApiUpdateUserRequest as UpdateUserRequest } from '@/types';

import { userApi, checkSessionRaw } from '@/api';

/**
 * Mirrors the backend SESSION_MAX_AGE_HOURS default (36 h).
 * This is only used as a fallback estimate – the accurate expiry is always
 * returned by `GET /user/session` and stored in `sessionExpiresAt`.
 */
export const SESSION_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export const useUserStore = defineStore('user', () => {
  // const sessionId = useLocalStorage('sessionId', '')
  const username = useLocalStorage('username', '')
  const belongsToCenter = useLocalStorage('belongsToCenter', [] as string[])
  const department = useLocalStorage('department', '')
  const email = useLocalStorage('email', '')
  const consultationAccessDaysBefore = useLocalStorage('consultationAccessDaysBefore', 3)
  const consultationAccessDaysAfter = useLocalStorage('consultationAccessDaysAfter', 30)
  // number of days to look back when showing consultations (per-user setting)
  const daysBeforeConsultations = useLocalStorage('daysBeforeConsultations', 7)
  const roles = useLocalStorage('roles', [] as string[])
  const permissions = useLocalStorage('permissions', [] as string[])
  // postopWeek for kiosk users - sequential number indicating n-th kiosk user
  const postopWeek = useLocalStorage<number | undefined>('postopWeek', undefined)

  /**
   * ISO date string of when the server session is expected to expire.
   * Updated on login and after every successful API response (rolling sessions).
   */
  const sessionExpiresAt = useLocalStorage<string | null>('sessionExpiresAt', null)
  /**
   * Unix timestamp (ms) of the last time an API response was received successfully.
   * Used by the session watcher to decide when to probe the server.
   */
  const lastActivityAt = useLocalStorage<number>('lastActivityAt', 0)

  //
  interface SessionData {
    // sessionId: string
    username: string
    belongsToCenter: string[]
    department: string
    email?: string // Optional email field
    consultationAccessDaysBefore?: number
    consultationAccessDaysAfter?: number
    roles?: string[] // Optional roles array field
    permissions?: string[] // Optional permissions array field
    postopWeek?: number // Optional postopWeek field for kiosk users
  }

  const setSession = (data: SessionData) => {
    // sessionId.value = data.sessionId
    username.value = data.username
    belongsToCenter.value = data.belongsToCenter
    department.value = data.department
    email.value = data.email || '' // Ensure email is set, default to empty string if not provided
    consultationAccessDaysBefore.value = data.consultationAccessDaysBefore ?? 3
    consultationAccessDaysAfter.value = data.consultationAccessDaysAfter ?? 30
    roles.value = data.roles || [] // Ensure roles is set, default to empty array if not provided
    permissions.value = data.permissions || [] // Ensure permissions is set, default to empty array if not provided
    postopWeek.value = data.postopWeek // Set postopWeek for kiosk users
    // Record when the session was created so the watcher can compute expiry
    lastActivityAt.value = Date.now()
    sessionExpiresAt.value = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString()
  }

  const clearSession = () => {

    // sessionId.value = ''
    username.value = ''
    belongsToCenter.value = []
    department.value = ''
    email.value = ''
    consultationAccessDaysBefore.value = 3
    consultationAccessDaysAfter.value = 30
    roles.value = []
    permissions.value = []
    postopWeek.value = undefined
    sessionExpiresAt.value = null
    lastActivityAt.value = 0
  }

  /**
   * Called by the auth middleware after every successful API response to keep the
   * locally-tracked expiry in sync with rolling sessions on the server.
   * @param expiresAt - Optional ISO string returned by `GET /user/session`.
   *   When omitted the expiry is computed as `now + SESSION_MAX_AGE_MS`.
   */
  const updateLastActivity = (expiresAt?: string) => {
    lastActivityAt.value = Date.now()
    sessionExpiresAt.value = expiresAt ?? new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString()
  }

  /**
   * Probe the backend to verify the session is still valid.
   * Returns `true` when session is active, `false` when it has expired (and clears
   * local state), or `null` when the network is unreachable (no state change).
   */
  const checkSessionWithServer = async (): Promise<boolean | null> => {
    const result = await checkSessionRaw()
    if (result === null) return null // network error – do not force logout
    if (!result.authenticated) {
      clearSession()
      return false
    }
    // Update expiry with the accurate value from the server
    updateLastActivity(result.expiresAt)
    return true
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

  const hasPermission = (permission: string) => {
    return permissions.value.includes(permission)
  }

  return {
    username, belongsToCenter, department, email, roles, permissions,
    consultationAccessDaysBefore, consultationAccessDaysAfter,
    daysBeforeConsultations, postopWeek,
    sessionExpiresAt, lastActivityAt,
    // Methods
    setSession, clearSession, logout,
    updateLastActivity, checkSessionWithServer,
    isAuthenticated, updateUser,
    changePassword, isKioskUser, hasRole, hasPermission
  }
})
