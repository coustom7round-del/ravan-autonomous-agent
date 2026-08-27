/**
 * Ravan Core Agent
 * Main agent loop implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { MemoryManager } from '@memory/manager';
import { SkillManager } from '@skills/manager';
import { PluginRegistry } from '@plugins/registry';
import { EvolutionEngine } from '@evolution/engine';
import { Logger } from '@utils/logger';
import {
  Message,
  Session,
  ToolCall,
  ToolResult,
  Tool,
  AgentConfig,
  AgentMetrics,
} from './types';

const logger = Logger.getInstance();

export interface AgentOptions {
  memoryManager: MemoryManager;
  skillManager: SkillManager;
  pluginRegistry: PluginRegistry;
  evolutionEngine: EvolutionEngine;
  config?: AgentConfig;
}

export class RavanAgent {
  private id: string;
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private skillManager: SkillManager;
  private pluginRegistry: PluginRegistry;
  private evolutionEngine: EvolutionEngine;
  private sessions: Map<string, Session> = new Map();
  private tools: Map<string, Tool> = new Map();
  private metrics: AgentMetrics = {
    executionTime: 0,
    toolCallCount: 0,
    successScore: 0,
    memoryUsage: 0,
    cost: 0,
  };

  constructor(options: AgentOptions) {
    this.id = uuidv4();
    this.memoryManager = options.memoryManager;
    this.skillManager = options.skillManager;
    this.pluginRegistry = options.pluginRegistry;
    this.evolutionEngine = options.evolutionEngine;
    this.config = {
      maxIterations: 500,
      timeout: 300000,
      enableSkills: true,
      enableCron: true,
      enableSpawning: true,
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      ...options.config,
    };

    logger.info(`🤖 Ravan Agent initialized: ${this.id}`);
  }

  /**
   * Main agent chat function
   */
  async chat(userId: string, message: string): Promise<string> {
    const startTime = Date.now();
    const sessionId = this.getOrCreateSessionId(userId);
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      logger.info(`[${sessionId}] Processing message: ${message.substring(0, 50)}...`);

      // Load context from memory
      const memoryContext = await this.memoryManager.getContext(userId, message);
      logger.debug(`Memory context loaded: ${memoryContext.length} entries`);

      // Get available skills
      const availableSkills = await this.skillManager.getAvailableSkills();
      logger.debug(`Available skills: ${availableSkills.length}`);

      // Add user message to session
      session.messages.push({
        role: 'user',
        content: message,
      });

      // Agent loop
      let response: string = '';
      let iterations = 0;

      while (iterations < this.config.maxIterations!) {
        iterations++;
        logger.debug(`[${sessionId}] Iteration ${iterations}/${this.config.maxIterations}`);

        // Build messages for model
        const modelMessages = this.buildModelMessages(session, memoryContext);

        // Build tools schema
        const toolSchemas = this.buildToolSchemas();

        // Call model
        logger.debug(`[${sessionId}] Calling model: ${this.config.model}`);
        const modelResponse = await this.callModel(modelMessages, toolSchemas);

        if (modelResponse.toolCalls && modelResponse.toolCalls.length > 0) {
          // Execute tools
          const toolResults: ToolResult[] = [];

          for (const toolCall of modelResponse.toolCalls) {
            logger.debug(`[${sessionId}] Executing tool: ${toolCall.name}`);
            const result = await this.executeTool(toolCall);
            toolResults.push(result);
            this.metrics.toolCallCount++;
          }

          // Add tool results to session
          for (const result of toolResults) {
            session.messages.push({
              role: 'tool',
              content: result.content,
              toolUseId: result.toolUseId,
            });
          }
        } else {
          // No more tool calls, we have final response
          response = modelResponse.content;
          break;
        }
      }

      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: response,
      });

      // Update memory with interaction
      await this.memoryManager.updateMemory(userId, {
        userMessage: message,
        agentResponse: response,
        context: session.metadata,
      });

      // Update metrics
      this.metrics.executionTime = Date.now() - startTime;

      // Check if we should promote skills
      if (this.config.enableSpawning) {
        await this.checkSkillPromotion(session);
      }

      // Persist session
      this.persistSession(session);

      logger.info(`[${sessionId}] Response generated in ${this.metrics.executionTime}ms`);

      return response;
    } catch (error) {
      logger.error(`[${sessionId}] Error during chat:`, error);
      throw error;
    }
  }

  /**
   * Build messages for model API
   */
  private buildModelMessages(session: Session, memoryContext: string[]): Message[] {
    const messages: Message[] = [];

    // System message
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(memoryContext),
    });

    // Session history
    messages.push(...session.messages);

    return messages;
  }

  /**
   * Build system prompt with memory and context
   */
  private buildSystemPrompt(memoryContext: string[]): string {
    let prompt = `You are Ravan, an autonomous AI agent with self-learning capabilities.

You can:
1. Use tools to accomplish tasks
2. Learn from experiences and create new skills
3. Manage your memory and recall past interactions
4. Spawn sub-agents for parallel task execution
5. Evolve and improve over time

Current capabilities:
- Tool execution and orchestration
- Memory management and recall
- Skill creation and improvement
- Sub-agent spawning and monitoring
- Task automation and scheduling

Guidelines:
- Be thorough and thoughtful in your responses
- Use tools when needed to accomplish tasks
- Learn from each interaction
- Consider creating new skills for repeated patterns
- Be honest about your limitations

${memoryContext.length > 0 ? `\nRelevant context from your memory:\n${memoryContext.join('\n')}` : ''}`;

    return prompt;
  }

  /**
   * Build tool schemas for model
   */
  private buildToolSchemas(): Record<string, any>[] {
    const schemas: Record<string, any>[] = [];

    for (const [name, tool] of this.tools) {
      schemas.push({
        name,
        description: tool.description,
        input_schema: tool.inputSchema,
      });
    }

    return schemas;
  }

  /**
   * Call model API
   */
  private async callModel(
    messages: Message[],
    tools: Record<string, any>[],
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    // This will be implemented in Phase 2 with actual model integration
    // For now, return a simple response
    logger.debug('Model call (Phase 1 stub)');

    return {
      content: 'This is a placeholder response. Full model integration in Phase 2.',
      toolCalls: [],
    };
  }

  /**
   * Execute a tool
   */
  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      return {
        toolUseId: toolCall.id,
        content: `Tool not found: ${toolCall.name}`,
        isError: true,
      };
    }

    try {
      const result = await tool.execute(toolCall.arguments);
      return {
        toolUseId: toolCall.id,
        content: result,
      };
    } catch (error) {
      logger.error(`Tool execution failed: ${toolCall.name}`, error);
      return {
        toolUseId: toolCall.id,
        content: `Error executing tool: ${error}`,
        isError: true,
      };
    }
  }

  /**
   * Check if skills should be promoted
   */
  private async checkSkillPromotion(session: Session): Promise<void> {
    // This will be implemented in Phase 3
    logger.debug('Skill promotion check (Phase 3)');
  }

  /**
   * Get or create session for user
   */
  private getOrCreateSessionId(userId: string): string {
    let sessionId = Array.from(this.sessions.values()).find((s) => s.userId === userId)?.id;

    if (!sessionId) {
      sessionId = uuidv4();
      const session: Session = {
        id: sessionId,
        userId,
        agentId: this.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        state: {},
        metadata: {},
      };
      this.sessions.set(sessionId, session);
      logger.info(`New session created: ${sessionId} for user: ${userId}`);
    }

    return sessionId;
  }

  /**
   * Get session by ID
   */
  private getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Persist session to storage
   */
  private async persistSession(session: Session): Promise<void> {
    session.updatedAt = new Date();
    // This will be implemented with actual persistence in Phase 2
    logger.debug(`Session persisted: ${session.id}`);
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    logger.info(`Tool registered: ${tool.name}`);
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }
}
