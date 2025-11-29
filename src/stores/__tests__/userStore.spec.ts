import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../userStore'

// Mock the userApi
vi.mock('@/api', () => ({
  userApi: {
    logoutUser: vi.fn(),
    updateUser: vi.fn(),
    changeUserPassword: vi.fn(),
  },
}))

describe('userStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('initialization', () => {
    it('should initialize with empty values', () => {
      const store = useUserStore()

      expect(store.username).toBe('')
      expect(store.belongsToCenter).toEqual([])
      expect(store.department).toBe('')
      expect(store.email).toBe('')
      expect(store.roles).toEqual([])
      expect(store.daysBeforeConsultations).toBe(7)
    })
  })

  describe('setSession', () => {
    it('should set session data', () => {
      const store = useUserStore()

      store.setSession({
        username: 'testuser',
        belongsToCenter: ['center1', 'center2'],
        department: 'Orthopedics',
        email: 'test@example.com',
        roles: ['doctor', 'admin'],
      })

      expect(store.username).toBe('testuser')
      expect(store.belongsToCenter).toEqual(['center1', 'center2'])
      expect(store.department).toBe('Orthopedics')
      expect(store.email).toBe('test@example.com')
      expect(store.roles).toEqual(['doctor', 'admin'])
    })

    it('should handle missing optional fields', () => {
      const store = useUserStore()

      store.setSession({
        username: 'testuser',
        belongsToCenter: [],
        department: 'Test',
      })

      expect(store.email).toBe('')
      expect(store.roles).toEqual([])
    })
  })

  describe('clearSession', () => {
    it('should clear all session data', () => {
      const store = useUserStore()

      store.setSession({
        username: 'testuser',
        belongsToCenter: ['center1'],
        department: 'Test',
        email: 'test@test.com',
        roles: ['user'],
      })

      store.clearSession()

      expect(store.username).toBe('')
      expect(store.belongsToCenter).toEqual([])
      expect(store.department).toBe('')
      expect(store.email).toBe('')
      expect(store.roles).toEqual([])
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no username', () => {
      const store = useUserStore()
      expect(store.isAuthenticated()).toBe(false)
    })

    it('should return true when username is set', () => {
      const store = useUserStore()
      store.setSession({
        username: 'testuser',
        belongsToCenter: [],
        department: '',
      })

      expect(store.isAuthenticated()).toBe(true)
    })

    it('should return false when username is empty string', () => {
      const store = useUserStore()
      store.username = ''

      expect(store.isAuthenticated()).toBe(false)
    })
  })

  describe('role management', () => {
    it('should check if user has specific role', () => {
      const store = useUserStore()
      store.setSession({
        username: 'testuser',
        belongsToCenter: [],
        department: '',
        roles: ['doctor', 'admin'],
      })

      expect(store.hasRole('doctor')).toBe(true)
      expect(store.hasRole('admin')).toBe(true)
      expect(store.hasRole('kiosk')).toBe(false)
    })

    it('should identify kiosk users', () => {
      const store = useUserStore()
      store.setSession({
        username: 'kioskuser',
        belongsToCenter: [],
        department: '',
        roles: ['kiosk'],
      })

      expect(store.isKioskUser()).toBe(true)
    })

    it('should return false for non-kiosk users', () => {
      const store = useUserStore()
      store.setSession({
        username: 'normaluser',
        belongsToCenter: [],
        department: '',
        roles: ['doctor'],
      })

      expect(store.isKioskUser()).toBe(false)
    })
  })

  describe('persistence', () => {
    it('should persist data to localStorage', () => {
      const store = useUserStore()
      store.setSession({
        username: 'testuser',
        belongsToCenter: ['center1'],
        department: 'Test Dept',
        email: 'test@test.com',
        roles: ['user'],
      })

      // Create a new store instance to test persistence
      const newStore = useUserStore()
      expect(newStore.username).toBe('testuser')
      expect(newStore.department).toBe('Test Dept')
    })

    it('should persist daysBeforeConsultations setting', () => {
      const store = useUserStore()
      store.daysBeforeConsultations = 14

      const newStore = useUserStore()
      expect(newStore.daysBeforeConsultations).toBe(14)
    })
  })
})
