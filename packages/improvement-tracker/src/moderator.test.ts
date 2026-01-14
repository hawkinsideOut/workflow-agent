import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import { FileSystemStore, TrustScoreManager, Moderator } from '../src/moderator.js';
import { Suggestion } from '../src/schema.js';

describe('FileSystemStore', () => {
  const testPath = '.workflow-test/improvements';
  let store: FileSystemStore;

  beforeEach(() => {
    store = new FileSystemStore(testPath);
  });

  afterEach(async () => {
    try {
      await rm('.workflow-test', { recursive: true, force: true });
    } catch {}
  });

  it('should save and retrieve a suggestion', async () => {
    const suggestion: Suggestion = {
      id: 'test-123',
      feedback: 'Add dark mode support',
      author: 'test-user',
      createdAt: new Date().toISOString(),
      status: 'pending',
      category: 'feature',
      upvotes: 0,
      downvotes: 0,
    };

    await store.save(suggestion);
    const retrieved = await store.findById('test-123');

    expect(retrieved).toEqual(suggestion);
  });

  it('should return null for non-existent suggestion', async () => {
    const result = await store.findById('non-existent');
    expect(result).toBeNull();
  });

  it('should find all suggestions', async () => {
    const suggestions: Suggestion[] = [
      {
        id: 'test-1',
        feedback: 'Feature 1',
        createdAt: new Date().toISOString(),
        status: 'pending',
        upvotes: 0,
        downvotes: 0,
      },
      {
        id: 'test-2',
        feedback: 'Feature 2',
        createdAt: new Date().toISOString(),
        status: 'approved',
        upvotes: 0,
        downvotes: 0,
      },
    ];

    for (const s of suggestions) {
      await store.save(s);
    }

    const all = await store.findAll();
    expect(all).toHaveLength(2);
  });

  it('should filter suggestions by status', async () => {
    const suggestions: Suggestion[] = [
      {
        id: 'test-1',
        feedback: 'Feature 1',
        createdAt: new Date().toISOString(),
        status: 'pending',
        upvotes: 0,
        downvotes: 0,
      },
      {
        id: 'test-2',
        feedback: 'Feature 2',
        createdAt: new Date().toISOString(),
        status: 'approved',
        upvotes: 0,
        downvotes: 0,
      },
    ];

    for (const s of suggestions) {
      await store.save(s);
    }

    const pending = await store.findAll({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('pending');
  });

  it('should update a suggestion', async () => {
    const suggestion: Suggestion = {
      id: 'test-123',
      feedback: 'Add dark mode',
      createdAt: new Date().toISOString(),
      status: 'pending',
      upvotes: 0,
      downvotes: 0,
    };

    await store.save(suggestion);
    await store.update('test-123', { status: 'approved', upvotes: 5 });

    const updated = await store.findById('test-123');
    expect(updated?.status).toBe('approved');
    expect(updated?.upvotes).toBe(5);
  });

  it('should delete a suggestion', async () => {
    const suggestion: Suggestion = {
      id: 'test-123',
      feedback: 'Add dark mode',
      createdAt: new Date().toISOString(),
      status: 'pending',
      upvotes: 0,
      downvotes: 0,
    };

    await store.save(suggestion);
    await store.delete('test-123');

    const result = await store.findById('test-123');
    expect(result).toBeNull();
  });
});

describe('TrustScoreManager', () => {
  let manager: TrustScoreManager;

  beforeEach(() => {
    manager = new TrustScoreManager();
  });

  it('should calculate trust score based on contributions', () => {
    manager.updateScore('user1', 'mergedPRs');
    manager.updateScore('user1', 'mergedPRs');
    manager.updateScore('user1', 'helpfulReviews');

    const score = manager.getTrustScore('user1');
    expect(score).toBeDefined();
    expect(score!.score).toBeGreaterThan(0);
    expect(score!.contributions.mergedPRs).toBe(2);
    expect(score!.contributions.helpfulReviews).toBe(1);
  });

  it('should penalize spam', () => {
    manager.updateScore('user1', 'mergedPRs');
    const beforeSpam = manager.getTrustScore('user1')!.score;

    manager.updateScore('user1', 'spam');
    const afterSpam = manager.getTrustScore('user1')!.score;

    expect(afterSpam).toBeLessThan(beforeSpam);
  });

  it('should cap score at 100', () => {
    for (let i = 0; i < 20; i++) {
      manager.updateScore('user1', 'mergedPRs');
    }

    const score = manager.getTrustScore('user1')!.score;
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Moderator', () => {
  const testPath = '.workflow-test/improvements';
  let moderator: Moderator;
  let store: FileSystemStore;
  let trustManager: TrustScoreManager;

  beforeEach(() => {
    store = new FileSystemStore(testPath);
    trustManager = new TrustScoreManager();
    moderator = new Moderator(undefined, store, trustManager);
  });

  afterEach(async () => {
    try {
      await rm('.workflow-test', { recursive: true, force: true });
    } catch {}
  });

  it('should reject spam content', async () => {
    const result = await moderator.moderate({
      feedback: 'Buy cheap viagra now!',
      upvotes: 0,
      downvotes: 0,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('banned');
  });

  it('should reject too short feedback', async () => {
    const result = await moderator.moderate({
      feedback: 'Hi',
      upvotes: 0,
      downvotes: 0,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('too short');
  });

  it('should accept valid feedback', async () => {
    const result = await moderator.moderate({
      feedback: 'Add support for GitLab repositories with authentication',
      upvotes: 0,
      downvotes: 0,
    });

    expect(result.allowed).toBe(true);
  });

  it('should submit and store suggestion', async () => {
    const result = await moderator.submitSuggestion(
      'Add dark mode support with custom themes',
      'test-user',
      'feature'
    );

    expect(result.success).toBe(true);
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion?.status).toBe('approved');

    const stored = await store.findById(result.suggestion!.id);
    expect(stored).toBeDefined();
  });

  it('should support voting', async () => {
    const result = await moderator.submitSuggestion(
      'Add VS Code extension',
      'test-user',
      'feature'
    );

    await moderator.vote(result.suggestion!.id, 'up');
    await moderator.vote(result.suggestion!.id, 'up');
    await moderator.vote(result.suggestion!.id, 'down');

    const suggestion = await store.findById(result.suggestion!.id);
    expect(suggestion?.upvotes).toBe(2);
    expect(suggestion?.downvotes).toBe(1);
  });
});
