<script setup>
import { computed } from 'vue'

const props = defineProps({
    message: { type: String, required: true },
    type: { type: String, default: 'success' }
})

const toastClass = computed(() => {
    switch (props.type) {
        case 'success':
            return 'bg-green-100 text-green-800 border-green-400 dark:bg-green-700 dark:text-green-100'
        case 'warning':
            return 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-700 dark:text-yellow-100'
        case 'error':
            return 'bg-red-100 text-red-800 border-red-400 dark:bg-red-700 dark:text-red-100'
        case 'info':
            return 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-700 dark:text-blue-100'
        default:
            return 'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-700 dark:text-gray-100'
    }
})

const icon = computed(() => {
    switch (props.type) {
        case 'success':
            return '✔️'
        case 'warning':
            return '⚠️'
        case 'error':
            return '❌'
        case 'info':
            return 'ℹ️'
        default:
            return '💬'
    }
})
</script>

<template>
    <div class="toast" :class="toastClass">
        <span class="toast-icon">{{ icon }}</span>
        <span class="toast-message">{{ message }}</span>
    </div>
</template>

<style scoped>
.toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    padding-right: 18px;
    border: 2px solid;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
    max-width: 90vw;
    word-wrap: break-word;
    text-align: center;
}

.toast-icon {
    font-size: 1.3rem;
    line-height: 1.1;
	align-items: center;
	justify-content: center;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-275px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>