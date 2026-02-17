import { defineStore } from 'pinia';
import { loginUser, registerUser, logoutUser } from '@/services/api';

export const useUserStore = defineStore('userStore', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        isAdmin: (state) => state.user?.role === 'admin'
    },

    actions: {
        // Logowanie użytkownika
        async login(email, password) {
            this.loading = true;
            this.error = null;
            try {
                const data = await loginUser(email, password);
                if (data.token && data.user) {
                    this.user = data.user;
                    this.token = data.token;
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                } else {
                    throw new Error('Nieprawidłowy adres e-mail lub hasło.');
                }
                this.verifyToken();
                return data;
            } catch (err) {
                this.error = err.message || 'Wystąpił nieoczekiwany błąd logowania. Spróbuj ponownie później.';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        // Rejestracja użytkownika
        async register(formData) {
            this.loading = true;
            this.error = null;
            try {
                const data = await registerUser(formData);
                return data;
            } catch (err) {
                this.error = err.message || 'Wystąpił nieoczekiwany błąd rejestracji. Spróbuj ponownie później.';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        // Wylogowanie użytkownika
        async logout() {
            this.loading = true;
            this.error = null;
            try {
                await logoutUser();
            } catch (err) {
                this.error = err.message || 'Wystąpił nieoczekiwany błąd wylogowania. Spróbuj ponownie później.';
            } finally {
                this.user = null;
                this.token = null;
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                this.loading = false;
            }
        },

        // Weryfikacja poprawności tokena JWT użytkownika
        verifyToken() {
            if (!this.token) return false;
            try {
                const tokenPayload = JSON.parse(atob(this.token.split('.')[1]));
                const isExpired = tokenPayload.exp * 1000 < Date.now();
                if (isExpired) {
                    this.logout();
                    return false;
                }
                return true;
            } catch (error) {
                this.logout();
                return false;
            }
        },

        // Automatyczne przywracanie sesji po odświeżeniu strony przez użytkownika
        restoreSession() {
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');
            if (savedUser && savedToken) {
                this.user = JSON.parse(savedUser);
                this.token = savedToken;
                this.verifyToken();
            }
        },

        // Ustawienie danych użytkownika w store i zapis w localStorage
        setUser(user) {
            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
        },

        // Ustawienie tokenu JWT w store i zapis w localStorage
        setToken(token) {
            this.token = token;
            localStorage.setItem('token', token);
        }
    }
});