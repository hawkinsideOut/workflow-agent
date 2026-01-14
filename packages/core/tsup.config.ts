import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'validators/index': 'src/validators/index.ts',
    'config/index': 'src/config/index.ts',
    'scripts/postinstall': 'src/scripts/postinstall.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
