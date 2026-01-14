import type { Scope } from '@hawkinside_out/workflow-agent/config';

export const scopes: Scope[] = [
  {
    name: 'content',
    description: 'Content creation, editing, content types, content models',
    emoji: '📝',
    category: 'features',
  },
  {
    name: 'media',
    description: 'Media library, image uploads, asset management',
    emoji: '🖼️',
    category: 'features',
  },
  {
    name: 'pages',
    description: 'Page builder, page templates, page routing',
    emoji: '📄',
    category: 'features',
  },
  {
    name: 'editor',
    description: 'Content editor, WYSIWYG, rich text editing',
    emoji: '✏️',
    category: 'features',
  },
  {
    name: 'templates',
    description: 'Page templates, layout templates, theme customization',
    emoji: '🎨',
    category: 'features',
  },
  {
    name: 'collections',
    description: 'Content collections, taxonomies, categories, tags',
    emoji: '📚',
    category: 'features',
  },
  {
    name: 'auth',
    description: 'User roles, permissions, access control',
    emoji: '🔐',
    category: 'auth',
  },
  {
    name: 'workflows',
    description: 'Publishing workflows, approval processes, content staging',
    emoji: '🔄',
    category: 'features',
  },
  {
    name: 'publishing',
    description: 'Content publishing, versioning, scheduling',
    emoji: '🚀',
    category: 'features',
  },
  {
    name: 'ui',
    description: 'Admin UI, frontend components, dashboard',
    emoji: '🎭',
    category: 'features',
  },
  {
    name: 'db',
    description: 'Database schema, content storage, migrations',
    emoji: '💾',
    category: 'infrastructure',
  },
  {
    name: 'test',
    description: 'Testing, test content, automated tests',
    emoji: '🧪',
    category: 'testing',
  },
  {
    name: 'deps',
    description: 'Dependencies, plugins, extensions',
    emoji: '📦',
    category: 'infrastructure',
  },
];

export const preset = {
  name: 'Content Management System',
  description: 'Scope configuration for CMS and content platforms',
  scopes,
  version: '1.0.0',
};

export default preset;
