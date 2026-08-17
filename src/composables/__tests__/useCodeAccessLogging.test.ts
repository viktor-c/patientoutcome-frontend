import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCodeAccessLogging } from '../useCodeAccessLogging'
import { logger } from '@/services/logger'

// Mock the logger service
vi.mock('@/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('useCodeAccessLogging', () => {
  let composable: ReturnType<typeof useCodeAccessLogging>

  beforeEach(() => {
    composable = useCodeAccessLogging()
    vi.clearAllMocks()
  })

  describe('initializeAccessLog', () => {
    it('should create a new session with all required fields', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)

      const session = composable.getSessionData()
      expect(session).not.toBeNull()
      expect(session?.code).toBe('TEST123')
      expect(session?.patientCaseId).toBe('case123')
      expect(session?.consultationId).toBe('consultation123')
    })

    it('should set sessionStartedAt to current time', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      const beforeInit = new Date()
      composable.initializeAccessLog(data)
      const afterInit = new Date()

      const session = composable.getSessionData()
      expect(session?.sessionStartedAt.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime())
      expect(session?.sessionStartedAt.getTime()).toBeLessThanOrEqual(afterInit.getTime())
    })

    it('should initialize empty form tracking maps', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)

      const session = composable.getSessionData()
      expect(session?.formsStarted.size).toBe(0)
      expect(session?.formsCompleted.size).toBe(0)
    })

    it('should accept optional codeId', () => {
      const data = {
        codeId: 'code123',
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)

      const session = composable.getSessionData()
      expect(session?.codeId).toBe('code123')
    })
  })

  describe('trackFormOpened', () => {
    it('should record when a form is opened', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      const beforeOpen = new Date()
      composable.trackFormOpened('form1')
      const afterOpen = new Date()

      const session = composable.getSessionData()
      const formStartTime = session?.formsStarted.get('form1')
      expect(formStartTime).toBeDefined()
      expect(formStartTime!.getTime()).toBeGreaterThanOrEqual(beforeOpen.getTime())
      expect(formStartTime!.getTime()).toBeLessThanOrEqual(afterOpen.getTime())
    })

    it('should warn if session not initialized', () => {
      const warnSpy = vi.spyOn(logger, 'warn')
      composable.trackFormOpened('form1')
      expect(warnSpy).toHaveBeenCalledWith('Code access session not initialized')
    })

    it('should track multiple forms opened', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormOpened('form1')
      composable.trackFormOpened('form2')
      composable.trackFormOpened('form3')

      const session = composable.getSessionData()
      expect(session?.formsStarted.size).toBe(3)
      expect(session?.formsStarted.has('form1')).toBe(true)
      expect(session?.formsStarted.has('form2')).toBe(true)
      expect(session?.formsStarted.has('form3')).toBe(true)
    })
  })

  describe('trackFormCompleted', () => {
    it('should record form completion with duration', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormOpened('form1')

      // Simulate time passing
      const startTime = composable.getSessionData()?.formsStarted.get('form1')
      if (!startTime) {
        throw new Error('Expected start time to be initialized')
      }
      vi.useFakeTimers()
      vi.setSystemTime(new Date(startTime.getTime() + 300000)) // 5 minutes later

      composable.trackFormCompleted('form1')

      vi.useRealTimers()

      const session = composable.getSessionData()
      const formCompletion = session?.formsCompleted.get('form1')
      expect(formCompletion).toBeDefined()
      expect(formCompletion?.startedAt).toEqual(startTime)
      expect(formCompletion?.completedAt).toBeDefined()
    })

    it('should warn if form was not opened before completion', () => {
      const warnSpy = vi.spyOn(logger, 'warn')
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormCompleted('unopened_form')

      expect(warnSpy).toHaveBeenCalledWith('Form start time not found', expect.objectContaining({ formId: 'unopened_form' }))
    })

    it('should handle multiple form completions', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormOpened('form1')
      composable.trackFormOpened('form2')
      composable.trackFormCompleted('form1')
      composable.trackFormCompleted('form2')

      const session = composable.getSessionData()
      expect(session?.formsCompleted.size).toBe(2)
      expect(session?.formsCompleted.has('form1')).toBe(true)
      expect(session?.formsCompleted.has('form2')).toBe(true)
    })
  })

  describe('getSessionData', () => {
    it('should return null before session initialized', () => {
      const session = composable.getSessionData()
      expect(session).toBeNull()
    })

    it('should return current session after initialization', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      const session = composable.getSessionData()

      expect(session).not.toBeNull()
      expect(session?.code).toBe('TEST123')
    })

    it('should reflect updates to session state', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormOpened('form1')

      const session = composable.getSessionData()
      expect(session?.formsStarted.size).toBe(1)

      composable.trackFormOpened('form2')

      const updatedSession = composable.getSessionData()
      expect(updatedSession?.formsStarted.size).toBe(2)
    })
  })

  describe('endAccessSession', () => {
    it('should clear the session', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      expect(composable.getSessionData()).not.toBeNull()

      composable.endAccessSession()
      expect(composable.getSessionData()).toBeNull()
    })

    it('should log session duration when ending', () => {
      const debugSpy = vi.spyOn(logger, 'debug')
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.trackFormOpened('form1')
      composable.trackFormCompleted('form1')

      composable.endAccessSession()

      expect(debugSpy).toHaveBeenCalledWith(
        'Code access session ended',
        expect.objectContaining({
          code: 'TEST123',
          formsCompletedCount: 1
        })
      )
    })
  })

  describe('getCurrentCode', () => {
    it('should return current code in active session', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      expect(composable.getCurrentCode()).toBe('TEST123')
    })

    it('should return undefined if no active session', () => {
      expect(composable.getCurrentCode()).toBeUndefined()
    })

    it('should return undefined after session ends', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.endAccessSession()
      expect(composable.getCurrentCode()).toBeUndefined()
    })
  })

  describe('isSessionActive', () => {
    it('should return false before session initialized', () => {
      expect(composable.isSessionActive()).toBe(false)
    })

    it('should return true after session initialized', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      expect(composable.isSessionActive()).toBe(true)
    })

    it('should return false after session ended', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      composable.initializeAccessLog(data)
      composable.endAccessSession()
      expect(composable.isSessionActive()).toBe(false)
    })
  })

  describe('Session lifecycle', () => {
    it('should handle complete session lifecycle', () => {
      const data = {
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      // Initialize
      expect(composable.isSessionActive()).toBe(false)
      composable.initializeAccessLog(data)
      expect(composable.isSessionActive()).toBe(true)
      expect(composable.getCurrentCode()).toBe('TEST123')

      // Track forms
      composable.trackFormOpened('form1')
      composable.trackFormOpened('form2')
      composable.trackFormCompleted('form1')
      composable.trackFormCompleted('form2')

      const session = composable.getSessionData()
      expect(session?.formsStarted.size).toBe(2)
      expect(session?.formsCompleted.size).toBe(2)

      // End session
      composable.endAccessSession()
      expect(composable.isSessionActive()).toBe(false)
      expect(composable.getCurrentCode()).toBeUndefined()
      expect(composable.getSessionData()).toBeNull()
    })
  })
})
