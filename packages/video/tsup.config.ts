import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/transcription/index.ts',
    'src/ai/index.ts',
    'src/creator-tools/index.ts',
    'src/interactions/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@cgk/core', '@cgk/db', '@anthropic-ai/sdk', '@mux/mux-node'],
})
