<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/store/toastStore'
import { useUserStore } from '@/store/userStore'

let lastScrollY = 0

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const user = ref(null)
const loading = ref(true)
const userImage = ref('')
const errorMessage = ref('')
const serverError = ref(false)
const canDelete = ref(true)

const users = ref([])
const usersIds = ref([])
const totalUsers = ref(0)
const reservationsCount = ref(0)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
	const token = userStore.token
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Wybieranie obrazka na podstawie ID
function getUserImage(id) {
	const imgNumber = ((id - 1) % 10) + 1
	return `/img/users/user${imgNumber}.jpg`
}

// Sprawdzenie poprawności ID
function isValidId(id) {
	return Number.isInteger(id) && id > 0
}

// Pobranie wszystkich użytkowników z backend'u
async function fetchAllUsers() {
	try {
		const res = await fetch('http://localhost:3000/users?limit=9999', {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (res.status === 401) {
			toastStore.show(data.error || data.message || 'Brak tokenu autoryzacyjnego.', 'warning')
			return
		}
		if (res.status === 403) {
			toastStore.show(data.error || data.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania użytkowników.')

		users.value = data.data || []
		usersIds.value = users.value.map(c => c.id).sort((a, b) => a - b)
		totalUsers.value = usersIds.value.length
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Pobranie danych pojedynczego użytkownika z backend'u
async function fetchUser() {
	try {
		const id = Number(route.params.id)
		if (!isValidId(id)) {
			toastStore.show('Nieprawidłowy ID użytkownika.', 'warning')
			errorMessage.value = 'Nieprawidłowy ID użytkownika.'
            serverError.value = true
			user.value = null
			return
		}

		const res = await fetch(`http://localhost:3000/users/${id}`, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (res.status === 401) {
			toastStore.show(data.error || data.message || 'Brak tokenu autoryzacyjnego.', 'warning')
			errorMessage.value = 'Brak tokenu autoryzacyjnego.'
            serverError.value = true
			user.value = null
			return
		}
		if (res.status === 403) {
			toastStore.show(data.error || data.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
			errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
            serverError.value = true
			user.value = null
			return
		}
		if (res.status === 404) {
			toastStore.show('Użytkownik o podanym ID nie istnieje.', 'warning')
			errorMessage.value = 'Użytkownik o podanym ID nie istnieje.'
            serverError.value = true
			user.value = null
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania użytkownika.')

		user.value = data.data
		userImage.value = getUserImage(id)

		await fetchReservationsCount(id)
		await checkIfCanDelete(id)
	} catch (err) {
		serverError.value = true
        user.value = null
		if (err instanceof TypeError && err.message === "Failed to fetch") {
			errorMessage.value = 'Serwer nie odpowiada, spróbuj ponownie później.'
			toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		} else {
			errorMessage.value = err.message
			toastStore.show(err.message, "error")
		}
	} finally {
		loading.value = false
		await nextTick()
		window.scrollTo(0, lastScrollY)
	}
}

// Pobranie liczby wycieczek danego uzytkownika z backend'u
async function fetchReservationsCount(userId) {
	try {
		const res = await fetch(`http://localhost:3000/reservations/count/user/${userId}`, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby rezerwacji.')

		reservationsCount.value = typeof data.count === 'number' ? data.count : 0
	} catch (err) {
		reservationsCount.value = 0
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Czy użytkownika można usunąć
async function checkIfCanDelete(userId) {
	try {
		const res = await fetch(`http://localhost:3000/reservations/count/user/${userId}`, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby rezerwacji.')

		const noReservations = typeof data.count === 'number' && data.count === 0
		const loggedUserId = userStore.user?.id
		const isAdmin = userStore.isAdmin
		const isTargetAdmin = user.value?.role === 'admin'
		canDelete.value = noReservations && isAdmin && loggedUserId !== userId && !isTargetAdmin
	} catch (err) {
		canDelete.value = false
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Usuwanie użytkownika
async function deleteUser() {
	if (!user.value) return
	const confirmDelete = confirm(`Czy na pewno chcesz usunąć użytkownika "${user.value.first_name} ${user.value.last_name}"?`)
	if (!confirmDelete) return

	try {
		const res = await fetch(`http://localhost:3000/users/${user.value.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
			toastStore.show(data.error || data.message || 'Nie można usunąć użytkownika.', 'warning')
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas usuwania użytkownika.')

		toastStore.show('Użytkownik został usunięty.', 'success')
		router.push('/users')
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Przejście do edycji użytkownika
function goToEdit() {
	if (user.value) router.push(`/users/edit/${user.value.id}`)
}

// Nawigacja między krajami
function goToUser(offset) {
	lastScrollY = window.scrollY

	const currentId = Number(route.params.id)
	const index = usersIds.value.indexOf(currentId)
	if (index === -1) {
		toastStore.show('Nie znaleziono bieżącego użytkownika.', 'warning')
		return
	}

	const newIndex = index + offset
	if (newIndex < 0 || newIndex >= usersIds.value.length) {
		toastStore.show('Brak kolejnego użytkownika w tym kierunku.', 'warning')
		return
	}

	const newId = usersIds.value[newIndex]
	router.push(`/users/${newId}`)
}

// Ponowne pobranie danych użytkownika z backend'u przy zmianie ID
watch(() => route.params.id, () => {
	loading.value = true
	fetchUser()
})

onMounted(async () => {
	await fetchAllUsers()
	await fetchUser()
})
</script>

<template>
	<div class="user-view">
		<section class="hero">
			<h1 class="hero-title">Szczegóły użytkownika</h1>
			<p class="hero-subtitle">Poznaj podstawowe dane osobowe wybranego użytkownika.</p>
		</section>

		<div v-if="loading" class="loading">Ładowanie danych użytkownika...</div>

        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

		<div v-else-if="user" class="user-card">
			<img class="user-img" :src="userImage" :alt="user.first_name" />

			<div class="user-info">
				<h2 class="user-name">{{ user.first_name }} {{ user.last_name }}</h2>

				<ul class="user-details">
					<li><strong>Email: </strong> {{ user.email }}</li>
					<li><strong>Rola: </strong>
						{{ user.role === 'admin' ? 'Administrator' : user.role === 'user' ? 'Użytkownik' : user.role }}
					</li>
					<li><strong>Liczba rezerwacji: </strong> {{ reservationsCount }}</li>
				</ul>

				<div class="buttons-container">
					<div class="action-buttons">
						<RouterLink to="/users" class="back-btn">Powrót do listy</RouterLink>

						<!-- Tylko dla administratora -->
						<div v-if="userStore.isAdmin" class="admin-buttons">
							<button class="edit-btn" @click="goToEdit">Edytuj</button>
							<button v-if="canDelete" class="delete-btn" @click="deleteUser">Usuń</button>
						</div>
					</div>

					<div class="nav-buttons">
						<button class="page-btn" :disabled="usersIds.indexOf(Number(route.params.id)) <= 0"
							@click="goToUser(-1)">
							← Poprzedni
						</button>
						<button class="page-btn"
							:disabled="usersIds.indexOf(Number(route.params.id)) >= usersIds.length - 1"
							@click="goToUser(1)">
							Następny →
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.user-view {
	display: flex;
	justify-self: center;
	align-items: center;
	flex-direction: column;
	gap: 2rem;
	padding: 2rem;
	max-width: 1200px;
	width: 100%;
}

.hero {
	text-align: center;
}

.hero-title {
	font-size: 2.5rem;
	font-weight: bold;
	line-height: 1.25;
	margin-bottom: 1rem;
}

.hero-subtitle {
	font-size: 1.25rem;
	margin-bottom: 2rem;
	color: var(--color-text-muted);
}

.loading,
.no-data {
	text-align: center;
	font-style: italic;
	font-size: 1.2rem;
	color: var(--color-text-muted);
}

.user-card {
	display: flex;
	flex-direction: column;
	background-color: var(--color-bg-table);
	border: 2px solid var(--color-border);
	border-radius: var(--radius-lg);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	overflow: hidden;
	max-width: 700px;
	width: 100%;
}

.user-img {
	width: 100%;
	border-bottom: 2px solid var(--color-border);
	height: auto;
	object-fit: cover;
	max-height: 420px;
}

@media (max-width: 832px) {
	.user-img {
		max-height: 380px;
	}
}

@media (max-width: 768px) {
	.user-img {
		max-height: 340px;
	}
}

@media (max-width: 704px) {
	.user-img {
		max-height: 300px;
	}
}

@media (max-width: 640px) {
	.user-img {
		max-height: 260px;
	}
}

@media (max-width: 559px) {
	.user-img {
		max-height: 220px;
	}
}

.user-info {
	padding: 1.5rem;
	gap: 1.25rem;
	display: flex;
	flex-direction: column;
}

.user-name {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1.2;
	color: var(--color-text);
}

@media (max-width: 559px) {
	.user-name {
		font-size: 1.75rem;
	}
}

.user-details {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.user-details li strong {
	color: var(--color-strong);
}

.buttons-container {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.action-buttons,
.nav-buttons,
.admin-buttons {
	display: flex;
	gap: 1.25rem;
	flex-wrap: wrap;
}

.back-btn,
.page-btn,
.edit-btn,
.delete-btn {
	display: inline-block;
	padding: 0.5rem 1rem;
	width: 133px;
	font-weight: 600;
	cursor: pointer;
	text-decoration: none;
	color: white;
	border-radius: var(--radius-md);
	transition: background-color var(--transition), color var(--transition);
}

.edit-btn {
	background-color: var(--color-accent-edit);
}

.edit-btn:hover {
	background-color: var(--color-accent-hover-edit);
}

.delete-btn {
	background-color: var(--color-accent-delete);
}

.delete-btn:hover {
	background-color: var(--color-accent-hover-delete);
}

.back-btn {
	padding: 0.5rem 0.75rem;
	background-color: var(--color-accent2);
}

.back-btn:hover {
	background-color: var(--color-accent-hover2);
}

.page-btn {
	background-color: var(--color-accent);
}

.page-btn:hover {
	background-color: var(--color-accent-hover);
}

.page-btn:disabled {
	background-color: var(--color-border);
	cursor: not-allowed;
}
</style>