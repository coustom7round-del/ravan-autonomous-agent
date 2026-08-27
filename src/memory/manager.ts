/**
 * Memory Manager - Hybrid fast/deep recall system
 * Combines Markdown storage with vector search
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@utils/logger';
import { Memory, MemoryEntry } from '@core/types';

const logger = Logger.getInstance();

export class MemoryManager {
  private memoryPath: string;
  private memories: Map<string, Memory> = new Map();

  constructor(memoryPath: string = './data/memory') {
    this.memoryPath = memoryPath;
    this.ensureDirectoryExists();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Memory Manager...');
    await this.loadExistingMemories();
    logger.info(`Loaded ${this.memories.size} existing memory stores`);
  }

  /**
   * Get memory context for a user and query
   */
  async getContext(userId: string, query: string): Promise<string[]> {
    const memory = await this.getOrCreateMemory(userId);
    
    if (!memory.entries.length) {
      return [];
    }

    // Fast path: lexical and trigger matching
    const fastResults = this.fastRecall(memory.entries, query);
    
    // Deep path: would use vector similarity (Phase 2)
    // For now, return fast results
    
    return fastResults.map(e => e.content);
  }

  /**
   * Fast recall - lexical and trigger phrase matching
   */
  private fastRecall(entries: MemoryEntry[], query: string): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const entry of entries) {
      let score = 0;

      // Check trigger phrases
      if (entry.triggerPhrases) {
        for (const trigger of entry.triggerPhrases) {
          if (query.toLowerCase().includes(trigger.toLowerCase())) {
            score += 5;
          }
        }
      }

      // Check content similarity
      const contentLower = entry.content.toLowerCase();
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          score += 1;
        }
      }

      // Apply recency decay (30-day half-life)
      const daysSinceCreated = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.pow(0.5, daysSinceCreated / 30);
      score *= recencyMultiplier;

      // Apply importance multiplier
      score *= (entry.importance / 10);

      if (score > 0) {
        results.push(entry);
      }
    }

    // Sort by score descending
    results.sort((a, b) => {
      const scoreA = this.calculateScore(a, query);
      const scoreB = this.calculateScore(b, query);
      return scoreB - scoreA;
    });

    return results.slice(0, 5); // Return top 5
  }

  /**
   * Calculate relevance score for an entry
   */
  private calculateScore(entry: MemoryEntry, query: string): number {
    let score = 0;
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Trigger phrase matching
    if (entry.triggerPhrases) {
      for (const trigger of entry.triggerPhrases) {
        if (query.toLowerCase().includes(trigger.toLowerCase())) {
          score += 5;
        }
      }
    }

    // Content term matching
    const contentLower = entry.content.toLowerCase();
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        score += 1;
      }
    }

    // Recency decay
    const daysSinceCreated = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyMultiplier = Math.pow(0.5, daysSinceCreated / 30);
    score *= recencyMultiplier;

    // Importance multiplier
    score *= (entry.importance / 10);

    return score;
  }

  /**
   * Update memory with new interaction
   */
  async updateMemory(userId: string, data: {
    userMessage: string;
    agentResponse: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);

    const entry: MemoryEntry = {
      id: uuidv4(),
      content: `User: ${data.userMessage}\nAgent: ${data.agentResponse}`,
      importance: 5, // Default importance
      timestamp: new Date(),
      tags: [],
      triggerPhrases: this.extractTriggerPhrases(data.userMessage),
    };

    memory.entries.push(entry);
    memory.lastUpdated = new Date();

    await this.persistMemory(userId, memory);
    logger.debug(`Memory updated for user: ${userId}`);
  }

  /**
   * Extract potential trigger phrases from text
   */
  private extractTriggerPhrases(text: string): string[] {
    // Simple extraction - more sophisticated in Phase 2
    const sentences = text.split(/[.!?]/).filter(s => s.length > 5);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  /**
   * Get or create memory for user
   */
  private async getOrCreateMemory(userId: string): Promise<Memory> {
    if (this.memories.has(userId)) {
      return this.memories.get(userId)!;
    }

    const userMemory: Memory = {
      userId,
      entries: [],
      userProfile: {},
      lastUpdated: new Date(),
    };

    this.memories.set(userId, userMemory);
    return userMemory;
  }

  /**
   * Persist memory to disk
   */
  private async persistMemory(userId: string, memory: Memory): Promise<void> {
    const memoryFile = path.join(this.memoryPath, `${userId}.json`);
    const data = JSON.stringify(memory, null, 2);
    await fs.promises.writeFile(memoryFile, data);
  }

  /**
   * Load existing memories from disk
   */
  private async loadExistingMemories(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.memoryPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const userId = file.replace('.json', '');
          const filePath = path.join(this.memoryPath, file);
          const data = await fs.promises.readFile(filePath, 'utf-8');
          const memory = JSON.parse(data);
          memory.lastUpdated = new Date(memory.lastUpdated);
          memory.entries = memory.entries.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }));
          this.memories.set(userId, memory);
        }
      }
    } catch (error) {
      logger.debug('No existing memories to load');
    }
  }

  /**
   * Ensure memory directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
  }

  /**
   * Consolidate memory (Phase 3)
   */
  async consolidateMemory(userId: string): Promise<void> {
    logger.info(`Consolidating memory for user: ${userId}`);
    // Implementation in Phase 3
  }

  /**
   * Export memory for a user
   */
  async exportMemory(userId: string): Promise<string> {
    const memory = await this.getOrCreateMemory(userId);
    const markdown = `# Memory for ${userId}\n\n`
      + memory.entries.map(e => `- ${e.content} (Importance: ${e.importance}/10)`).join('\n');
    return markdown;
  }
}
