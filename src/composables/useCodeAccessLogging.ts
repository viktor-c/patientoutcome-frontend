/**
 * @file useCodeAccessLogging.ts
 * @description Composable for tracking code access and form completions during patient form filling sessions
 */

import { ref, type Ref } from 'vue'
import { logger } from '@/services/logger'
import type { Form } from '@/types'

export interface CodeAccessSession {
  accessLogId: string | null
  codeId: string
  code: string
  patientCaseId: string
  consultationId: string
  sessionStartedAt: Date
  formsStarted: Map<string, Date> // Map of formId -> start time
  formsCompleted: Map<string, { startedAt: Date; completedAt: Date }> // Map of formId -> timestamps
}

export function useCodeAccessLogging() {
  const session: Ref<CodeAccessSession | null> = ref(null)

  /**
   * Initialize access logging when patient accesses forms with a code
   */
  const initializeAccessLog = (data: {
    codeId?: string
    code: string
    patientCaseId: string
    consultationId: string
  }) => {
    // Note: Access log creation happens on backend when code is used
    // Frontend tracks the session locally
    session.value = {
      accessLogId: null,
      codeId: data.codeId || '',
      code: data.code,
      patientCaseId: data.patientCaseId,
      consultationId: data.consultationId,
      sessionStartedAt: new Date(),
      formsStarted: new Map(),
      formsCompleted: new Map(),
    }

    logger.debug('Code access session initialized', {
      code: data.code,
      patientCaseId: data.patientCaseId,
      consultationId: data.consultationId,
    })
  }

  /**
   * Track when a form is opened
   */
  const trackFormOpened = (formId: string) => {
    if (!session.value) {
      logger.warn('Code access session not initialized')
      return
    }

    session.value.formsStarted.set(formId, new Date())
    logger.debug('Form opened for tracking', { formId, code: session.value.code })
  }

  /**
   * Track when a form is completed
   */
  const trackFormCompleted = (formId: string) => {
    if (!session.value) {
      logger.warn('Code access session not initialized')
      return
    }

    const startedAt = session.value.formsStarted.get(formId)
    const completedAt = new Date()

    if (startedAt) {
      session.value.formsCompleted.set(formId, { startedAt, completedAt })
      const durationMs = completedAt.getTime() - startedAt.getTime()
      logger.debug('Form completed for tracking', {
        formId,
        durationMs,
        code: session.value.code,
      })
    } else {
      logger.warn('Form start time not found', { formId })
    }
  }

  /**
   * Get the current session data
   */
  const getSessionData = () => session.value

  /**
   * Clear the session after code is deactivated or session ends
   */
  const endAccessSession = () => {
    if (session.value) {
      const sessionDurationMs = new Date().getTime() - session.value.sessionStartedAt.getTime()
      logger.debug('Code access session ended', {
        code: session.value.code,
        sessionDurationMs,
        formsCompletedCount: session.value.formsCompleted.size,
      })
    }
    session.value = null
  }

  /**
   * Get the code being used in this session
   */
  const getCurrentCode = () => session.value?.code

  /**
   * Check if a code access session is active
   */
  const isSessionActive = () => session.value !== null

  return {
    session,
    initializeAccessLog,
    trackFormOpened,
    trackFormCompleted,
    getSessionData,
    endAccessSession,
    getCurrentCode,
    isSessionActive,
  }
}
