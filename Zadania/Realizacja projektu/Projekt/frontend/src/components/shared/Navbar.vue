<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '@/store/userStore'
import { useToastStore } from '@/store/toastStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const currentTheme = ref('light')
const isMobileMenuOpen = ref(false)

// Zmiana motywu strony
const toggleTheme = () => {
	currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
	localStorage.setItem('color-theme', currentTheme.value)
	document.documentElement.classList.toggle('dark', currentTheme.value === 'dark')
}

// Natychmiastowe zamykanie mobilnego menu
const closeMobileMenuInstant = () => {
	const el = document.querySelector('.mobile-menu')
	if (!el) return
	el.classList.add('no-transition')
	isMobileMenuOpen.value = false
	void el.offsetHeight
	el.classList.remove('no-transition')
}

// Zamykanie menu mobilnego przy zmianie szerokości ekranu
const handleResize = () => {
	if (window.innerWidth > 832 && isMobileMenuOpen.value) {
		closeMobileMenuInstant()
	}
};

// Inicjalizacja motywu strony i nasłuchiwanie zmiany szerokości ekranu
onMounted(() => {
	const storedTheme = localStorage.getItem('color-theme')

	if (storedTheme) {
		currentTheme.value = storedTheme
		document.documentElement.classList.toggle('dark', storedTheme === 'dark')
	} else {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		currentTheme.value = prefersDark ? 'dark' : 'light'
		document.documentElement.classList.toggle('dark', prefersDark)
	}

	window.addEventListener('resize', handleResize)
	handleResize()
})

// Sprzątanie po odmontowaniu komponentu
onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
})

// Nawigacja między stronami
const goTo = (path) => {
	router.push(path)
}

// Stan użytkownika
const isLoggedIn = computed(() => !!userStore.user)
const isAdmin = computed(() => userStore.user?.role === 'admin')

// Wylogowanie użytkownika
const logout = async () => {
    await userStore.logout()
	isMobileMenuOpen.value = false
	router.push('/')
	toastStore.show('Wylogowano pomyślnie!', 'success')
};

// Przełączanie widoku menu w wersji mobilnej
const toggleMobileMenu = () => {
	isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// Przełączanie widoku menu w wersji mobilnej i zmiana motywu strony
const closeMobileMenu = () => {
	isMobileMenuOpen.value = false
}
</script>

<template>
	<nav class="navbar">
		<div class="nav-left">
			<h1 class="logo" @click="() => { goTo('/'); closeMobileMenu() }">🌍 URocze&nbsp;wycieczki</h1>
		</div>

		<div class="nav-center desktop-only">
			<RouterLink to="/trips" class="nav-link"
				:class="{ active: route.path.startsWith('/trips'), 'top-linked': route.path.startsWith('/trips') }">
				Wycieczki
			</RouterLink>
			<RouterLink to="/countries" class="nav-link"
				:class="{ active: route.path.startsWith('/countries'), 'top-linked': route.path.startsWith('/countries') }">
				Kraje
			</RouterLink>
			<RouterLink to="/continents" class="nav-link"
				:class="{ active: route.path.startsWith('/continents'), 'top-linked': route.path.startsWith('/continents') }">
				Kontynenty</RouterLink>

			<!-- Tylko dla administratora -->
			<RouterLink v-if="isAdmin" to="/users" class="nav-link"
				:class="{ active: route.path.startsWith('/users'), 'bottom-linked': route.path.startsWith('/users') }">
				Użytkownicy</RouterLink>
			<RouterLink v-if="isAdmin" to="/reservations" class="nav-link"
				:class="{ active: route.path.startsWith('/reservations'), 'bottom-linked': route.path.startsWith('/reservations') }">
				Rezerwacje</RouterLink>
		</div>

		<div class="nav-right desktop-only">
			<!-- Tylko dla niezalogowanych -->
			<template v-if="!isLoggedIn">
				<RouterLink to="/login" class="nav-link" :class="{ active: route.path === '/login' }">Logowanie
				</RouterLink>
				<RouterLink to="/register" class="nav-link" :class="{ active: route.path === '/register' }">Rejestracja
				</RouterLink>
			</template>

			<!-- Tylko dla zalogowanych -->
			<template v-else>
				<RouterLink to="/profile" class="nav-link" :class="{ active: route.path === '/profile' }">Mój profil
				</RouterLink>
				<button @click="logout" class="nav-link logout-btn">Wylogowanie</button>
			</template>

			<button @click="toggleTheme" class="theme-toggle"
				:title="currentTheme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'">
				{{ currentTheme === 'dark' ? '☀️' : '🌙' }}
			</button>
		</div>

		<div class="mobile-only">
			<button class="hamburger" @click="toggleMobileMenu" title="Menu">☰</button>

			<button @click="() => { toggleTheme(); closeMobileMenu() }" class="theme-toggle"
				:title="currentTheme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'">
				{{ currentTheme === 'dark' ? '☀️' : '🌙' }}
			</button>
		</div>

		<div :class="['mobile-menu', { open: isMobileMenuOpen }]">
			<RouterLink @click="toggleMobileMenu" to="/trips" class="mobile-link"
				:class="{ active: route.path.startsWith('/trips') }">Wycieczki</RouterLink>
			<RouterLink @click="toggleMobileMenu" to="/countries" class="mobile-link"
				:class="{ active: route.path.startsWith('/countries') }">Kraje</RouterLink>
			<RouterLink @click="toggleMobileMenu" to="/continents" class="mobile-link"
				:class="{ active: route.path.startsWith('/continents') }">Kontynenty</RouterLink>

			<!-- Tylko dla administratora -->
			<RouterLink v-if="isAdmin" @click="toggleMobileMenu" to="/users" class="mobile-link"
				:class="{ active: route.path.startsWith('/users') }">Użytkownicy</RouterLink>
			<RouterLink v-if="isAdmin" @click="toggleMobileMenu" to="/reservations" class="mobile-link"
				:class="{ active: route.path.startsWith('/reservations') }">Rezerwacje</RouterLink>

			<!-- Tylko dla niezalogowanych -->
			<template v-if="!isLoggedIn">
				<RouterLink @click="toggleMobileMenu" to="/login" class="mobile-link"
					:class="{ active: route.path === '/login' }">Logowanie</RouterLink>
				<RouterLink @click="toggleMobileMenu" to="/register" class="mobile-link"
					:class="{ active: route.path === '/register' }">Rejestracja</RouterLink>
			</template>

			<!-- Tylko dla zalogowanych -->
			<template v-else>
				<RouterLink @click="toggleMobileMenu" to="/profile" class="mobile-link"
					:class="{ active: route.path === '/profile' }">Mój profil</RouterLink>
				<button @click="logout" class="mobile-link">Wylogowanie</button>
			</template>
		</div>
	</nav>
</template>

<style scoped>
.navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	position: relative;
	padding: 12px;
	background-color: var(--color-bg);
}

