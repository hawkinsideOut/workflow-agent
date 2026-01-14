import { FileSystemStore, Moderator, TrustScoreManager } from './moderator.js';
import { Suggestion } from './schema.js';

export interface ImprovementTrackerConfig {
  storePath?: string;
  autoSync?: boolean;
  syncEndpoint?: string;
}

export class ImprovementTracker {
  private store: FileSystemStore;
  private trustManager: TrustScoreManager;
  private moderator: Moderator;

  constructor(config: ImprovementTrackerConfig = {}) {
    this.store = new FileSystemStore(config.storePath);
    this.trustManager = new TrustScoreManager();
    this.moderator = new Moderator(undefined, this.store, this.trustManager);
  }

  async submit(feedback: string, author?: string, category?: string) {
    return this.moderator.submitSuggestion(feedback, author, category);
  }

  async vote(suggestionId: string, vote: 'up' | 'down') {
    return this.moderator.vote(suggestionId, vote);
  }

  async list(filters?: { status?: string; category?: string }): Promise<Suggestion[]> {
    return this.store.findAll(filters);
  }

  async get(id: string): Promise<Suggestion | null> {
    return this.store.findById(id);
  }

  async approve(id: string, implementedIn?: string) {
    await this.store.update(id, { 
      status: implementedIn ? 'implemented' : 'approved',
      implementedIn,
    });

    const suggestion = await this.store.findById(id);
    if (suggestion?.author) {
      this.trustManager.updateScore(suggestion.author, 'approvedSuggestions');
    }
  }

  async reject(id: string, reason?: string) {
    await this.store.update(id, { 
      status: 'rejected',
      moderationNotes: reason,
    });
  }

  getTrustScore(userId: string) {
    return this.trustManager.getTrustScore(userId);
  }

  updateTrustScore(userId: string, contribution: 'mergedPRs' | 'helpfulReviews' | 'qualityBugReports' | 'approvedSuggestions' | 'spam') {
    this.trustManager.updateScore(userId, contribution);
  }
}

export function createTracker(config?: ImprovementTrackerConfig): ImprovementTracker {
  return new ImprovementTracker(config);
}
