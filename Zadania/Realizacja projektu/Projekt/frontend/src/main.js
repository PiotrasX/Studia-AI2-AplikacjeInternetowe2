import { createApp } from 'vue'
import { createPinia } from 'pinia';
import { useUserStore } from '@/store/userStore'
import App from './App.vue'
import router from '@/router'
import './style.css'

const app = createApp(App);
const pinia = createPinia();

const storedTheme = localStorage.getItem('color-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
    document.documentElement.classList.add('dark')
} else {
    document.documentElement.classList.remove('dark')
}

app.use(pinia);

const userStore = useUserStore()
userStore.restoreSession()

app.use(router);
app.mount('#app');