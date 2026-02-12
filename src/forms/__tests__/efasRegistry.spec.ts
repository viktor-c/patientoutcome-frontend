/**
 * Test EFAS Plugin Registry Integration
 */
import { describe, it, expect } from 'vitest'
import { getFormPlugin, hasFormPlugin, getAllFormPlugins } from '../registry'

describe('EFAS Plugin Registry Integration', () => {
  it('should register EFAS plugin with correct ID', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    
    expect(hasFormPlugin(efasId)).toBe(true)
    console.log('✅ EFAS plugin registered in registry')
  })

  it('should retrieve EFAS plugin from registry', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    expect(plugin?.metadata.name).toBe('EFAS')
    expect(plugin?.metadata.id).toBe(efasId)
    expect(plugin?.metadata.version).toBe('1.0.0')
    expect(plugin?.metadata.supportedLocales).toContain('en')
    expect(plugin?.metadata.supportedLocales).toContain('de')
    
    console.log('✅ EFAS plugin retrieved successfully')
    console.log(`   Name: ${plugin?.metadata.name}`)
    console.log(`   ID: ${plugin?.metadata.id}`)
    console.log(`   Version: ${plugin?.metadata.version}`)
  })

  it('should have all required plugin functions', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin?.component).toBeDefined()
    expect(plugin?.translations).toBeDefined()
    expect(plugin?.calculateScore).toBeDefined()
    expect(plugin?.validateFormData).toBeDefined()
    expect(plugin?.getInitialData).toBeDefined()
    expect(plugin?.generateMockData).toBeDefined()
    
    console.log('✅ EFAS plugin has all required functions')
  })

  it('should have translations for both locales', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin?.translations.en).toBeDefined()
    expect(plugin?.translations.de).toBeDefined()
    
    // Check key translations exist
    expect(plugin?.translations.en['efas.title.label']).toBeDefined()
    expect(plugin?.translations.en['standardfragebogen.q1.label']).toBeDefined()
    expect(plugin?.translations.en['sportfragebogen.s1.label']).toBeDefined()
    
    expect(plugin?.translations.de['efas.title.label']).toBeDefined()
    expect(plugin?.translations.de['standardfragebogen.q1.label']).toBeDefined()
    expect(plugin?.translations.de['sportfragebogen.s1.label']).toBeDefined()
    
    console.log('✅ EFAS plugin has complete translations')
    console.log(`   English keys: ${Object.keys(plugin?.translations.en || {}).length}`)
    console.log(`   German keys: ${Object.keys(plugin?.translations.de || {}).length}`)
  })

  it('should be included in getAllFormPlugins', () => {
    const allPlugins = getAllFormPlugins()
    const efasPlugin = allPlugins.find(p => p.metadata.name === 'EFAS')
    
    expect(efasPlugin).toBeDefined()
    expect(allPlugins.length).toBeGreaterThanOrEqual(4) // AOFAS, MOXFQ, VAS, EFAS
    
    console.log('✅ EFAS plugin in plugin list')
    console.log(`   Total plugins: ${allPlugins.length}`)
    console.log(`   Plugins: ${allPlugins.map(p => p.metadata.name).join(', ')}`)
  })

  it('should execute getInitialData function', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    const initialData = plugin?.getInitialData()
    
    expect(initialData).toBeDefined()
    expect(initialData?.standardfragebogen).toBeDefined()
    expect(initialData?.sportfragebogen).toBeDefined()
    
    // Standard questions should be null initially
    expect(initialData?.standardfragebogen?.q1).toBeNull()
    expect(initialData?.standardfragebogen?.q6).toBeNull()
    
    // Sport questions should be null initially
    expect(initialData?.sportfragebogen?.s1).toBeNull()
    expect(initialData?.sportfragebogen?.s4).toBeNull()
    
    console.log('✅ EFAS getInitialData execution successful')
    console.log(`   Standard questions: ${Object.keys(initialData?.standardfragebogen || {}).length}`)
    console.log(`   Sport questions: ${Object.keys(initialData?.sportfragebogen || {}).length}`)
  })

  it('should execute generateMockData function', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    expect(plugin!.generateMockData).toBeDefined()
    const mockData = plugin!.generateMockData!()
    
    expect(mockData).toBeDefined()
    expect(mockData.standardfragebogen).toBeDefined()
    expect(mockData.sportfragebogen).toBeDefined()
    
    // Standard questions should have values
    expect(typeof mockData.standardfragebogen!.q1).toBe('number')
    expect(typeof mockData.standardfragebogen!.q6).toBe('number')
    
    // Sport questions should have values
    expect(typeof mockData.sportfragebogen!.s1).toBe('number')
    expect(typeof mockData.sportfragebogen!.s4).toBe('number')
    
    console.log('✅ EFAS generateMockData execution successful')
  })

  it('should execute calculateScore function with mock data', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    expect(plugin!.generateMockData).toBeDefined()
    const mockData = plugin!.generateMockData!()
    const score = plugin!.calculateScore(mockData)
    
    expect(score).toBeDefined()
    expect(score.rawData).toBeDefined()
    expect(score.subscales).toBeDefined()
    expect(score.total).toBeDefined()
    
    // Check subscales
    expect(score.subscales.standard).toBeDefined()
    expect(score.subscales.standard!.name).toBe('Standard Questions')
    expect(score.subscales.standard!.totalQuestions).toBe(6)
    
    expect(score.subscales.sport).toBeDefined()
    expect(score.subscales.sport!.name).toBe('Sport Questions')
    expect(score.subscales.sport!.totalQuestions).toBe(4)
    
    // Check total score
    expect(score.total!.name).toBe('EFAS Total')
    expect(score.total!.totalQuestions).toBe(10)
    expect(score.total!.rawScore).toBeGreaterThan(0)
    expect(score.total!.normalizedScore).toBeGreaterThan(0)
    expect(score.total!.normalizedScore).toBeLessThanOrEqual(100)
    
    console.log('✅ EFAS calculateScore execution successful')
    console.log(`   Standard subscale: ${score.subscales.standard!.rawScore}/${score.subscales.standard!.maxPossibleScore}`)
    console.log(`   Sport subscale: ${score.subscales.sport!.rawScore}/${score.subscales.sport!.maxPossibleScore}`)
    console.log(`   Total score: ${score.total!.rawScore}/${score.total!.maxPossibleScore} (${score.total!.normalizedScore}%)`)
  })

  it('should validate complete form data', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    expect(plugin!.generateMockData).toBeDefined()
    const mockData = plugin!.generateMockData!()
    const isValid = plugin!.validateFormData(mockData)
    
    expect(isValid).toBe(true)
    
    console.log('✅ EFAS validateFormData - complete data is valid')
  })

  it('should validate incomplete form data (validation passes, but completeness tracked in scoring)', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    const incompleteData = {
      standardfragebogen: {
        q1: 2,
        q2: null, // Missing required question
        q3: 3,
        q4: 2,
        q5: 3,
        q6: 2
      },
      sportfragebogen: {
        s1: null,
        s2: null,
        s3: null,
        s4: null
      }
    }
    
    // Validation passes (structure is valid)
    const isValid = plugin!.validateFormData(incompleteData)
    expect(isValid).toBe(true)
    
    // But completeness is tracked in scoring
    const score = plugin!.calculateScore(incompleteData)
    expect(score.subscales.standard!.isComplete).toBe(false)
    expect(score.subscales.standard!.answeredQuestions).toBe(5)
    expect(score.subscales.standard!.totalQuestions).toBe(6)
    
    console.log('✅ EFAS validateFormData - incomplete data passes validation, incompleteness tracked in scoring')
  })

  it('should validate form data with missing sport questions (sport is optional)', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    const dataWithoutSport = {
      standardfragebogen: {
        q1: 2,
        q2: 3,
        q3: 2,
        q4: 3,
        q5: 2,
        q6: 3
      },
      sportfragebogen: {
        s1: null,
        s2: null,
        s3: null,
        s4: null
      }
    }
    
    const isValid = plugin!.validateFormData(dataWithoutSport)
    
    expect(isValid).toBe(true)
    
    console.log('✅ EFAS validateFormData - data without sport questions is valid (sport is optional)')
  })

  it('should calculate score with only standard questions answered', () => {
    const efasId = '67b4e612d0feb4ad99ae2e83'
    const plugin = getFormPlugin(efasId)
    
    expect(plugin).toBeDefined()
    const dataWithoutSport = {
      standardfragebogen: {
        q1: 2,
        q2: 3,
        q3: 2,
        q4: 3,
        q5: 2,
        q6: 3
      },
      sportfragebogen: {
        s1: null,
        s2: null,
        s3: null,
        s4: null
      }
    }
    
    const score = plugin!.calculateScore(dataWithoutSport)
    
    expect(score).toBeDefined()
    expect(score.subscales.standard!.isComplete).toBe(true)
    expect(score.subscales.standard!.answeredQuestions).toBe(6)
    expect(score.subscales.sport!.answeredQuestions).toBe(0)
    expect(score.total!.answeredQuestions).toBe(6)
    
    console.log('✅ EFAS calculateScore - score calculated with only standard questions')
    console.log(`   Standard: ${score.subscales.standard!.rawScore}/${score.subscales.standard!.maxPossibleScore}`)
    console.log(`   Total: ${score.total!.rawScore}/${score.total!.maxPossibleScore}`)
  })
})
