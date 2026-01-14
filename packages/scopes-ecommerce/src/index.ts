import type { Scope } from '@workflow/agent/config';

export const scopes: Scope[] = [
  {
    name: 'cart',
    description: 'Shopping cart functionality, cart state management',
    emoji: '🛒',
    category: 'features',
  },
  {
    name: 'checkout',
    description: 'Checkout flow, payment processing, order completion',
    emoji: '💳',
    category: 'features',
  },
  {
    name: 'products',
    description: 'Product catalog, product details, product management',
    emoji: '📦',
    category: 'features',
  },
  {
    name: 'orders',
    description: 'Order management, order history, order tracking',
    emoji: '📋',
    category: 'features',
  },
  {
    name: 'payments',
    description: 'Payment integration, billing, invoicing',
    emoji: '💰',
    category: 'features',
  },
  {
    name: 'inventory',
    description: 'Inventory management, stock tracking, warehousing',
    emoji: '📊',
    category: 'features',
  },
  {
    name: 'auth',
    description: 'Customer authentication, account management',
    emoji: '🔐',
    category: 'auth',
  },
  {
    name: 'admin',
    description: 'Admin dashboard, store management, analytics',
    emoji: '👤',
    category: 'features',
  },
  {
    name: 'analytics',
    description: 'Sales analytics, customer insights, reporting',
    emoji: '📈',
    category: 'features',
  },
  {
    name: 'ui',
    description: 'UI components, storefront design, responsive layout',
    emoji: '🎨',
    category: 'features',
  },
  {
    name: 'db',
    description: 'Database schema, migrations, data models',
    emoji: '💾',
    category: 'infrastructure',
  },
  {
    name: 'deps',
    description: 'Dependencies, package updates, third-party integrations',
    emoji: '📦',
    category: 'infrastructure',
  },
];

export const preset = {
  name: 'E-commerce',
  description: 'Scope configuration for online stores and e-commerce platforms',
  scopes,
  version: '1.0.0',
};

export default preset;
