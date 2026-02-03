import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotifierStore } from '../notifierStore'

describe('notifierStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with empty notifications', () => {
    const store = useNotifierStore()
    expect(store.notifications).toEqual([])
  })

  it('should add notification with notify after batch delay', async () => {
    const store = useNotifierStore()
    store.notify('Test message', 'success')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].message).toBe('Test message')
    expect(store.notifications[0].type).toBe('success')
  })

  it('should store multiple notifications with timestamps', async () => {
    const store = useNotifierStore()
    store.notify('Message 1', 'info')
    store.notify('Message 2', 'error')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.notifications).toHaveLength(2)
    expect(store.notifications[0].time).toBeDefined()
    expect(store.notifications[1].time).toBeDefined()
  })

  it('should batch duplicate notifications and show count', async () => {
    const store = useNotifierStore()
    store.notify('Same message', 'info')
    store.notify('Same message', 'info')
    store.notify('Same message', 'info')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.activeNotifications).toHaveLength(1)
    expect(store.activeNotifications[0].message).toBe('Same message')
    expect(store.activeNotifications[0].count).toBe(3)
  })

  it('should group notifications by message and type', async () => {
    const store = useNotifierStore()
    store.notify('Message A', 'info')
    store.notify('Message A', 'info')
    store.notify('Message B', 'error')
    store.notify('Message B', 'error')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.activeNotifications).toHaveLength(2)
    const messageA = store.activeNotifications.find(n => n.message === 'Message A')
    const messageB = store.activeNotifications.find(n => n.message === 'Message B')
    expect(messageA?.count).toBe(2)
    expect(messageB?.count).toBe(2)
  })

  it('should clear all notifications', async () => {
    const store = useNotifierStore()
    store.notify('Test message 1', 'success')
    store.notify('Test message 2', 'error')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    store.clearNotifications()

    expect(store.notifications).toHaveLength(0)
    expect(store.activeNotifications).toHaveLength(0)
  })

  it('should handle different notification types', async () => {
    const store = useNotifierStore()

    store.notify('Success msg', 'success')
    store.notify('Error msg', 'error')
    store.notify('Info msg', 'info')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.notifications).toHaveLength(3)
    expect(store.notifications[0].type).toBe('info')
    expect(store.notifications[1].type).toBe('error')
    expect(store.notifications[2].type).toBe('success')
  })

  it('should provide success/error/info helper methods', async () => {
    const store = useNotifierStore()

    store.success('Success msg')
    store.error('Error msg')
    store.info('Info msg')

    // Wait for batch delay
    await vi.advanceTimersByTimeAsync(300)

    expect(store.notifications).toHaveLength(3)
    expect(store.notifications.some(n => n.type === 'success')).toBe(true)
    expect(store.notifications.some(n => n.type === 'error')).toBe(true)
    expect(store.notifications.some(n => n.type === 'info')).toBe(true)
  })

  it('should update count when same notification arrives after initial display', async () => {
    const store = useNotifierStore()
    
    // First notification
    store.notify('Test message', 'info')
    await vi.advanceTimersByTimeAsync(300)
    
    expect(store.activeNotifications).toHaveLength(1)
    expect(store.activeNotifications[0].count).toBe(1)
    
    // Second notification with same message
    store.notify('Test message', 'info')
    await vi.advanceTimersByTimeAsync(300)
    
    expect(store.activeNotifications).toHaveLength(1)
    expect(store.activeNotifications[0].count).toBe(2)
  })
})
