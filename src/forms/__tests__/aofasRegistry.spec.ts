/**
 * Test AOFAS Plugin Registry Integration
 */
import { describe, it, expect } from 'vitest'
import { getFormPlugin, hasFormPlugin, getAllFormPlugins } from '../registry'

describe('AOFAS Plugin Registry Integration', () => {
  it('should register AOFAS plugin with correct ID', () => {
    const aofasId = '67b4e612d0feb4ad99ae2e84'
    
    expect(hasFormPlugin(aofasId)).toBe(true)
    console.log('✅ AOFAS plugin registered in registry')
  })

  it('should retrieve AOFAS plugin from registry', () => {
    const aofasId = '67b4e612d0feb4ad99ae2e84'
    const plugin = getFormPlugin(aofasId)
    
    expect(plugin).toBeDefined()
    expect(plugin?.metadata.name).toBe('AOFAS')
    expect(plugin?.metadata.id).toBe(aofasId)
    expect(plugin?.metadata.version).toBe('1.0.0')
    expect(plugin?.metadata.supportedLocales).toContain('en')
    expect(plugin?.metadata.supportedLocales).toContain('de')
    
    console.log('✅ AOFAS plugin retrieved successfully')
    console.log(`   Name: ${plugin?.metadata.name}`)
    console.log(`   ID: ${plugin?.metadata.id}`)
    console.log(`   Version: ${plugin?.metadata.version}`)
  })

  it('should have all required plugin functions', () => {
    const aofasId = '67b4e612d0feb4ad99ae2e84'
    const plugin = getFormPlugin(aofasId)
    
    expect(plugin?.component).toBeDefined()
    expect(plugin?.translations).toBeDefined()
    expect(plugin?.calculateScore).toBeDefined()
    expect(plugin?.validateFormData).toBeDefined()
    expect(plugin?.getInitialData).toBeDefined()
    expect(plugin?.generateMockData).toBeDefined()
    
    console.log('✅ AOFAS plugin has all required functions')
  })

  it('should have translations for both locales', () => {
    const aofasId = '67b4e612d0feb4ad99ae2e84'
    const plugin = getFormPlugin(aofasId)
    
    expect(plugin?.translations.en).toBeDefined()
    expect(plugin?.translations.de).toBeDefined()
    
    // Check key translations exist
    expect(plugin?.translations.en['aofas.title']).toBeDefined()
    expect(plugin?.translations.en['aofas.questions.q1']).toBeDefined()
    expect(plugin?.translations.en['aofas.q1.none']).toBeDefined()
    
    expect(plugin?.translations.de['aofas.title']).toBeDefined()
    expect(plugin?.translations.de['aofas.questions.q1']).toBeDefined()
    expect(plugin?.translations.de['aofas.q1.none']).toBeDefined()
    
    console.log('✅ AOFAS plugin has complete translations')
    console.log(`   English keys: ${Object.keys(plugin?.translations.en || {}).length}`)
    console.log(`   German keys: ${Object.keys(plugin?.translations.de || {}).length}`)
  })

  it('should be included in getAllFormPlugins', () => {
    const allPlugins = getAllFormPlugins()
    const aofasPlugin = allPlugins.find(p => p.metadata.name === 'AOFAS')
    
    expect(aofasPlugin).toBeDefined()
    expect(allPlugins.length).toBeGreaterThanOrEqual(3) // AOFAS, MOXFQ, VAS
    
    console.log('✅ AOFAS plugin in plugin list')
    console.log(`   Total plugins: ${allPlugins.length}`)
    console.log(`   Plugins: ${allPlugins.map(p => p.metadata.name).join(', ')}`)
  })

  it('should execute calculateScore function', () => {
    const aofasId = '67b4e612d0feb4ad99ae2e84'
    const plugin = getFormPlugin(aofasId)
    
    expect(plugin).toBeDefined()
    expect(plugin!.generateMockData).toBeDefined()
    const mockData = plugin!.generateMockData!()
    const score = plugin!.calculateScore(mockData)
    
    expect(score).toBeDefined()
    expect(score.totalScore).toBeDefined()
    expect(score.totalScore!.rawScore).toBe(75)
    expect(score.totalScore!.maxScore).toBe(100)
    
    console.log('✅ AOFAS calculateScore execution successful')
    console.log(`   Score: ${score.totalScore!.rawScore}/${score.totalScore!.maxScore}`)
  })
})
