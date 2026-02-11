import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'workflow/index': 'src/workflow/index.ts',
    'inbox/index': 'src/inbox/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
