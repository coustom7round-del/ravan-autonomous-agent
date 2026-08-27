/**
 * Core type definitions for Ravan
 */

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  toolUseId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  input: string;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  state: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  version: string;
  createdAt: Date;
  promotedAt?: Date;
  metrics: SkillMetrics;
  tags: string[];
  dependencies: string[];
}

export interface SkillMetrics {
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  avgScore: number;
  totalUses: number;
  rating: number; // 0-1
}

export interface SubAgent {
  id: string;
  parentAgentId: string;
  task: string;
  status: 'spawned' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  metrics: AgentMetrics;
  result?: any;
  error?: string;
}

export interface AgentMetrics {
  executionTime: number;
  toolCallCount: number;
  successScore: number; // 0-1
  memoryUsage: number;
  cost: number;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (input: Record<string, any>) => Promise<string>;
}

export interface AgentConfig {
  maxIterations?: number;
  timeout?: number;
  enableSkills?: boolean;
  enableCron?: boolean;
  enableSpawning?: boolean;
  model?: string;
  provider?: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  importance: number; // 1-10
  timestamp: Date;
  tags: string[];
  embedding?: number[];
  triggerPhrases?: string[];
}

export interface Memory {
  userId: string;
  entries: MemoryEntry[];
  userProfile: Record<string, any>;
  lastUpdated: Date;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  initialize: () => Promise<void>;
  execute: (input: any) => Promise<any>;
}

export interface GatewayConfig {
  port: number;
  bind: 'loopback' | 'lan' | 'auto' | 'custom';
  authMode: 'none' | 'token' | 'password' | 'trusted-proxy';
  authToken?: string;
  enableUI: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
