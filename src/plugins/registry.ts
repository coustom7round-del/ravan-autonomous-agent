/**
 * Plugin Registry - Manages plugin lifecycle and discovery
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@utils/logger';
import { Plugin } from '@core/types';

const logger = Logger.getInstance();

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsPath: string;

  constructor(pluginsPath: string = './plugins') {
    this.pluginsPath = pluginsPath;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Plugin Registry...');
    await this.discoverPlugins();
    await this.initializePlugins();
    logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Discover plugins in the plugins directory
   */
  private async discoverPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(this.pluginsPath)) {
        logger.info('No plugins directory found');
        return;
      }

      const entries = await fs.promises.readdir(this.pluginsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(this.pluginsPath, entry.name, 'manifest.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
              this.registerPlugin({
                id: manifest.id || entry.name,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                initialize: async () => {
                  logger.info(`Plugin ${manifest.name} initialized`);
                },
                execute: async (input: any) => {
                  logger.info(`Plugin ${manifest.name} executed`);
                  return { success: true };
                },
              });
            } catch (error) {
              logger.warn(`Failed to load plugin manifest: ${manifestPath}`, error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error discovering plugins:', error);
    }
  }

  /**
   * Initialize all plugins
   */
  private async initializePlugins(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      try {
        await plugin.initialize();
        logger.info(`Plugin initialized: ${id}`);
      } catch (error) {
        logger.error(`Plugin initialization failed: ${id}`, error);
        this.plugins.delete(id);
      }
    }
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    logger.info(`Plugin registered: ${plugin.id}`);
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute a plugin
   */
  async executePlugin(id: string, input: any): Promise<any> {
    const plugin = this.getPlugin(id);
    if (!plugin) {
      throw new Error(`Plugin not found: ${id}`);
    }

    try {
      const result = await plugin.execute(input);
      return result;
    } catch (error) {
      logger.error(`Plugin execution failed: ${id}`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(id: string): boolean {
    return this.plugins.delete(id);
  }

  /**
   * List all plugins
   */
  listPlugins(): Array<{ id: string; name: string; version: string; description: string }> {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
    }));
  }
}
