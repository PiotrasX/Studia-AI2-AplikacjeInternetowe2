import { defineConfig } from 'vite'
import { fileURLToPath, URL } from "url"
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		tailwindcss()
	],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8000/api',
				changeOrigin: false,
				rewrite: (path) => path.replace(/^\/api/, ''),
			}
		}
	},
	resolve: {
		alias: [
			{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
		],
	},
})