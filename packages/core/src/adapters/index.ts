export interface Adapter {
  name: string;
  description: string;
  detect: () => Promise<boolean>;
  paths: {
    actions?: string;
    components?: string;
    lib?: string;
    hooks?: string;
    types?: string;
    tests?: string;
    config?: string;
  };
}

export const adapters: Record<string, Adapter> = {
  'nextjs-app-router': {
    name: 'Next.js App Router',
    description: 'Next.js 13+ with app directory',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('app') && fs.existsSync('next.config.ts') || fs.existsSync('next.config.js');
    },
    paths: {
      actions: 'app/actions',
      components: 'components',
      lib: 'lib',
      hooks: 'hooks',
      types: 'types',
      tests: '__tests__',
      config: 'app',
    },
  },
  
  'nextjs-pages': {
    name: 'Next.js Pages Router',
    description: 'Next.js with pages directory',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('pages') && (fs.existsSync('next.config.ts') || fs.existsSync('next.config.js'));
    },
    paths: {
      components: 'components',
      lib: 'lib',
      hooks: 'hooks',
      types: 'types',
      tests: '__tests__',
      config: 'pages',
    },
  },
  
  'vite-react': {
    name: 'Vite + React',
    description: 'Vite-powered React application',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('vite.config.ts') || fs.existsSync('vite.config.js');
    },
    paths: {
      components: 'src/components',
      lib: 'src/lib',
      hooks: 'src/hooks',
      types: 'src/types',
      tests: 'src/__tests__',
      config: 'src',
    },
  },
  
  'remix': {
    name: 'Remix',
    description: 'Remix full-stack framework',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('app/routes') && (fs.existsSync('remix.config.js') || fs.existsSync('package.json'));
    },
    paths: {
      components: 'app/components',
      lib: 'app/lib',
      types: 'app/types',
      tests: 'app/__tests__',
      config: 'app/root.tsx',
    },
  },
  
  'astro': {
    name: 'Astro',
    description: 'Astro static site framework',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('astro.config.mjs') || fs.existsSync('astro.config.ts');
    },
    paths: {
      components: 'src/components',
      lib: 'src/lib',
      types: 'src/types',
      tests: 'src/__tests__',
      config: 'src/pages',
    },
  },
  
  'sveltekit': {
    name: 'SvelteKit',
    description: 'SvelteKit full-stack framework',
    detect: async () => {
      const fs = await import('fs');
      return fs.existsSync('svelte.config.js') || fs.existsSync('src/routes');
    },
    paths: {
      components: 'src/lib/components',
      lib: 'src/lib',
      types: 'src/lib/types',
      tests: 'src/lib/__tests__',
      config: 'src/routes',
    },
  },
  
  'generic': {
    name: 'Generic Project',
    description: 'Standard project structure',
    detect: async () => true, // Always matches as fallback
    paths: {
      components: 'src/components',
      lib: 'src/lib',
      types: 'src/types',
      tests: 'tests',
      config: 'src',
    },
  },
};

export async function detectAdapter(): Promise<string> {
  for (const [key, adapter] of Object.entries(adapters)) {
    if (key === 'generic') continue; // Skip generic, it's the fallback
    
    try {
      if (await adapter.detect()) {
        return key;
      }
    } catch {
      // Continue to next adapter
    }
  }
  
  return 'generic';
}

export function getAdapter(name: string): Adapter | null {
  return adapters[name] || null;
}
