import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [crx({ manifest }), tailwindcss()],
    server: {
        cors: {
            origin: [
                /chrome-extension:\/\//,
            ],
        },
    },
})