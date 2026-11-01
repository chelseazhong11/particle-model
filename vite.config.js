import { defineConfig } from 'vite';

// Relative base so the build works under any GitHub Pages path (/<repo>/)
// and on a custom domain without changes.
export default defineConfig({
  base: './',
});
