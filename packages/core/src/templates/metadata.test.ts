import { describe, it, expect } from 'vitest';
import {
  templateMetadata,
  getMandatoryTemplates,
  getOptionalTemplates,
  getTemplatesByCategory,
  getTemplateMetadata,
  isTemplateMandatory,
  getMandatoryTemplateFilenames,
} from './metadata.js';

describe('template metadata', () => {
  describe('templateMetadata', () => {
    it('contains expected mandatory templates', () => {
      expect(templateMetadata['AGENT_EDITING_INSTRUCTIONS.md'].mandatory).toBe(true);
      expect(templateMetadata['BRANCHING_STRATEGY.md'].mandatory).toBe(true);
      expect(templateMetadata['TESTING_STRATEGY.md'].mandatory).toBe(true);
      expect(templateMetadata['SELF_IMPROVEMENT_MANDATE.md'].mandatory).toBe(true);
      expect(templateMetadata['SINGLE_SOURCE_OF_TRUTH.md'].mandatory).toBe(true);
    });

    it('contains expected optional templates', () => {
      expect(templateMetadata['DEPLOYMENT_STRATEGY.md'].mandatory).toBe(false);
      expect(templateMetadata['LIBRARY_INVENTORY.md'].mandatory).toBe(false);
      expect(templateMetadata['COMPONENT_LIBRARY.md'].mandatory).toBe(false);
    });

    it('all templates have required fields', () => {
      for (const [filename, metadata] of Object.entries(templateMetadata)) {
        expect(metadata.filename).toBe(filename);
        expect(metadata.displayName).toBeTruthy();
        expect(typeof metadata.mandatory).toBe('boolean');
        expect(['workflow', 'documentation', 'development']).toContain(metadata.category);
        expect(Array.isArray(metadata.validators)).toBe(true);
        expect(metadata.description).toBeTruthy();
      }
    });
  });

  describe('getMandatoryTemplates', () => {
    it('returns only mandatory templates', () => {
      const templates = getMandatoryTemplates();
      expect(templates.every(t => t.mandatory)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getOptionalTemplates', () => {
    it('returns only optional templates', () => {
      const templates = getOptionalTemplates();
      expect(templates.every(t => !t.mandatory)).toBe(true);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('returns templates filtered by workflow category', () => {
      const templates = getTemplatesByCategory('workflow');
      expect(templates.every(t => t.category === 'workflow')).toBe(true);
    });

    it('returns templates filtered by development category', () => {
      const templates = getTemplatesByCategory('development');
      expect(templates.every(t => t.category === 'development')).toBe(true);
    });
  });

  describe('getTemplateMetadata', () => {
    it('returns metadata for existing template', () => {
      const metadata = getTemplateMetadata('BRANCHING_STRATEGY.md');
      expect(metadata).toBeDefined();
      expect(metadata?.displayName).toBe('Branching Strategy');
    });

    it('returns undefined for non-existent template', () => {
      const metadata = getTemplateMetadata('NON_EXISTENT.md');
      expect(metadata).toBeUndefined();
    });
  });

  describe('isTemplateMandatory', () => {
    it('returns true for mandatory templates', () => {
      expect(isTemplateMandatory('TESTING_STRATEGY.md')).toBe(true);
    });

    it('returns false for optional templates', () => {
      expect(isTemplateMandatory('DEPLOYMENT_STRATEGY.md')).toBe(false);
    });

    it('returns false for non-existent templates', () => {
      expect(isTemplateMandatory('FAKE.md')).toBe(false);
    });
  });

  describe('getMandatoryTemplateFilenames', () => {
    it('returns array of mandatory filenames', () => {
      const filenames = getMandatoryTemplateFilenames();
      expect(filenames).toContain('AGENT_EDITING_INSTRUCTIONS.md');
      expect(filenames).toContain('BRANCHING_STRATEGY.md');
      expect(filenames).not.toContain('DEPLOYMENT_STRATEGY.md');
    });
  });
});
