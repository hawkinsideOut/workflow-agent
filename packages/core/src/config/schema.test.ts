/**
 * Tests for scope name validation and config schema
 */

import { describe, it, expect } from 'vitest';
import { validateScopeName, DEFAULT_RESERVED_SCOPE_NAMES, WorkflowConfigSchema } from './schema.js';

describe('validateScopeName', () => {
  it('should accept valid scope names', () => {
    const result = validateScopeName('api', DEFAULT_RESERVED_SCOPE_NAMES);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.suggestion).toBeUndefined();
  });

  it('should reject reserved scope names', () => {
    const result = validateScopeName('test', DEFAULT_RESERVED_SCOPE_NAMES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('reserved');
    expect(result.suggestion).toBe('testing');
  });

  it('should provide suggestions for reserved names', () => {
    const testCases = [
      { name: 'docs', suggestion: 'documentation' },
      { name: 'test', suggestion: 'testing' },
      { name: 'config', suggestion: 'configuration' },
      { name: 'build', suggestion: 'builds' },
      { name: 'ci', suggestion: 'cicd' },
      { name: 'deps', suggestion: 'dependencies' },
    ];

    testCases.forEach(({ name, suggestion }) => {
      const result = validateScopeName(name, DEFAULT_RESERVED_SCOPE_NAMES);
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBe(suggestion);
    });
  });

  it('should handle custom reserved names list', () => {
    const customReserved = ['custom', 'reserved'];
    const result = validateScopeName('custom', customReserved);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('reserved');
  });

  it('should not reject non-reserved names', () => {
    const validNames = ['api', 'auth', 'database', 'ui', 'core', 'utils'];
    
    validNames.forEach(name => {
      const result = validateScopeName(name, DEFAULT_RESERVED_SCOPE_NAMES);
      expect(result.valid).toBe(true);
    });
  });

  it('should handle empty reserved names list', () => {
    const result = validateScopeName('test', []);
    expect(result.valid).toBe(true);
  });
});

describe('WorkflowConfigSchema', () => {
  it('should validate config with reserved scope names', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'api',
          description: 'API changes',
          allowedTypes: ['feat', 'fix'],
        },
      ],
      reservedScopeNames: ['custom', 'reserved'],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config with reserved scope name', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'test',
          description: 'Test changes',
          allowedTypes: ['feat', 'fix'],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('reserved');
      expect(result.error.errors[0].message).toContain('testing');
    }
  });

  it('should allow reserved name with custom list', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'test',
          description: 'Test changes',
          allowedTypes: ['feat', 'fix'],
        },
      ],
      reservedScopeNames: ['custom'], // 'test' not in custom list
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should use default reserved names if not specified', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'docs',
          description: 'Documentation',
          allowedTypes: ['docs'],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('reserved');
    }
  });

  it('should validate scope with mandatory guidelines', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'api',
          description: 'API changes',
          allowedTypes: ['feat', 'fix'],
          mandatoryGuidelines: ['TESTING_STRATEGY.md', 'COMPONENT_LIBRARY.md'],
        },
      ],
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate hooks config with validate-scopes check', () => {
    const config = {
      projectName: 'test-project',
      scopes: [
        {
          name: 'api',
          description: 'API changes',
          allowedTypes: ['feat', 'fix'],
        },
      ],
      hooks: {
        preCommit: ['validate-branch', 'check-guidelines', 'validate-scopes'],
      },
    };

    const result = WorkflowConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
