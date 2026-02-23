import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, LogLevel } from '../logger'

describe('Logger', () => {
  beforeEach(() => {
    // Clear local logs before each test
    logger.clearLocalLogs()
    // Reset log level to DEBUG to capture all log levels
    logger.setLevel(LogLevel.DEBUG)
    logger.setRemoteLogging(false)
  })

  afterEach(() => {
    logger.clearLocalLogs()
    vi.restoreAllMocks()
  })

  describe('log levels', () => {
    it('should store a debug log entry in localStorage', () => {
      logger.debug('debug message', { key: 'value' })

      const logs = logger.getLocalLogs()
      const entry = logs.find(l => l.message === 'debug message')

      expect(entry).toBeDefined()
      expect(entry!.level).toBe('DEBUG')
      expect(entry!.data).toEqual({ key: 'value' })
    })

    it('should store an info log entry', () => {
      logger.info('info message')

      const logs = logger.getLocalLogs()
      const entry = logs.find(l => l.message === 'info message')

      expect(entry).toBeDefined()
      expect(entry!.level).toBe('INFO')
    })

    it('should store a warn log entry', () => {
      logger.warn('warn message')

      const logs = logger.getLocalLogs()
      const entry = logs.find(l => l.message === 'warn message')

      expect(entry).toBeDefined()
      expect(entry!.level).toBe('WARN')
    })

    it('should store an error log entry', () => {
      logger.error('error message', new Error('oops'))

      const logs = logger.getLocalLogs()
      const entry = logs.find(l => l.message === 'error message')

      expect(entry).toBeDefined()
      expect(entry!.level).toBe('ERROR')
    })
  })

  describe('log filtering by level', () => {
    it('should suppress messages below current log level', () => {
      logger.setLevel(LogLevel.WARN)
      logger.debug('should be suppressed')
      logger.info('should also be suppressed')

      const logs = logger.getLocalLogs()
      const debug = logs.find(l => l.message === 'should be suppressed')
      const info = logs.find(l => l.message === 'should also be suppressed')

      expect(debug).toBeUndefined()
      expect(info).toBeUndefined()
    })

    it('should allow messages at current log level', () => {
      logger.setLevel(LogLevel.WARN)
      logger.warn('warn allowed')
      logger.error('error allowed')

      const logs = logger.getLocalLogs()
      expect(logs.find(l => l.message === 'warn allowed')).toBeDefined()
      expect(logs.find(l => l.message === 'error allowed')).toBeDefined()
    })
  })

  describe('getLocalLogs', () => {
    it('should return empty array when no logs stored', () => {
      const logs = logger.getLocalLogs()
      expect(logs).toEqual([])
    })

    it('should accumulate multiple log entries', () => {
      logger.info('first')
      logger.info('second')
      logger.info('third')

      const logs = logger.getLocalLogs()
      expect(logs.length).toBeGreaterThanOrEqual(3)
    })

    it('should include timestamp, level, and message on each entry', () => {
      logger.info('timestamped entry')
      const logs = logger.getLocalLogs()
      const entry = logs.find(l => l.message === 'timestamped entry')

      expect(entry!.timestamp).toBeDefined()
      expect(entry!.level).toBe('INFO')
      expect(entry!.message).toBe('timestamped entry')
    })
  })

  describe('clearLocalLogs', () => {
    it('should remove all stored logs', () => {
      logger.info('to be cleared')
      logger.clearLocalLogs()

      expect(logger.getLocalLogs()).toEqual([])
    })
  })

  describe('exportLogs', () => {
    it('should export logs as a JSON string', () => {
      logger.info('exported message')
      const json = logger.exportLogs()

      expect(typeof json).toBe('string')
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.find((l: { message: string }) => l.message === 'exported message')).toBeDefined()
    })
  })

  describe('console output', () => {
    it('should call console.debug for debug messages', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => { })
      logger.debug('console debug test')
      expect(spy).toHaveBeenCalled()
    })

    it('should call console.info for info messages', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => { })
      logger.info('console info test')
      expect(spy).toHaveBeenCalled()
    })

    it('should call console.warn for warn messages', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => { })
      logger.warn('console warn test')
      expect(spy).toHaveBeenCalled()
    })

    it('should call console.error for error messages', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { })
      logger.error('console error test')
      expect(spy).toHaveBeenCalled()
    })
  })
})
