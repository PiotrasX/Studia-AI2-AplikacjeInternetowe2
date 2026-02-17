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

const country = ref(null)
const loading = ref(true)
const countryImage = ref('')
const errorMessage = ref('')
const serverError = ref(false)
const canDelete = ref(true)

const countries = ref([])
const countriesIds = ref([])
const totalCountries = ref(0)
const tripsCount = ref(0)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
	const token = userStore.token
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Wybieranie obrazka na podstawie ID
function getCountryImage(id) {
	const imgNumber = ((id - 1) % 3) + 1
	return `/img/countries/country${imgNumber}.jpg`
}

// Sprawdzenie poprawności ID
function isValidId(id) {
	return Number.isInteger(id) && id > 0
}

// Pobranie wszystkich krajów z backend'u
async function fetchAllCountries() {
	try {
		const res = await fetch('http://localhost:3000/countries?limit=9999')
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania krajów.')

		countries.value = data.data || []
		countriesIds.value = countries.value.map(c => c.id).sort((a, b) => a - b)
		totalCountries.value = countriesIds.value.length
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Pobranie danych pojedyńczego kraju z backend'u
async function fetchCountry() {
	try {
		const id = Number(route.params.id)
		if (!isValidId(id)) {
			toastStore.show('Nieprawidłowy ID kraju.', 'warning')
			errorMessage.value = 'Nieprawidłowy ID kraju.'
            serverError.value = true
			country.value = null
			return
		}

		const res = await fetch(`http://localhost:3000/countries/${id}`)
		const data = await res.json()
		if (res.status === 404) {
			toastStore.show('Kraj o podanym ID nie istnieje.', 'warning')
			errorMessage.value = 'Kraj o podanym ID nie istnieje.'
            serverError.value = true
			country.value = null
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kraju.')

		country.value = data.data
		countryImage.value = getCountryImage(id)

		await fetchTripsCount(id)
		await checkIfCanDelete(id)
	} catch (err) {
		serverError.value = true
        country.value = null
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

// Pobranie liczby wycieczek w danym kraju z backend'u
async function fetchTripsCount(countryId) {
	try {
		const res = await fetch(`http://localhost:3000/trips?country_id=${countryId}&limit=9999`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby wycieczek.')

		tripsCount.value = Array.isArray(data.data) ? data.data.length : 0
	} catch (err) {
		tripsCount.value = 0
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Czy kraj można usunąć
async function checkIfCanDelete(countryId) {
	try {
		const res = await fetch(`http://localhost:3000/trips?country_id=${countryId}&limit=1`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby wycieczek.')

		canDelete.value = !(Array.isArray(data.data) && data.data.length > 0)
	} catch (err) {
		canDelete.value = false
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Usuwanie kraju
async function deleteCountry() {
	if (!country.value) return
	const confirmDelete = confirm(`Czy na pewno chcesz usunąć kraj "${country.value.name}"?`)
	if (!confirmDelete) return

	try {
		const res = await fetch(`http://localhost:3000/countries/${country.value.id}`, {
			method: 'DELETE',
			headers: {
				...getAuthHeader(),
				'Content-Type': 'application/json'
			}
		})
		const data = await res.json()
		if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
			toastStore.show(data.error || data.message || 'Nie można usunąć kraju.', 'warning')
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas usuwania kraju.')

		toastStore.show('Kraj został usunięty.', 'success')
		router.push('/countries')
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Przejście do edycji kraju
function goToEdit() {
	if (country.value) router.push(`/countries/edit/${country.value.id}`)
}

// Nawigacja między krajami
function goToCountry(offset) {
	lastScrollY = window.scrollY

	const currentId = Number(route.params.id)
	const index = countriesIds.value.indexOf(currentId)
	if (index === -1) {
		toastStore.show('Nie znaleziono bieżącego kraju.', 'warning')
		return
	}

	const newIndex = index + offset
	if (newIndex < 0 || newIndex >= countriesIds.value.length) {
		toastStore.show('Brak kolejnego kraju w tym kierunku.', 'warning')
		return
	}

	const newId = countriesIds.value[newIndex]
	router.push(`/countries/${newId}`)
}

// Ponowne pobranie danych kraju z backend'u przy zmianie ID
watch(() => route.params.id, () => {
	loading.value = true
	fetchCountry()
})

onMounted(async () => {
	await fetchAllCountries()
	await fetchCountry()
})
</script>

<template>
	<div class="country-view">
		<section class="hero">
			<h1 class="hero-title">Szczegóły kraju</h1>
			<p class="hero-subtitle">Poznaj informacje o wybranym kraju.</p>
		</section>

		<div v-if="loading" class="loading">Ładowanie danych kraju...</div>

        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

		<div v-else-if="country" class="country-card">
			<img class="country-img" :src="countryImage" :alt="country.name" />

			<div class="country-info">
				<h2 class="country-name">{{ country.name }}</h2>
				<p class="country-desc">{{ country.description }}</p>

				<ul class="country-details">
					<li><strong>Kontynent: </strong> {{ country.continent_name }}</li>
					<li><strong>Powierzchnia: </strong> {{ country.area?.toLocaleString() || '—' }} km²</li>
					<li><strong>Ludność: </strong> {{ country.population?.toLocaleString() || '—' }}</li>
					<li><strong>Liczba wycieczek: </strong> {{ tripsCount }}</li>
				</ul>

				<div class="buttons-container">
					<div class="action-buttons">
						<RouterLink to="/countries" class="back-btn">Powrót do listy</RouterLink>

						<!-- Tylko dla administratora -->
						<div v-if="userStore.isAdmin" class="admin-buttons">
							<button class="edit-btn" @click="goToEdit">Edytuj</button>
							<button v-if="canDelete" class="delete-btn" @click="deleteCountry">Usuń</button>
						</div>
					</div>

					<div class="nav-buttons">
						<button class="page-btn" :disabled="countriesIds.indexOf(Number(route.params.id)) <= 0"
							@click="goToCountry(-1)">
							← Poprzedni
						</button>
						<button class="page-btn"
							:disabled="countriesIds.indexOf(Number(route.params.id)) >= countriesIds.length - 1"
							@click="goToCountry(1)">
							Następny →
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.country-view {
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

.country-card {
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

.country-img {
	width: 100%;
	border-bottom: 2px solid var(--color-border);
	height: auto;
	object-fit: cover;
	max-height: 420px;
}

@media (max-width: 832px) {
	.country-img {
		max-height: 380px;
	}
}

@media (max-width: 768px) {
	.country-img {
		max-height: 340px;
	}
}

@media (max-width: 704px) {
	.country-img {
		max-height: 300px;
	}
}

@media (max-width: 640px) {
	.country-img {
		max-height: 260px;
	}
}

@media (max-width: 559px) {
	.country-img {
		max-height: 220px;
	}
}

.country-info {
	padding: 1.5rem;
	gap: 1.25rem;
	display: flex;
	flex-direction: column;
}

.country-name {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1.2;
	color: var(--color-text);
}

.country-desc {
	font-size: 1.25rem;
	font-weight: 500;
	line-height: 1.2;
	color: var(--color-text-muted);
}

@media (max-width: 559px) {
	.country-name {
		font-size: 1.75rem;
	}

	.country-desc {
		font-size: 1.175rem;
	}
}

.country-details {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.country-details li strong {
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