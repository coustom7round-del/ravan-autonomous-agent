/**
 * Gateway Server - Multi-platform messaging interface
 */

import Fastify from 'fastify';
import WebSocket from 'ws';
import * as http from 'http';
import { Logger } from '@utils/logger';
import { RavanAgent } from '@core/agent';
import { APIResponse } from '@core/types';

const logger = Logger.getInstance();

export interface GatewayServerConfig {
  port: number;
  bind: string;
  agent: RavanAgent;
}

export class GatewayServer {
  private config: GatewayServerConfig;
  private fastify = Fastify();
  private wss?: WebSocket.Server;
  private server?: http.Server;

  constructor(config: GatewayServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    logger.info(`Starting Gateway Server on ${this.config.bind}:${this.config.port}`);

    try {
      // Register health endpoints
      this.registerHealthEndpoints();

      // Register chat endpoints
      this.registerChatEndpoints();

      // Start HTTP server
      const bindAddress = this.getBoundAddress();
      await this.fastify.listen({ port: this.config.port, host: bindAddress });

      logger.info(`✅ Gateway server started at http://${bindAddress}:${this.config.port}`);

      // Setup WebSocket for real-time messaging
      this.setupWebSocket();
    } catch (error) {
      logger.error('Failed to start gateway server:', error);
      throw error;
    }
  }

  /**
   * Get bound address based on configuration
   */
  private getBoundAddress(): string {
    switch (this.config.bind) {
      case 'loopback':
        return '127.0.0.1';
      case 'lan':
        return '0.0.0.0';
      case 'auto':
        return '0.0.0.0';
      default:
        return '127.0.0.1';
    }
  }

  /**
   * Register health check endpoints
   */
  private registerHealthEndpoints(): void {
    this.fastify.get('/health', async (_request, _reply) => {
      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    });

    this.fastify.get('/healthz', async (_request, _reply) => {
      return { status: 'ok' };
    });
  }

  /**
   * Register chat endpoints
   */
  private registerChatEndpoints(): void {
    // POST /chat - Send a message
    this.fastify.post<{ Body: { userId: string; message: string } }>(
      '/chat',
      async (request, reply) => {
        try {
          const { userId, message } = request.body;

          if (!userId || !message) {
            return reply.code(400).send({
              success: false,
              error: 'userId and message are required',
              timestamp: new Date(),
            } as APIResponse);
          }

          const response = await this.config.agent.chat(userId, message);

          return {
            success: true,
            data: { response },
            timestamp: new Date(),
          } as APIResponse;
        } catch (error) {
          logger.error('Chat endpoint error:', error);
          return reply.code(500).send({
            success: false,
            error: String(error),
            timestamp: new Date(),
          } as APIResponse);
        }
      },
    );

    // GET /status - Agent status
    this.fastify.get('/status', async (_request, _reply) => {
      const metrics = this.config.agent.getMetrics();
      return {
        success: true,
        data: {
          agentId: this.config.agent.getId(),
          metrics,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      } as APIResponse;
    });
  }

  /**
   * Setup WebSocket for real-time communication
   */
  private setupWebSocket(): void {
    // WebSocket support for streaming responses
    // Implementation in Phase 2
    logger.info('WebSocket support (Phase 2)');
  }

  /**
   * Stop the gateway server
   */
  async stop(): Promise<void> {
    logger.info('Stopping Gateway Server...');
    await this.fastify.close();
    if (this.wss) {
      this.wss.close();
    }
    logger.info('Gateway Server stopped');
  }
}
