<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/userStore'
import { useToastStore } from '@/store/toastStore'

const email = ref('')
const password = ref('')

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const loading = computed(() => userStore.loading)

async function handleLogin() {
	try {
		if (!email.value || !password.value) {
			toastStore.show('Uzupełnij wszystkie pola.', 'warning')
			return
		}

		await userStore.login(email.value, password.value)

		toastStore.show('Zalogowano pomyślnie!', 'success')
		router.push('/')
	} catch (err) {
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			toastStore.show('Serwer nie odpowiada, spróbuj ponownie później.', 'error')
			return
		}
		if (err instanceof Error && err.message) {
			toastStore.show(err.message, 'error')
			return
		}
		toastStore.show('Wystąpił nieoczekiwany błąd logowania. Spróbuj ponownie później.', 'error')
	}
}
</script>

<template>
	<div class="auth">
		<!-- Sekcja nagłówka -->
		<section class="hero">
			<h1 class="hero-title">Logowanie</h1>
		</section>

		<!-- Formularz logowania -->
		<section class="auth-box">
			<form @submit.prevent="handleLogin">
				<label for="email">Adres e-mail</label>
				<input id="email" v-model="email" type="text" placeholder="user1@example.com" />

				<label for="password">Hasło</label>
				<input id="password" v-model="password" type="password" placeholder="user123" />

				<button type="submit" :disabled="loading" class="auth-btn">
					{{ loading ? 'Logowanie...' : 'Zaloguj się' }}
				</button>
			</form>

			<p class="register-info">
				Nie masz konta?
				<RouterLink to="/register">Zarejestruj się</RouterLink>
			</p>
		</section>
	</div>
</template>

<style scoped>
.auth {
	display: flex;
	justify-self: center;
	flex-direction: column;
	gap: 4rem;
	padding: 2rem;
	max-width: 400px;
	width: 100%;
}

@media (min-width: 560px) {
	.auth {
		max-width: 500px;
	}
}

@media (min-width: 833px) {
	.auth {
		max-width: 600px;
	}
}

.hero {
	text-align: center;
}

.hero-title {
	font-size: 2.5rem;
	font-weight: bold;
	line-height: 1.25;
	margin-bottom: 1.25rem;
}

.auth-box {
	width: 100%;
	padding: 2rem;
	display: flex;
	flex-direction: column;
	background: var(--color-bg-box);
	border: 2px solid var(--color-border);
	border-radius: var(--radius-lg);
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

label {
	font-weight: 600;
	color: var(--color-text);
}

input {
	width: 100%;
	padding: 0.75rem 1rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	font-size: 1rem;
	margin-top: 0.35rem;
	margin-bottom: 1.25rem;
	color: var(--color-text);
	background-color: var(--color-bg);
	transition: border-color var(--transition), box-shadow var(--transition);
}

input:focus {
	outline: none;
	border-color: var(--color-accent);
	box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.auth-btn {
	width: 100%;
	padding: 0.75rem 1.25rem;
	font-weight: 600;
	margin-top: 1.25rem;
	cursor: pointer;
	text-decoration: none;
	color: white;
	border-radius: var(--radius-md);
	background-color: var(--color-accent);
	transition: background-color var(--transition), color var(--transition);
}

.auth-btn:hover {
	background-color: var(--color-accent-hover);
}

.auth-btn:disabled {
	background-color: var(--color-border);
	cursor: not-allowed;
}

.register-info {
	margin-top: 2rem;
	text-align: center;
	color: var(--color-text-muted);
}

.register-info a {
	color: var(--color-accent);
	font-weight: 600;
	transition: color var(--transition);
}

.register-info a:hover {
	color: var(--color-accent-hover);
}
</style>