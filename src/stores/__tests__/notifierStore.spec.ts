import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotifierStore } from '../notifierStore'

describe('notifierStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty notifications', () => {
    const store = useNotifierStore()
    expect(store.notifications).toEqual([])
  })

  it('should add notification with notify', () => {
    const store = useNotifierStore()
    store.notify('Test message', 'success')

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].message).toBe('Test message')
    expect(store.notifications[0].type).toBe('success')
  })

  it('should store multiple notifications with timestamps', () => {
    const store = useNotifierStore()
    store.notify('Message 1', 'info')
    store.notify('Message 2', 'error')

    expect(store.notifications).toHaveLength(2)
    expect(store.notifications[0].time).toBeDefined()
    expect(store.notifications[1].time).toBeDefined()
  })

  it('should clear all notifications', () => {
    const store = useNotifierStore()
    store.notify('Test message 1', 'success')
    store.notify('Test message 2', 'error')

    store.clearNotifications()

    expect(store.notifications).toHaveLength(0)
  })

  it('should handle different notification types', () => {
    const store = useNotifierStore()

    store.notify('Success msg', 'success')
    store.notify('Error msg', 'error')
    store.notify('Info msg', 'info')

    expect(store.notifications).toHaveLength(3)
    expect(store.notifications[0].type).toBe('info')
    expect(store.notifications[1].type).toBe('error')
    expect(store.notifications[2].type).toBe('success')
  })

  it('should provide success/error/info helper methods', () => {
    const store = useNotifierStore()

    store.success('Success msg')
    store.error('Error msg')
    store.info('Info msg')

    expect(store.notifications).toHaveLength(3)
    expect(store.notifications.some(n => n.type === 'success')).toBe(true)
    expect(store.notifications.some(n => n.type === 'error')).toBe(true)
    expect(store.notifications.some(n => n.type === 'info')).toBe(true)
  })
})
