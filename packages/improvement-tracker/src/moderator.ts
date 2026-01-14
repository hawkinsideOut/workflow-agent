import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { Suggestion, TrustScore, ModerationRule, defaultModerationRules } from './schema.js';

export interface SuggestionStore {
  save(suggestion: Suggestion): Promise<void>;
  findById(id: string): Promise<Suggestion | null>;
  findAll(filters?: { status?: string; category?: string }): Promise<Suggestion[]>;
  update(id: string, updates: Partial<Suggestion>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class FileSystemStore implements SuggestionStore {
  constructor(private basePath: string = '.workflow/improvements') {}

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  private getSuggestionPath(id: string): string {
    return path.join(this.basePath, `${id}.json`);
  }

  async save(suggestion: Suggestion): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getSuggestionPath(suggestion.id);
    await fs.writeFile(filePath, JSON.stringify(suggestion, null, 2));
  }

  async findById(id: string): Promise<Suggestion | null> {
    try {
      const filePath = this.getSuggestionPath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async findAll(filters?: { status?: string; category?: string }): Promise<Suggestion[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.basePath);
      const suggestions: Suggestion[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const content = await fs.readFile(path.join(this.basePath, file), 'utf-8');
        const suggestion = JSON.parse(content) as Suggestion;

        // Apply filters
        if (filters?.status && suggestion.status !== filters.status) continue;
        if (filters?.category && suggestion.category !== filters.category) continue;

        suggestions.push(suggestion);
      }

      // Sort by creation date (newest first)
      return suggestions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<Suggestion>): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Suggestion not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    await this.save(updated);
  }

  async delete(id: string): Promise<void> {
    const filePath = this.getSuggestionPath(id);
    await fs.unlink(filePath);
  }
}

export class TrustScoreManager {
  private scores = new Map<string, TrustScore>();

  calculateScore(userId: string): number {
    const score = this.scores.get(userId);
    if (!score) return 0;

    const { mergedPRs, helpfulReviews, qualityBugReports, approvedSuggestions, spam } = score.contributions;

    // Weighted scoring system
    let totalScore = 0;
    totalScore += mergedPRs * 10;
    totalScore += helpfulReviews * 5;
    totalScore += qualityBugReports * 3;
    totalScore += approvedSuggestions * 5;
    totalScore -= spam * 50;

    // Normalize to 0-100
    return Math.max(0, Math.min(100, totalScore));
  }

  updateScore(userId: string, contribution: keyof TrustScore['contributions']): void {
    const existing = this.scores.get(userId);
    const now = new Date().toISOString();

    if (existing) {
      existing.contributions[contribution]++;
      existing.score = this.calculateScore(userId);
      existing.lastUpdated = now;
    } else {
      const newScore: TrustScore = {
        userId,
        score: 0,
        contributions: {
          mergedPRs: 0,
          helpfulReviews: 0,
          qualityBugReports: 0,
          approvedSuggestions: 0,
          spam: 0,
        },
        lastUpdated: now,
      };
      newScore.contributions[contribution]++;
      newScore.score = this.calculateScore(userId);
      this.scores.set(userId, newScore);
    }
  }

  getTrustScore(userId: string): TrustScore | undefined {
    return this.scores.get(userId);
  }
}

export class Moderator {
  constructor(
    private rules: ModerationRule[] = defaultModerationRules,
    private store: SuggestionStore,
    private trustManager: TrustScoreManager
  ) {}

  async moderate(suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>): Promise<{
    allowed: boolean;
    reason?: string;
    action?: string;
  }> {
    const userId = suggestion.author || 'anonymous';
    const trustScore = this.trustManager.getTrustScore(userId);

    // Check each rule
    for (const rule of this.rules) {
      const { condition } = rule;

      // Check trust score
      if (condition.minTrustScore && (!trustScore || trustScore.score < condition.minTrustScore)) {
        return {
          allowed: rule.action !== 'auto-reject',
          reason: `Trust score below minimum (${condition.minTrustScore})`,
          action: rule.action,
        };
      }

      // Check rate limiting
      if (condition.maxDailySubmissions) {
        const today = new Date().toISOString().split('T')[0];
        const todaysSuggestions = await this.store.findAll();
        const userSuggestionsToday = todaysSuggestions.filter(
          s => s.author === userId && s.createdAt.startsWith(today)
        );

        if (userSuggestionsToday.length >= condition.maxDailySubmissions) {
          return {
            allowed: false,
            reason: `Rate limit exceeded (${condition.maxDailySubmissions} per day)`,
            action: rule.action,
          };
        }
      }

      // Check banned words
      if (condition.bannedWords) {
        const lowerFeedback = suggestion.feedback.toLowerCase();
        const foundBannedWord = condition.bannedWords.find(word => 
          lowerFeedback.includes(word.toLowerCase())
        );

        if (foundBannedWord) {
          return {
            allowed: false,
            reason: `Contains banned content`,
            action: rule.action,
          };
        }
      }

      // Check length
      if (condition.minLength && suggestion.feedback.length < condition.minLength) {
        return {
          allowed: false,
          reason: `Feedback too short (min ${condition.minLength} characters)`,
          action: rule.action,
        };
      }

      if (condition.maxLength && suggestion.feedback.length > condition.maxLength) {
        return {
          allowed: false,
          reason: `Feedback too long (max ${condition.maxLength} characters)`,
          action: rule.action,
        };
      }
    }

    return { allowed: true };
  }

  async submitSuggestion(
    feedback: string,
    author?: string,
    category?: string
  ): Promise<{ success: boolean; suggestion?: Suggestion; error?: string }> {
    const partialSuggestion = {
      feedback,
      author,
      category: category as any,
      upvotes: 0,
      downvotes: 0,
    };

    const moderation = await this.moderate(partialSuggestion);

    if (!moderation.allowed) {
      return {
        success: false,
        error: moderation.reason,
      };
    }

    const suggestion: Suggestion = {
      id: randomUUID(),
      feedback,
      author,
      category: category as any,
      createdAt: new Date().toISOString(),
      status: moderation.action === 'require-review' ? 'pending' : 'approved',
      upvotes: 0,
      downvotes: 0,
      trustScore: author ? this.trustManager.getTrustScore(author)?.score : undefined,
    };

    await this.store.save(suggestion);

    return {
      success: true,
      suggestion,
    };
  }

  async vote(suggestionId: string, vote: 'up' | 'down'): Promise<void> {
    const suggestion = await this.store.findById(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }

    if (vote === 'up') {
      suggestion.upvotes++;
    } else {
      suggestion.downvotes++;
    }

    await this.store.update(suggestionId, suggestion);
  }
}
