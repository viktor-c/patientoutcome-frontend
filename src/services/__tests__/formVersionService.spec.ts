import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { formVersionService } from '@/services/formVersionService'

// Mock the API
const mockGetVersionHistory = vi.fn()
const mockGetVersion = vi.fn()
const mockCompareVersions = vi.fn()
const mockGetChangeList = vi.fn()
const mockRestoreVersion = vi.fn()

vi.mock('@/api', () => ({
  formApi: {
    getVersionHistory: (...args: unknown[]) => mockGetVersionHistory(...args),
    getVersion: (...args: unknown[]) => mockGetVersion(...args),
    compareVersions: (...args: unknown[]) => mockCompareVersions(...args),
    getChangeList: (...args: unknown[]) => mockGetChangeList(...args),
    restoreVersion: (...args: unknown[]) => mockRestoreVersion(...args),
  },
}))

describe('formVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const formId = 'form-123'

  describe('getVersionHistory', () => {
    it('should fetch version history for a form', async () => {
      const mockResponse = {
        success: true,
        message: 'Found 3 versions',
        responseObject: [
          { _id: 'v1', formId, version: 1, changedAt: '2026-01-01' },
          { _id: 'v2', formId, version: 2, changedAt: '2026-01-15' },
          { _id: 'v3', formId, version: 3, changedAt: '2026-02-01' },
        ],
        statusCode: 200,
      }
      mockGetVersionHistory.mockResolvedValue(mockResponse)

      const result = await formVersionService.getVersionHistory(formId)

      expect(mockGetVersionHistory).toHaveBeenCalledWith({ formId })
      expect(result.responseObject).toHaveLength(3)
      expect(result.success).toBe(true)
    })

    it('should throw error on API failure', async () => {
      const error = new Error('Network error')
      mockGetVersionHistory.mockRejectedValue(error)

      await expect(formVersionService.getVersionHistory(formId)).rejects.toThrow('Network error')
    })

    it('should handle empty version history', async () => {
      mockGetVersionHistory.mockResolvedValue({
        success: true,
        message: 'No versions found',
        responseObject: [],
        statusCode: 200,
      })

      const result = await formVersionService.getVersionHistory(formId)

      expect(result.responseObject).toEqual([])
    })
  })

  describe('getVersion', () => {
    it('should fetch a specific version', async () => {
      const mockResponse = {
        success: true,
        message: 'Version retrieved',
        responseObject: {
          _id: 'v2',
          formId,
          version: 2,
          rawData: { question1: 'answer1' },
          changedBy: 'user-123',
          changedAt: '2026-01-15',
          changeNotes: 'Updated answers',
          isRestoration: false,
          restoredFromVersion: null,
        },
        statusCode: 200,
      }
      mockGetVersion.mockResolvedValue(mockResponse)

      const result = await formVersionService.getVersion(formId, 2)

      expect(mockGetVersion).toHaveBeenCalledWith({ formId, versionNumber: '2' })
      expect(result.responseObject.version).toBe(2)
    })

    it('should convert version number to string', async () => {
      mockGetVersion.mockResolvedValue({ success: true, responseObject: {} })

      await formVersionService.getVersion(formId, 42)

      expect(mockGetVersion).toHaveBeenCalledWith({ formId, versionNumber: '42' })
    })

    it('should throw error if version not found', async () => {
      mockGetVersion.mockRejectedValue(new Error('Version not found'))

      await expect(formVersionService.getVersion(formId, 999)).rejects.toThrow('Version not found')
    })
  })

  describe('compareVersions', () => {
    it('should compare two versions', async () => {
      const mockResponse = {
        success: true,
        message: 'Comparison complete',
        responseObject: {
          formId,
          v1: {
            version: 1,
            changedBy: 'user-a',
            changedAt: '2026-01-01',
            changeNotes: 'Initial',
            rawData: { q1: 'a' },
          },
          v2: {
            version: 2,
            changedBy: 'user-b',
            changedAt: '2026-01-15',
            changeNotes: 'Updated',
            rawData: { q1: 'b' },
          },
        },
        statusCode: 200,
      }
      mockCompareVersions.mockResolvedValue(mockResponse)

      const result = await formVersionService.compareVersions(formId, 1, 2)

      expect(mockCompareVersions).toHaveBeenCalledWith({
        formId,
        v1: '1',
        v2: '2',
      })
      expect(result.responseObject.v1.version).toBe(1)
      expect(result.responseObject.v2.version).toBe(2)
    })

    it('should handle comparison of same version', async () => {
      mockCompareVersions.mockResolvedValue({
        success: true,
        responseObject: {
          formId,
          v1: { version: 1 },
          v2: { version: 1 },
        },
      })

      const result = await formVersionService.compareVersions(formId, 1, 1)

      expect(result.responseObject.v1.version).toBe(1)
      expect(result.responseObject.v2.version).toBe(1)
    })
  })

  describe('getChangeList', () => {
    it('should get list of changes between versions', async () => {
      const mockResponse = {
        success: true,
        message: 'Found 2 changes',
        responseObject: [
          { _id: 'v1', version: 1, changeNotes: 'Initial' },
          { _id: 'v2', version: 2, changeNotes: 'Update 1' },
        ],
        statusCode: 200,
      }
      mockGetChangeList.mockResolvedValue(mockResponse)

      const result = await formVersionService.getChangeList(formId, 1, 3)

      expect(mockGetChangeList).toHaveBeenCalledWith({
        formId,
        v1: '1',
        v2: '3',
      })
      expect(result.responseObject).toHaveLength(2)
    })
  })

  describe('restoreVersion', () => {
    it('should restore a previous version', async () => {
      const mockResponse = {
        success: true,
        message: 'Version restored',
        responseObject: {
          formId,
          version: 4,
          isRestoration: true,
          restoredFromVersion: 2,
        },
        statusCode: 200,
      }
      mockRestoreVersion.mockResolvedValue(mockResponse)

      const result = await formVersionService.restoreVersion(formId, 2)

      expect(mockRestoreVersion).toHaveBeenCalledWith({
        formId,
        versionNumber: '2',
        restoreVersionRequest: expect.any(Object),
      })
      expect(result.responseObject.isRestoration).toBe(true)
      expect(result.responseObject.restoredFromVersion).toBe(2)
    })

    it('should include custom change notes if provided', async () => {
      mockRestoreVersion.mockResolvedValue({ success: true, responseObject: {} })

      await formVersionService.restoreVersion(formId, 2, 'Manual restore')

      expect(mockRestoreVersion).toHaveBeenCalledWith({
        formId,
        versionNumber: '2',
        restoreVersionRequest: expect.objectContaining({
          changeNotes: 'Manual restore',
        }),
      })
    })
  })
})
