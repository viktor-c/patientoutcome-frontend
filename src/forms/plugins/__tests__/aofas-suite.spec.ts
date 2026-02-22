/**
 * Test suite for all AOFAS frontend plugins
 * Verifies registry integration and plugin functionality
 */

import { describe, it, expect } from 'vitest'
import { getFormPlugin, getAllFormPlugins } from '../../registry'

describe('AOFAS Frontend Plugin Suite', () => {
  const aofasIds = [
    { id: '67b4e612d0feb4ad99ae2e84', name: 'AOFAS Forefoot', section: 'forefoot', questions: 8 },
    { id: '67b4e612d0feb4ad99ae2e88', name: 'AOFAS Hindfoot', section: 'hindfoot', questions: 10 },
    { id: '67b4e612d0feb4ad99ae2e89', name: 'AOFAS Midfoot', section: 'midfoot', questions: 10 },
    { id: '67b4e612d0feb4ad99ae2e8a', name: 'AOFAS Lesser Toes', section: 'lesserToes', questions: 8 }
  ]

  describe('Plugin Registry', () => {
    it('should register all AOFAS plugins', () => {
      const allPlugins = getAllFormPlugins()
      const aofasPlugins = allPlugins.filter((p) => p.metadata.name.includes('AOFAS'))
      
      expect(aofasPlugins.length).toBe(4)
      console.log(`✅ Found ${aofasPlugins.length} AOFAS plugins in registry`)
      
      aofasPlugins.forEach((p) => {
        console.log(`   - ${p.metadata.name} (${p.metadata.id})`)
      })
    })

    it('should retrieve each AOFAS plugin by ID', () => {
      aofasIds.forEach(({ id, name }) => {
        const plugin = getFormPlugin(id)
        expect(plugin).toBeDefined()
        expect(plugin?.metadata.name).toContain('AOFAS')
        console.log(`✅ Retrieved: ${name}`)
      })
    })
  })

  describe('Plugin Structure', () => {
    aofasIds.forEach(({ id, name, section, questions }) => {
      describe(`Plugin: ${name}`, () => {
        const plugin = getFormPlugin(id)

        it('should have valid metadata', () => {
          expect(plugin?.metadata).toBeDefined()
          expect(plugin?.metadata.id).toBe(id)
          expect(plugin?.metadata.version).toBeDefined()
          expect(plugin?.metadata.supportedLocales).toContain('en')
          expect(plugin?.metadata.supportedLocales).toContain('de')
          console.log(`✅ ${name}: Valid metadata`)
        })

        it('should have Vue component', () => {
          expect(plugin?.component).toBeDefined()
          console.log(`✅ ${name}: Has Vue component`)
        })

        it('should have translations for both locales', () => {
          expect(plugin?.translations).toBeDefined()
          expect(plugin?.translations.de).toBeDefined()
          expect(plugin?.translations.en).toBeDefined()
          
          const deKeys = Object.keys(plugin?.translations.de || {})
          const enKeys = Object.keys(plugin?.translations.en || {})
          
          expect(deKeys.length).toBeGreaterThan(0)
          expect(enKeys.length).toBe(deKeys.length)
          console.log(`✅ ${name}: ${deKeys.length} translation keys per locale`)
        })

        it('should have scoring functions', () => {
          expect(plugin?.calculateScore).toBeDefined()
          expect(plugin?.validateFormData).toBeDefined()
          expect(plugin?.getInitialData).toBeDefined()
          expect(plugin?.generateMockData).toBeDefined()
          console.log(`✅ ${name}: All scoring functions present`)
        })

        it('should generate initial data with null values', () => {
          const initialData = plugin?.getInitialData()
          expect(initialData).toBeDefined()
          expect(initialData?.[section]).toBeDefined()
          
          const sectionData = initialData?.[section]
          const keys = Object.keys(sectionData || {})
          
          expect(keys.length).toBe(questions)
          
          keys.forEach(key => {
            expect(sectionData?.[key]).toBeNull()
          })
          
          console.log(`✅ ${name}: Initial data has ${questions} null questions`)
        })

        it('should calculate score from mock data', () => {
          expect(plugin?.generateMockData).toBeDefined()
          const mockData = plugin!.generateMockData!()
          expect(mockData).toBeDefined()
          
          const result = plugin?.calculateScore(mockData!)
          expect(result).toBeDefined()
          expect(result?.totalScore).toBeDefined()
          expect(result?.totalScore?.rawScore).toBeGreaterThan(0)
          expect(result?.totalScore?.maxScore).toBe(100)
          
          console.log(`✅ ${name}: Mock data scores ${result?.totalScore?.rawScore}/100`)
        })

        it('should validate correct data', () => {
          expect(plugin?.generateMockData).toBeDefined()
          const mockData = plugin!.generateMockData!()
          const isValid = plugin?.validateFormData(mockData!)
          
          expect(isValid).toBe(true)
          console.log(`✅ ${name}: Validates mock data correctly`)
        })

        it('should have JSON schema', () => {
          expect(plugin?.schema).toBeDefined()
          expect(plugin?.schema?.type).toBe('object')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((plugin?.schema?.properties as any)?.[section]).toBeDefined()
          console.log(`✅ ${name}: Has JSON schema`)
        })

        it('should calculate perfect score as 100', () => {
          // Create perfect score data based on schema
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schema = (plugin?.schema?.properties as any)?.[section]
          if (!schema || !schema.properties) {
            throw new Error('Schema not found')
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const perfectData: any = {}
          perfectData[section] = {}

          Object.keys(schema.properties).forEach(key => {
            const question = schema.properties![key]
            const enumValues = question.enum || []
            // Use first (highest) enum value, excluding null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const maxValue = enumValues.filter((v: any) => v !== null)[0]
            perfectData[section][key] = maxValue
          })

          const result = plugin?.calculateScore(perfectData)
          expect(result?.totalScore?.rawScore).toBe(100)
          expect(result?.totalScore?.normalizedScore).toBe(100)
          console.log(`✅ ${name}: Perfect score = 100`)
        })
      })
    })
  })

  describe('Translation Coverage', () => {
    it('should have question translations for all forms', () => {
      aofasIds.forEach(({ id, questions }) => {
        const plugin = getFormPlugin(id)
        const translations = plugin?.translations.de
        
        for (let i = 1; i <= questions; i++) {
          const questionKey = `q${i}`
          
          const hasTranslation = Object.keys(translations || {}).some(k => 
            k.includes(`questions.${questionKey}`)
          )
          
          expect(hasTranslation).toBe(true)
        }
      })
      console.log('✅ All AOFAS forms have complete translations')
    })
  })

  describe('Score Consistency', () => {
    it('should maintain same max score across all AOFAS forms', () => {
      const maxScores: number[] = []
      
      aofasIds.forEach(({ id }) => {
        const plugin = getFormPlugin(id)
        if (plugin?.generateMockData) {
          const mockData = plugin.generateMockData()
          const result = plugin?.calculateScore(mockData!)
          
          maxScores.push(result?.totalScore?.maxScore || 0)
        }
      })
      
      expect(new Set(maxScores).size).toBe(1)
      expect(maxScores[0]).toBe(100)
      console.log('✅ All AOFAS forms have consistent max score of 100')
    })
  })
})
