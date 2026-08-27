/**
 * Ravan: Autonomous Agent Orchestration Engine
 * Main entry point
 */

import dotenv from 'dotenv';
import { RavanAgent } from '@core/agent';
import { GatewayServer } from '@gateway/server';
import { MemoryManager } from '@memory/manager';
import { PluginRegistry } from '@plugins/registry';
import { SkillManager } from '@skills/manager';
import { EvolutionEngine } from '@evolution/engine';
import { Logger } from '@utils/logger';

dotenv.config();

const logger = Logger.getInstance();

/**
 * Initialize and start Ravan
 */
async function main() {
  try {
    logger.info('🚀 Initializing Ravan Autonomous Agent...');

    // Initialize core systems
    logger.info('Loading plugin registry...');
    const pluginRegistry = new PluginRegistry();
    await pluginRegistry.initialize();

    logger.info('Initializing memory system...');
    const memoryManager = new MemoryManager();
    await memoryManager.initialize();

    logger.info('Initializing skill manager...');
    const skillManager = new SkillManager();
    await skillManager.initialize();

    logger.info('Initializing meta-evolution engine...');
    const evolutionEngine = new EvolutionEngine();
    await evolutionEngine.initialize();

    logger.info('Creating agent instance...');
    const agent = new RavanAgent({
      memoryManager,
      skillManager,
      pluginRegistry,
      evolutionEngine,
    });

    // Start gateway server
    const gatewayPort = parseInt(process.env.GATEWAY_PORT || '18789', 10);
    const gatewayBind = process.env.GATEWAY_BIND || 'loopback';

    logger.info(`Starting gateway server on ${gatewayBind}:${gatewayPort}...`);
    const gateway = new GatewayServer({
      port: gatewayPort,
      bind: gatewayBind,
      agent,
    });

    await gateway.start();

    logger.info('✅ Ravan is ready!');
    logger.info(`Gateway: ${gatewayBind}:${gatewayPort}`);
    logger.info('Press Ctrl+C to stop...');

  } catch (error) {
    logger.error('Failed to initialize Ravan:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down Ravan...');
  process.exit(0);
});

// Start application
main();
