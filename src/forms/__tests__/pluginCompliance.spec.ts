import { describe, it, expect } from 'vitest'
import { getAllFormPlugins, getFormPlugin } from '@/forms/registry'
import type { FormPlugin, FormData } from '@/forms/types'
import type { ScoringData } from '@/types/backend/scoring'

/**
 * Plugin Compliance Tests
 * 
 * These tests verify that all form plugins conform to the expected interface
 * and behavior. Run these tests when:
 * - Adding a new form plugin
 * - Modifying the plugin interface
 * - Debugging plugin registration issues
 */

describe('Form Plugin Compliance', () => {
  const allPlugins = getAllFormPlugins()

  describe('Plugin Registry', () => {
    it('should have at least one registered plugin', () => {
      expect(allPlugins.length).toBeGreaterThan(0)
    })

    it('should register MOXFQ plugin', () => {
      const moxfqPlugin = getFormPlugin('67b4e612d0feb4ad99ae2e85')
      expect(moxfqPlugin).toBeDefined()
      expect(moxfqPlugin?.metadata.name).toBe('MOXFQ')
    })

    it('should have unique plugin IDs', () => {
      const ids = allPlugins.map(p => p.metadata.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe.each(allPlugins)('Plugin: $metadata.name', (plugin: FormPlugin) => {
    describe('Metadata Compliance', () => {
      it('should have valid metadata structure', () => {
        expect(plugin.metadata).toBeDefined()
        expect(plugin.metadata.id).toBeTruthy()
        expect(plugin.metadata.name).toBeTruthy()
        expect(plugin.metadata.description).toBeTruthy()
        expect(plugin.metadata.version).toBeTruthy()
        expect(plugin.metadata.supportedLocales).toBeDefined()
      })

      it('should have non-empty ID', () => {
        expect(plugin.metadata.id).not.toBe('')
        expect(plugin.metadata.id.length).toBeGreaterThan(0)
      })

      it('should have valid version format', () => {
        const versionRegex = /^\d+\.\d+\.\d+$/
        expect(plugin.metadata.version).toMatch(versionRegex)
      })

      it('should support at least one locale', () => {
        expect(plugin.metadata.supportedLocales.length).toBeGreaterThan(0)
      })

      it('should include English as supported locale', () => {
        expect(plugin.metadata.supportedLocales).toContain('en')
      })
    })

    describe('Component Compliance', () => {
      it('should have a Vue component', () => {
        expect(plugin.component).toBeDefined()
        expect(typeof plugin.component).toBe('object')
      })
    })

    describe('Translations Compliance', () => {
      it('should have translations object', () => {
        expect(plugin.translations).toBeDefined()
        expect(typeof plugin.translations).toBe('object')
      })

      it('should have translations for all supported locales', () => {
        for (const locale of plugin.metadata.supportedLocales) {
          expect(plugin.translations[locale]).toBeDefined()
          expect(typeof plugin.translations[locale]).toBe('object')
        }
      })

      it('should have at least one translation key per locale', () => {
        for (const locale of plugin.metadata.supportedLocales) {
          const keys = Object.keys(plugin.translations[locale])
          expect(keys.length).toBeGreaterThan(0)
        }
      })

      it('should have English translations', () => {
        expect(plugin.translations.en).toBeDefined()
        expect(Object.keys(plugin.translations.en).length).toBeGreaterThan(0)
      })
    })

    describe('Scoring Function Compliance', () => {
      it('should have calculateScore function', () => {
        expect(plugin.calculateScore).toBeDefined()
        expect(typeof plugin.calculateScore).toBe('function')
      })

      it('should return valid ScoringData structure from calculateScore', () => {
        const initialData = plugin.getInitialData()
        const scoring = plugin.calculateScore(initialData)

        expect(scoring).toBeDefined()
        expect(scoring.rawData).toBeDefined()
        expect(scoring.subscales).toBeDefined()
        expect(scoring.total).toBeDefined()
      })

      it('should have valid total score in ScoringData', () => {
        const initialData = plugin.getInitialData()
        const scoring = plugin.calculateScore(initialData)

        if (scoring.total) {
          expect(scoring.total.name).toBeTruthy()
          expect(typeof scoring.total.rawScore).toBe('number')
          expect(typeof scoring.total.normalizedScore).toBe('number')
          expect(typeof scoring.total.maxPossibleScore).toBe('number')
          expect(typeof scoring.total.answeredQuestions).toBe('number')
          expect(typeof scoring.total.totalQuestions).toBe('number')
          expect(typeof scoring.total.completionPercentage).toBe('number')
          expect(typeof scoring.total.isComplete).toBe('boolean')
        }
      })

      it('should have normalized score between 0 and 100', () => {
        const initialData = plugin.getInitialData()
        const scoring = plugin.calculateScore(initialData)

        if (scoring.total) {
          expect(scoring.total.normalizedScore).toBeGreaterThanOrEqual(0)
          expect(scoring.total.normalizedScore).toBeLessThanOrEqual(100)
        }
      })

      it('should handle null/empty data gracefully', () => {
        const emptyData: FormData = {}
        expect(() => plugin.calculateScore(emptyData)).not.toThrow()
      })
    })

    describe('Validation Function Compliance', () => {
      it('should have validateFormData function', () => {
        expect(plugin.validateFormData).toBeDefined()
        expect(typeof plugin.validateFormData).toBe('function')
      })

      it('should return boolean from validateFormData', () => {
        const initialData = plugin.getInitialData()
        const result = plugin.validateFormData(initialData)
        expect(typeof result).toBe('boolean')
      })

      it('should validate initial data as true', () => {
        const initialData = plugin.getInitialData()
        const isValid = plugin.validateFormData(initialData)
        // Initial data (all null) should be considered valid
        expect(isValid).toBe(true)
      })

      it('should handle empty data', () => {
        const emptyData: FormData = {}
        expect(() => plugin.validateFormData(emptyData)).not.toThrow()
      })
    })

    describe('Initial Data Function Compliance', () => {
      it('should have getInitialData function', () => {
        expect(plugin.getInitialData).toBeDefined()
        expect(typeof plugin.getInitialData).toBe('function')
      })

      it('should return valid FormData structure', () => {
        const initialData = plugin.getInitialData()
        expect(initialData).toBeDefined()
        expect(typeof initialData).toBe('object')
        expect(initialData).not.toBeNull()
      })

      it('should return consistent initial data', () => {
        const data1 = plugin.getInitialData()
        const data2 = plugin.getInitialData()
        expect(JSON.stringify(data1)).toBe(JSON.stringify(data2))
      })

      it('should not mutate returned initial data', () => {
        const data1 = plugin.getInitialData()
        const data2 = plugin.getInitialData()
        
        // Mutate data1
        if (Object.keys(data1).length > 0) {
          const firstKey = Object.keys(data1)[0]
          data1[firstKey] = { modified: true }
        }

        // data2 should be unaffected
        expect(JSON.stringify(data1)).not.toBe(JSON.stringify(data2))
      })
    })

    describe('Optional Mock Data Function Compliance', () => {
      if (plugin.generateMockData) {
        it('should return valid FormData structure from generateMockData', () => {
          const mockData = plugin.generateMockData!()
          expect(mockData).toBeDefined()
          expect(typeof mockData).toBe('object')
        })

        it('should return different data than initial data', () => {
          const initialData = plugin.getInitialData()
          const mockData = plugin.generateMockData!()
          
          // Mock data should have actual values, not all nulls
          const mockJson = JSON.stringify(mockData)
          const initialJson = JSON.stringify(initialData)
          
          // They should be different (mock has values, initial has nulls)
          expect(mockJson).not.toBe(initialJson)
        })

        it('should generate valid mock data that passes validation', () => {
          const mockData = plugin.generateMockData!()
          const isValid = plugin.validateFormData(mockData)
          expect(isValid).toBe(true)
        })

        it('should generate mock data that produces valid scoring', () => {
          const mockData = plugin.generateMockData!()
          const scoring = plugin.calculateScore(mockData)
          
          expect(scoring).toBeDefined()
          expect(scoring.total).toBeDefined()
          if (scoring.total) {
            expect(scoring.total.rawScore).toBeGreaterThan(0)
          }
        })
      }
    })

    describe('Optional Schema Compliance', () => {
      if (plugin.schema) {
        it('should have valid JSON schema structure', () => {
          expect(plugin.schema).toBeDefined()
          expect(typeof plugin.schema).toBe('object')
          expect(plugin.schema.type).toBeDefined()
        })

        it('should have object type schema', () => {
          expect(plugin.schema!.type).toBe('object')
        })

        it('should define properties', () => {
          expect(plugin.schema!.properties).toBeDefined()
        })
      }
    })

    describe('Data Integrity', () => {
      it('should maintain data structure through score calculation', () => {
        const initialData = plugin.getInitialData()
        const scoring = plugin.calculateScore(initialData)
        
        // The rawData in scoring should match input structure
        expect(scoring.rawData).toBeDefined()
      })

      it('should handle partially filled data', () => {
        const initialData = plugin.getInitialData()
        const firstSection = Object.keys(initialData)[0]
        
        if (firstSection && initialData[firstSection]) {
          const firstQuestion = Object.keys(initialData[firstSection])[0]
          if (firstQuestion) {
            initialData[firstSection][firstQuestion] = 2
          }
        }

        expect(() => plugin.calculateScore(initialData)).not.toThrow()
        const scoring = plugin.calculateScore(initialData)
        expect(scoring.total).toBeDefined()
      })

      it('should calculate completion percentage correctly', () => {
        const mockData = plugin.generateMockData ? plugin.generateMockData() : plugin.getInitialData()
        const scoring = plugin.calculateScore(mockData)

        if (scoring.total) {
          const expectedPercentage = (scoring.total.answeredQuestions / scoring.total.totalQuestions) * 100
          expect(scoring.total.completionPercentage).toBeCloseTo(expectedPercentage, 1)
        }
      })
    })
  })

  describe('Cross-Plugin Consistency', () => {
    it('should have consistent metadata structure across all plugins', () => {
      const metadataKeys = ['id', 'name', 'description', 'version', 'supportedLocales']
      
      for (const plugin of allPlugins) {
        for (const key of metadataKeys) {
          expect(plugin.metadata).toHaveProperty(key)
        }
      }
    })

    it('should have consistent function signatures across all plugins', () => {
      const requiredFunctions = ['calculateScore', 'validateFormData', 'getInitialData']
      
      for (const plugin of allPlugins) {
        for (const funcName of requiredFunctions) {
          expect(typeof plugin[funcName as keyof FormPlugin]).toBe('function')
        }
      }
    })

    it('should all support English locale', () => {
      for (const plugin of allPlugins) {
        expect(plugin.metadata.supportedLocales).toContain('en')
        expect(plugin.translations.en).toBeDefined()
      }
    })
  })

  describe('Error Handling', () => {
    it.each(allPlugins)('$metadata.name should handle invalid data gracefully', (plugin) => {
      const invalidData = { invalid: { structure: 'test' } }
      
      // Should not throw, even with invalid data
      expect(() => plugin.calculateScore(invalidData as FormData)).not.toThrow()
      expect(() => plugin.validateFormData(invalidData as FormData)).not.toThrow()
    })

    it.each(allPlugins)('$metadata.name should handle null values', (plugin) => {
      const nullData: FormData = {}
      const sections = Object.keys(plugin.getInitialData())
      
      for (const section of sections) {
        nullData[section] = {}
      }

      expect(() => plugin.calculateScore(nullData)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it.each(allPlugins)('$metadata.name calculateScore should complete quickly', (plugin) => {
      const data = plugin.generateMockData ? plugin.generateMockData() : plugin.getInitialData()
      
      const start = performance.now()
      plugin.calculateScore(data)
      const end = performance.now()
      
      // Should complete in less than 100ms
      expect(end - start).toBeLessThan(100)
    })

    it.each(allPlugins)('$metadata.name validateFormData should complete quickly', (plugin) => {
      const data = plugin.getInitialData()
      
      const start = performance.now()
      plugin.validateFormData(data)
      const end = performance.now()
      
      // Should complete in less than 50ms
      expect(end - start).toBeLessThan(50)
    })
  })
})