.nav-left {
	padding-right: 24px;
}

.nav-right {
	padding-left: 24px;
}

.nav-left,
.nav-right,
.nav-center {
	display: flex;
	align-items: center;
	gap: 20px;
}

.nav-center {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	flex-wrap: wrap;
	justify-content: center;
}

@media (max-width: 1008px) {
	.nav-center {
		max-width: 250px;
		row-gap: 0px;
	}

	.nav-link.top-linked {
		margin-top: -2px;
	}

	.nav-link.bottom-linked {
		margin-top: -2px;
	}
}

.logo {
	cursor: pointer;
	font-size: 1.3rem;
	font-weight: 600;
	user-select: none;
}

.nav-link {
	text-decoration: none;
	font-weight: 500;
	padding-bottom: 2px;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color-text);
}

.nav-link:hover {
	color: var(--color-accent);
}

.nav-link.active {
	border-bottom: 2px solid var(--color-accent);
}

.theme-toggle {
	cursor: pointer;
	font-size: 1.3rem;
	font-weight: 600;
	margin-left: -4px;
	border: none;
	background: transparent;
	color: var(--color-text);
	transition: color var(--transition), transform 0.3s ease;
}

.theme-toggle:hover {
	color: var(--color-accent);
	transform: rotate(25deg);
}

.logout-btn {
	padding-bottom: 2px;
}

.logout-btn:hover {
	color: var(--color-accent);
}

.desktop-only {
	display: flex;
}

.mobile-only {
	display: none;
}

.hamburger {
	font-size: 1.3rem;
	background: none;
	border: none;
	cursor: pointer;
	margin-bottom: -1px;
	color: var(--color-text);
}

.mobile-menu {
	position: absolute;
	top: 100%;
	left: 0;
	width: 100%;
	background-color: var(--color-bg);
	margin-top: 2px;
	box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
	display: flex;
	gap: 8px;
	flex-direction: column;
	align-items: center;
	padding: 0;
	z-index: 50;
	backdrop-filter: blur(10px);
	overflow: hidden;
	max-height: 0;
	transition: max-height 0.35s ease-in-out, padding 0.35s ease-in-out;
}

.mobile-menu.open {
	margin-top: 2px;
	padding: 8px 0;
	max-height: 384px;
}

.mobile-link {
	position: relative;
	transition: color 0.3s ease;
	text-align: center;
	text-decoration: none;
	font-weight: 500;
	padding-bottom: 2px;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color-text);
}

.mobile-link.active {
	border-bottom: 2px solid var(--color-accent);
}

.mobile-link:hover {
	color: var(--color-accent);
}

.mobile-menu.no-transition {
	transition: none !important;
}

@media (min-width: 833px) {
	.mobile-menu {
		display: none !important;
		max-height: 0 !important;
		opacity: 0 !important;
		padding: 0 !important;
	}
}

@media (max-width: 832px) {
	.desktop-only {
		display: none;
	}

	.mobile-only {
		display: flex;
		align-items: center;
		gap: 20px;
	}
}
</style>