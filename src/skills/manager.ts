/**
 * Skill Manager - Manages skill creation, storage, and discovery
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@utils/logger';
import { Skill, SkillMetrics } from '@core/types';

const logger = Logger.getInstance();

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private skillsPath: string;

  constructor(skillsPath: string = './data/skills') {
    this.skillsPath = skillsPath;
    this.ensureDirectoryExists();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Skill Manager...');
    await this.loadExistingSkills();
    logger.info(`Loaded ${this.skills.size} skills`);
  }

  /**
   * Create a new skill
   */
  async createSkill(data: {
    name: string;
    description: string;
    code: string;
    tags?: string[];
    dependencies?: string[];
  }): Promise<Skill> {
    const skill: Skill = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      code: data.code,
      version: '0.0.1',
      createdAt: new Date(),
      metrics: {
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0,
        avgScore: 0,
        totalUses: 0,
        rating: 0,
      },
      tags: data.tags || [],
      dependencies: data.dependencies || [],
    };

    this.skills.set(skill.id, skill);
    await this.persistSkill(skill);
    logger.info(`Skill created: ${skill.id} - ${skill.name}`);

    return skill;
  }

  /**
   * Promote a temporary agent to a skill (Phase 3)
   */
  async promoteToSkill(agentResult: any): Promise<Skill | null> {
    // Implementation in Phase 3
    logger.info('Skill promotion (Phase 3)');
    return null;
  }

  /**
   * Update skill metrics after execution
   */
  async updateSkillMetrics(
    skillId: string,
    success: boolean,
    executionTime: number,
    score: number,
  ): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return;
    }

    const metrics = skill.metrics;
    metrics.totalUses++;

    if (success) {
      metrics.successCount++;
      metrics.rating = metrics.successCount / metrics.totalUses;
    } else {
      metrics.failureCount++;
    }

    metrics.avgExecutionTime =
      (metrics.avgExecutionTime * (metrics.totalUses - 1) + executionTime) / metrics.totalUses;
    metrics.avgScore = (metrics.avgScore * (metrics.totalUses - 1) + score) / metrics.totalUses;

    await this.persistSkill(skill);
    logger.debug(`Skill metrics updated: ${skillId}`);
  }

  /**
   * Get a skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Get available skills
   */
  async getAvailableSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values()).filter(s => s.rating > 0.5);
  }

  /**
   * Search skills by name or tags
   */
  searchSkills(query: string): Skill[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.skills.values()).filter(
      s =>
        s.name.toLowerCase().includes(queryLower) ||
        s.description.toLowerCase().includes(queryLower) ||
        s.tags.some(t => t.toLowerCase().includes(queryLower)),
    );
  }

  /**
   * Get top-rated skills
   */
  getTopSkills(limit: number = 10): Skill[] {
    return Array.from(this.skills.values())
      .sort((a, b) => b.metrics.rating - a.metrics.rating)
      .slice(0, limit);
  }

  /**
   * Persist skill to disk
   */
  private async persistSkill(skill: Skill): Promise<void> {
    const skillFile = path.join(this.skillsPath, `${skill.id}.json`);
    const data = JSON.stringify(skill, null, 2);
    await fs.promises.writeFile(skillFile, data);
  }

  /**
   * Load existing skills from disk
   */
  private async loadExistingSkills(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.skillsPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.skillsPath, file);
          const data = await fs.promises.readFile(filePath, 'utf-8');
          const skill = JSON.parse(data);
          skill.createdAt = new Date(skill.createdAt);
          if (skill.promotedAt) {
            skill.promotedAt = new Date(skill.promotedAt);
          }
          this.skills.set(skill.id, skill);
        }
      }
    } catch (error) {
      logger.debug('No existing skills to load');
    }
  }

  /**
   * Ensure skills directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.skillsPath)) {
      fs.mkdirSync(this.skillsPath, { recursive: true });
    }
  }

  /**
   * Delete a skill
   */
  async deleteSkill(id: string): Promise<boolean> {
    const skill = this.skills.get(id);
    if (!skill) {
      return false;
    }

    const skillFile = path.join(this.skillsPath, `${id}.json`);
    await fs.promises.unlink(skillFile);
    this.skills.delete(id);
    logger.info(`Skill deleted: ${id}`);

    return true;
  }

  /**
   * Export all skills as markdown
   */
  async exportSkillsAsMarkdown(): Promise<string> {
    let markdown = '# Ravan Skills Library\n\n';

    for (const skill of Array.from(this.skills.values()).sort((a, b) =>
      b.metrics.rating - a.metrics.rating,
    )) {
      markdown += `## ${skill.name}\n`;
      markdown += `- **Description**: ${skill.description}\n`;
      markdown += `- **Rating**: ${(skill.metrics.rating * 100).toFixed(1)}%\n`;
      markdown += `- **Uses**: ${skill.metrics.totalUses}\n`;
      markdown += `- **Version**: ${skill.version}\n`;
      if (skill.tags.length > 0) {
        markdown += `- **Tags**: ${skill.tags.join(', ')}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}
