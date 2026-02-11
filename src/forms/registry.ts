/**
 * Form Plugin Registry
 * 
 * This module provides auto-discovery and registration of form plugins.
 * Plugins are automatically loaded from the ./plugins directory using Vite's import.meta.glob.
 * 
 * Usage:
 *   import { formPluginRegistry, getFormPlugin } from '@/forms/registry'
 *   
 *   const plugin = getFormPlugin('67b4e612d0feb4ad99ae2e85') // MOXFQ
 *   if (plugin) {
 *     const MyForm = plugin.component
 *   }
 */

import type { FormPlugin, FormPluginRegistry, FormPluginRegistryEntry } from './types'

/**
 * Global registry of all form plugins
 */
export const formPluginRegistry: FormPluginRegistry = new Map()

/**
 * Auto-discover and register all form plugins
 * Uses Vite's import.meta.glob to load all plugin index files
 */
function discoverPlugins() {
  // Import all plugin index files eagerly (at build time)
  const pluginModules = import.meta.glob<{ default: FormPlugin }>(
    './plugins/*/index.ts',
    { eager: true }
  )

  // Register each discovered plugin
  for (const [path, module] of Object.entries(pluginModules)) {
    const plugin = module.default
    
    if (!plugin || !plugin.metadata) {
      console.warn(`[FormRegistry] Invalid plugin at ${path}: missing metadata`)
      continue
    }

    // Validate plugin has required properties
    if (!plugin.component || !plugin.calculateScore || !plugin.translations) {
      console.warn(
        `[FormRegistry] Invalid plugin "${plugin.metadata.name}": missing required properties`
      )
      continue
    }

    // Register the plugin
    const entry: FormPluginRegistryEntry = {
      plugin,
      registeredAt: new Date()
    }

    formPluginRegistry.set(plugin.metadata.id, entry)
    
    console.log(
      `[FormRegistry] Registered plugin: ${plugin.metadata.name} (${plugin.metadata.id})`
    )
  }

  console.log(`[FormRegistry] Total plugins registered: ${formPluginRegistry.size}`)
}

/**
 * Get a form plugin by its ID
 * @param id Form template ID
 * @returns The form plugin, or undefined if not found
 */
export function getFormPlugin(id: string): FormPlugin | undefined {
  const entry = formPluginRegistry.get(id)
  return entry?.plugin
}

/**
 * Get all registered form plugins
 * @returns Array of all registered plugins
 */
export function getAllFormPlugins(): FormPlugin[] {
  return Array.from(formPluginRegistry.values()).map(entry => entry.plugin)
}

/**
 * Check if a form plugin is registered
 * @param id Form template ID
 * @returns true if the plugin is registered
 */
export function hasFormPlugin(id: string): boolean {
  return formPluginRegistry.has(id)
}

/**
 * Get plugin metadata without loading the full plugin
 * @param id Form template ID
 * @returns Plugin metadata, or undefined if not found
 */
export function getPluginMetadata(id: string) {
  const entry = formPluginRegistry.get(id)
  return entry?.plugin.metadata
}

// Auto-discover and register plugins on module load
discoverPlugins()
