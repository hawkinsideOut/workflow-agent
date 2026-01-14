import { z } from 'zod';

export const SuggestionSchema = z.object({
  id: z.string(),
  feedback: z.string().min(10).max(1000),
  author: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.string().datetime(),
  status: z.enum(['pending', 'approved', 'rejected', 'implemented']),
  category: z.enum(['feature', 'bug', 'documentation', 'performance', 'other']).optional(),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  trustScore: z.number().min(0).max(100).optional(),
  moderationNotes: z.string().optional(),
  implementedIn: z.string().optional(), // Version implemented
});

export const TrustScoreSchema = z.object({
  userId: z.string(),
  score: z.number().min(0).max(100),
  contributions: z.object({
    mergedPRs: z.number().default(0),
    helpfulReviews: z.number().default(0),
    qualityBugReports: z.number().default(0),
    approvedSuggestions: z.number().default(0),
    spam: z.number().default(0),
  }),
  lastUpdated: z.string().datetime(),
});

export const ModerationRuleSchema = z.object({
  name: z.string(),
  description: z.string(),
  action: z.enum(['flag', 'auto-reject', 'require-review']),
  condition: z.object({
    minTrustScore: z.number().optional(),
    maxDailySubmissions: z.number().optional(),
    bannedWords: z.array(z.string()).optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
export type TrustScore = z.infer<typeof TrustScoreSchema>;
export type ModerationRule = z.infer<typeof ModerationRuleSchema>;

// Default moderation rules
export const defaultModerationRules: ModerationRule[] = [
  {
    name: 'Rate Limiting',
    description: 'Limit submissions to 5 per day per user',
    action: 'auto-reject',
    condition: {
      maxDailySubmissions: 5,
    },
  },
  {
    name: 'Low Trust Score',
    description: 'Require manual review for low trust scores',
    action: 'require-review',
    condition: {
      minTrustScore: 20,
    },
  },
  {
    name: 'Spam Filter',
    description: 'Auto-reject spam keywords',
    action: 'auto-reject',
    condition: {
      bannedWords: ['spam', 'casino', 'viagra', 'crypto', 'nft'],
    },
  },
  {
    name: 'Length Validation',
    description: 'Require suggestions between 10-1000 characters',
    action: 'auto-reject',
    condition: {
      minLength: 10,
      maxLength: 1000,
    },
  },
];
