import type { Scope } from '@workflow/agent/config';

export const scopes: Scope[] = [
  {
    name: 'auth',
    description: 'Authentication, authorization, JWT, sessions',
    emoji: '🔐',
    category: 'auth',
  },
  {
    name: 'api',
    description: 'API routes, REST endpoints, GraphQL resolvers',
    emoji: '🔌',
    category: 'features',
  },
  {
    name: 'endpoints',
    description: 'Endpoint implementations, route handlers',
    emoji: '🛣️',
    category: 'features',
  },
  {
    name: 'middleware',
    description: 'Middleware functions, request/response processing',
    emoji: '⚙️',
    category: 'infrastructure',
  },
  {
    name: 'validators',
    description: 'Input validation, schema validation, sanitization',
    emoji: '✅',
    category: 'features',
  },
  {
    name: 'db',
    description: 'Database queries, migrations, schema changes',
    emoji: '💾',
    category: 'infrastructure',
  },
  {
    name: 'migrations',
    description: 'Database migrations, schema evolution',
    emoji: '🔄',
    category: 'infrastructure',
  },
  {
    name: 'models',
    description: 'Data models, ORM entities, schemas',
    emoji: '📊',
    category: 'features',
  },
  {
    name: 'services',
    description: 'Business logic services, domain services',
    emoji: '🔧',
    category: 'features',
  },
  {
    name: 'docs',
    description: 'API documentation, OpenAPI/Swagger specs',
    emoji: '📚',
    category: 'documentation',
  },
  {
    name: 'test',
    description: 'API tests, integration tests, e2e tests',
    emoji: '🧪',
    category: 'testing',
  },
  {
    name: 'infra',
    description: 'Infrastructure, deployment, CI/CD, monitoring',
    emoji: '🏗️',
    category: 'infrastructure',
  },
  {
    name: 'deps',
    description: 'Dependencies, package updates, security patches',
    emoji: '📦',
    category: 'infrastructure',
  },
];

export const preset = {
  name: 'API/Backend Service',
  description: 'Scope configuration for API and backend services',
  scopes,
  version: '1.0.0',
};

export default preset;
