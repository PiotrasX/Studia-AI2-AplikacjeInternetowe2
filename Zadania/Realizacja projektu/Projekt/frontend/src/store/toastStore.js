import { defineStore } from 'pinia'

export const useToastStore = defineStore('toastStore', {
    state: () => ({
        message: '',
        type: '',
        visible: false,
        timeoutId: null,
        duration: 3000
    }),

    actions: {
        show(message, type = 'success', duration = this.duration) {
            // Widoczny toast - resetowanie czasu
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
                this.timeoutId = null
            }

            // Nowe dane toastu
            this.message = message
            this.type = type
            this.visible = true

            // Odliczanie toastu
            this.timeoutId = setTimeout(() => {
                this.hide()
            }, duration)
        },

        // Ukrycie toastu
        hide() {
            this.message = ''
            this.type = 'success'
            this.visible = false
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
                this.timeoutId = null
            }
        }
    }
})