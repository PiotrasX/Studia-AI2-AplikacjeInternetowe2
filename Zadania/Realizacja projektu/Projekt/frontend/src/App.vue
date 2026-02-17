<script setup>
import Navbar from '@/components/shared/Navbar.vue'
import Footer from '@/components/shared/Footer.vue'
import Toast from '@/components/shared/toasts/Toast.vue'

import { RouterView } from 'vue-router'
import { useToastStore } from '@/store/toastStore'

const toastStore = useToastStore()
</script>

<template>
    <div class="app-layout">
        <header class="app-header">
            <Navbar />
        </header>

        <main class="app-main">
            <transition name="fade">
                <div v-if="toastStore.visible" class="toast-container">
                    <Toast :message="toastStore.message" :type="toastStore.type" />
                </div>
            </transition>

            <RouterView />
        </main>

        <footer class="app-footer">
            <Footer />
        </footer>
    </div>
</template>

<style scoped>
html,
body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: auto;
}

.app-layout {
    display: flex;
    flex-direction: column;
    width: fit-content;
    min-height: 100vh;
    min-width: 100%;
}

.app-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    border-bottom: 2px solid var(--color-border);
    background-color: var(--color-bg);
    color: var(--color-text);
    transition: background-color var(--transition), color var(--transition), border-color var(--transition);
}

.app-main {
    flex: 1;
    min-width: 402px;
    background-color: var(--color-bg-alt);
    color: var(--color-text);
    transition: background-color var(--transition), color var(--transition), border-color var(--transition);
}

.app-footer {
    border-top: 2px solid var(--color-border);
    background-color: var(--color-bg);
    color: var(--color-text);
    transition: background-color var(--transition), color var(--transition), border-color var(--transition);
}

.toast-container {
    position: fixed;
    width: max-content;
    top: 48px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>