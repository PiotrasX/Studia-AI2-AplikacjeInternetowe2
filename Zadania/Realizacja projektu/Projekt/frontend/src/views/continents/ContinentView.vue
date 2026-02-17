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

const continent = ref(null)
const loading = ref(true)
const continentImage = ref('')
const errorMessage = ref('')
const serverError = ref(false)
const canDelete = ref(true)

const continents = ref([])
const continentIds = ref([])
const totalContinents = ref(0)
const countriesCount = ref(0)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
	const token = userStore.token
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Wybieranie obrazka na podstawie ID
function getContinentImage(id) {
	const imgNumber = ((id - 1) % 7) + 1
	return `/img/continents/continent${imgNumber}.jpg`
}

// Sprawdzenie poprawności ID
function isValidId(id) {
	return Number.isInteger(id) && id > 0
}

// Pobranie wszystkich kontynentów z backend'u
async function fetchAllContinents() {
	try {
		const res = await fetch('http://localhost:3000/continents?limit=9999')
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kontynentów.')

		continents.value = data.data || []
		continentIds.value = continents.value.map(c => c.id).sort((a, b) => a - b)
		totalContinents.value = continentIds.value.length
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Pobranie danych pojedynczego kontynentu z backend'u
async function fetchContinent() {
	try {
		const id = Number(route.params.id)
		if (!isValidId(id)) {
			toastStore.show('Nieprawidłowy ID kontynentu.', 'warning')
			errorMessage.value = 'Nieprawidłowy ID kontynentu.'
            serverError.value = true
			continent.value = null
			return
		}

		const res = await fetch(`http://localhost:3000/continents/${id}`)
		const data = await res.json()
		if (res.status === 404) {
			toastStore.show('Kontynent o podanym ID nie istnieje.', 'warning')
			errorMessage.value = 'Kontynent o podanym ID nie istnieje.'
            serverError.value = true
			continent.value = null
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kontynentu.')

		continent.value = data.data
		continentImage.value = getContinentImage(id)

		await fetchCountriesCount(id)
		await checkIfCanDelete(id)
	} catch (err) {
		serverError.value = true
        continent.value = null
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

// Pobranie liczby krajów na danym kontynencie z backend'u
async function fetchCountriesCount(continentId) {
	try {
		const res = await fetch(`http://localhost:3000/countries?continent_id=${continentId}&limit=9999`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby krajów.')

		countriesCount.value = Array.isArray(data.data) ? data.data.length : 0
	} catch (err) {
		countriesCount.value = 0
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Czy kontynent można usunąć
async function checkIfCanDelete(continentId) {
	try {
		const res = await fetch(`http://localhost:3000/countries?continent_id=${continentId}&limit=1`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby krajów.')

		canDelete.value = !(Array.isArray(data.data) && data.data.length > 0)
	} catch (err) {
		canDelete.value = false
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Usuwanie kontynentu
async function deleteContinent() {
	if (!continent.value) return
	const confirmDelete = confirm(`Czy na pewno chcesz usunąć kontynent "${continent.value.name}"?`)
	if (!confirmDelete) return

	try {
		const res = await fetch(`http://localhost:3000/continents/${continent.value.id}`, {
			method: 'DELETE',
			headers: {
				...getAuthHeader(),
				'Content-Type': 'application/json'
			}
		})
		const data = await res.json();
		if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
			toastStore.show(data.error || data.message || 'Nie można usunąć kontynentu.', 'warning')
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas usuwania kontynentu.')

		toastStore.show('Kontynent usunięty.', 'success')
		router.push('/continents')
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Przejście do edycji kontynentu
function goToEdit() {
	if (continent.value) router.push(`/continents/edit/${continent.value.id}`)
}

// Nawigacja między kontynentami
function goToContinent(offset) {
	lastScrollY = window.scrollY

	const currentId = Number(route.params.id)
	const index = continentIds.value.indexOf(currentId)
	if (index === -1) {
		toastStore.show('Nie znaleziono bieżącego kontynentu.', 'warning')
		return
	}

	const newIndex = index + offset
	if (newIndex < 0 || newIndex >= continentIds.value.length) {
		toastStore.show('Brak kolejnego kontynentu w tym kierunku.', 'warning')
		return
	}

	const newId = continentIds.value[newIndex]
	router.push(`/continents/${newId}`)
}

// Ponowne pobranie danych kontynentu z backend'u przy zmianie ID
watch(() => route.params.id, () => {
	loading.value = true
	fetchContinent()
})

onMounted(async () => {
	await fetchAllContinents()
	await fetchContinent()
})
</script>

<template>
	<div class="continent-view">
		<section class="hero">
			<h1 class="hero-title">Szczegóły kontynentu</h1>
			<p class="hero-subtitle">Poznaj informacje o wybranym kontynencie.</p>
		</section>

		<div v-if="loading" class="loading">Ładowanie danych kontynentu...</div>

        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

		<div v-else-if="continent" class="continent-card">
			<img class="continent-img" :src="continentImage" :alt="continent.name" />

			<div class="continent-info">
				<h2 class="continent-name">{{ continent.name }}</h2>
				<p class="continent-desc">{{ continent.description }}</p>

				<ul class="continent-details">
					<li><strong>Powierzchnia: </strong> {{ continent.area?.toLocaleString() || '—' }} km²</li>
					<li><strong>Liczba krajów: </strong> {{ countriesCount }}</li>
				</ul>

				<div class="buttons-container">
					<div class="action-buttons">
						<RouterLink to="/continents" class="back-btn">Powrót do listy</RouterLink>

						<!-- Tylko dla administratora -->
						<div v-if="userStore.isAdmin" class="admin-buttons">
							<button class="edit-btn" @click="goToEdit">Edytuj</button>
							<button v-if="canDelete" class="delete-btn" @click="deleteContinent">Usuń</button>
						</div>
					</div>

					<div class="nav-buttons">
						<button class="page-btn" :disabled="continentIds.indexOf(Number(route.params.id)) <= 0"
							@click="goToContinent(-1)">
							← Poprzedni
						</button>
						<button class="page-btn"
							:disabled="continentIds.indexOf(Number(route.params.id)) >= continentIds.length - 1"
							@click="goToContinent(1)">
							Następny →
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.continent-view {
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

.continent-card {
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

.continent-img {
	width: 100%;
	border-bottom: 2px solid var(--color-border);
	height: auto;
	object-fit: cover;
	max-height: 420px;
}

@media (max-width: 832px) {
	.continent-img {
		max-height: 380px;
	}
}

@media (max-width: 768px) {
	.continent-img {
		max-height: 340px;
	}
}

@media (max-width: 704px) {
	.continent-img {
		max-height: 300px;
	}
}

@media (max-width: 640px) {
	.continent-img {
		max-height: 260px;
	}
}

@media (max-width: 559px) {
	.continent-img {
		max-height: 220px;
	}
}

.continent-info {
	padding: 1.5rem;
	gap: 1.25rem;
	display: flex;
	flex-direction: column;
}

.continent-name {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1.2;
	color: var(--color-text);
}

.continent-desc {
	font-size: 1.25rem;
	font-weight: 500;
	line-height: 1.2;
	color: var(--color-text-muted);
}

@media (max-width: 559px) {
	.continent-name {
		font-size: 1.75rem;
	}

	.continent-desc {
		font-size: 1.175rem;
	}
}

.continent-details {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.continent-details li strong {
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