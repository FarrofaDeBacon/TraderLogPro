import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';

export default defineConfig({
    plugins: [sveltekit()],
    resolve: {
        conditions: ['browser', 'development', 'svelte'],
        alias: {
            '$lib': path.resolve(process.cwd(), './src/lib'),
        },
    },
    test: {
        css: false,
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/setupTest.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        deps: {
            optimizer: {
                web: {
                    include: ['svelte-i18n']
                }
            }
        }
    },
});
