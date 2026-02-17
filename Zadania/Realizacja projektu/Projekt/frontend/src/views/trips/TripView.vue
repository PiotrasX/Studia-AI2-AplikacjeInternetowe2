<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/store/toastStore'
import { useUserStore } from '@/store/userStore'
import { bookTrip } from '@/services/api.js'

let lastScrollY = 0

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const trip = ref(null)
const loading = ref(true)
const tripImage = ref('')
const errorMessage = ref('')
const serverError = ref(false)
const canDelete = ref(true)
const hasUserReservation = ref(false)

const trips = ref([])
const tripsIds = ref([])
const totalTrips = ref(0)
const reservationsCount = ref(0)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
	const token = userStore.token
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Wybieranie obrazka na podstawie ID
function getTripImage(id) {
	const imgNumber = ((id - 1) % 10) + 1
	return `/img/trips/trip${imgNumber}.jpg`
}

// Sprawdzenie poprawności ID
function isValidId(id) {
	return Number.isInteger(id) && id > 0
}

// Pobranie wszystkich wycieczek z backend'u
async function fetchAllTrips() {
	try {
		const res = await fetch('http://localhost:3000/trips?limit=9999')
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania wycieczek.')

		trips.value = data.data || []
		tripsIds.value = trips.value.map(t => t.id).sort((a, b) => a - b)
		totalTrips.value = tripsIds.value.length
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Pobieranie danych pojedynczej wycieczki z backend'u
async function fetchTrip() {
	try {
		const id = Number(route.params.id)
		if (!isValidId(id)) {
			toastStore.show('Nieprawidłowy ID wycieczki.', 'warning')
			errorMessage.value = 'Nieprawidłowy ID wycieczki.'
            serverError.value = true
			trip.value = null
			return
		}

		const res = await fetch(`http://localhost:3000/trips/${id}`)
		const data = await res.json()
		if (res.status === 404) {
			toastStore.show('Wycieczka o podanym ID nie istnieje.', 'warning')
			errorMessage.value = 'Wycieczka o podanym ID nie istnieje.'
            serverError.value = true
			trip.value = null
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania wycieczki.')

		trip.value = data.data
		tripImage.value = getTripImage(id)

		await fetchReservationsCount(id)
		await checkIfCanDelete(id)
		await checkUserReservation(id)
	} catch (err) {
		serverError.value = true
        trip.value = null
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

// Pobranie liczby rezerwacji danej wycieczki z backend'u
async function fetchReservationsCount(tripId) {
	try {
		const res = await fetch(`http://localhost:3000/reservations/count/trip/${tripId}`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby rezerwacji.')

		reservationsCount.value = typeof data.count === 'number' ? data.count : 0
	} catch (err) {
		reservationsCount.value = 0
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Czy wycieczke można usunąć
async function checkIfCanDelete(tripId) {
	try {
		const res = await fetch(`http://localhost:3000/reservations/count/trip/${tripId}`)
		const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania liczby rezerwacji.')

		canDelete.value = typeof data.count === 'number' && data.count === 0
	} catch (err) {
		canDelete.value = false
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Usuwanie wycieczki
async function deleteTrip() {
	if (!trip.value) return
	const confirmDelete = confirm(`Czy na pewno chcesz usunąć wycieczke "${trip.value.name}"?`)
	if (!confirmDelete) return

	try {
		const res = await fetch(`http://localhost:3000/trips/${trip.value.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader()
			}
		})
		const data = await res.json()
		if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
			toastStore.show(data.error || data.message || 'Nie można usunąć wycieczki.', 'warning')
			return
		}
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas usuwania wycieczki.')

		toastStore.show('Wycieczka została usunięta.', 'success')
		router.push('/trips')
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Przejście do edycji wycieczki
function goToEdit() {
	if (trip.value) router.push(`/trips/edit/${trip.value.id}`)
}

// Nawigacja między wycieczkami
function goToTrip(offset) {
	lastScrollY = window.scrollY

	const currentId = Number(route.params.id)
	const index = tripsIds.value.indexOf(currentId)
	if (index === -1) {
		toastStore.show('Nie znaleziono bieżącej wycieczki.', 'warning')
		return
	}

	const newIndex = index + offset
	if (newIndex < 0 || newIndex >= tripsIds.value.length) {
		toastStore.show('Brak kolejnej wycieczki w tym kierunku.', 'warning')
		return
	}

	const newId = tripsIds.value[newIndex]
	router.push(`/trips/${newId}`)
}

// Rezerwacja wycieczki
async function reserveTrip() {
	if (!userStore.isAuthenticated) {
		toastStore.show("Musisz być zalogowany.", "warning")
		return
	}

	const date = prompt("Podaj datę wycieczki (Wymagany RRRR-MM-DD):")
	if (!date) {
		toastStore.show("Nie podano daty wycieczki.", "warning")
		return
	}

	try {
		await bookTrip({ trip_id: trip.value.id, trip_date: date })
		await fetchReservationsCount(trip.value.id)
		await fetchAllTrips()
		await fetchTrip()

		toastStore.show('Wycieczka została zarezerwowana.', 'success')
	} catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else if (err.status === 401) toastStore.show(err.error || err.message || 'Brak tokenu autoryzacyjnego.', 'warning')
        else if (err.status === 403) toastStore.show(err.error || err.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
        else toastStore.show(err.message, "error")
	}
}

// Sprawdzenie czy użytkownik ma rezerwację na daną wycieczkę
async function checkUserReservation(tripId) {
	if (!userStore.isAuthenticated) {
		hasUserReservation.value = false
		return
	}

	try {
		const res = await fetch(`http://localhost:3000/reservations/user/${userStore.user.id}`, {
			headers: { ...getAuthHeader() }
		})
		const data = await res.json()
		if (!res.ok) {
			hasUserReservation.value = false
			return
		}

		hasUserReservation.value = data.data.some(r => r.trip_id === tripId)
	} catch {
		hasUserReservation.value = false
	}
}

// Ponowne pobranie danych wycieczki z backend'u przy zmianie ID
watch(() => route.params.id, () => {
	loading.value = true
	fetchTrip()
})

onMounted(async () => {
	await fetchAllTrips()
	await fetchTrip()
})
</script>

<template>
	<div class="trip-view">
		<section class="hero">
			<h1 class="hero-title">Szczegóły wycieczki</h1>
			<p class="hero-subtitle">Poznaj wszystkie informacje o wybranej podróży.</p>
		</section>

		<div v-if="loading" class="loading">Ładowanie danych wycieczki...</div>

        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

		<div v-else-if="trip" class="trip-card">
			<img class="trip-img" :src="tripImage" :alt="trip.name" />

			<div class="trip-info">
				<h2 class="trip-name">{{ trip.name }}</h2>
				<p class="trip-desc">{{ trip.description }}</p>

				<ul class="trip-details">
					<li><strong>Kontynent: </strong> {{ trip.continent_name }}</li>
					<li><strong>Kraj: </strong> {{ trip.country_name }}</li>
					<li><strong>Okres: </strong> {{ trip.period }} dni</li>
					<li><strong>Cena: </strong> {{ trip.price }} PLN</li>
					<li><strong>Liczba rezerwacji: </strong> {{ reservationsCount }}</li>
				</ul>

				<div class="buttons-container">
					<div class="action-buttons">
						<RouterLink to="/trips" class="back-btn">Powrót do listy</RouterLink>

						<!-- Tylko dla zalogowanych -->
						<button v-if="userStore.isAuthenticated" class="page-btn reservation-btn" :disabled="hasUserReservation" @click="!hasUserReservation && reserveTrip()">
							{{ hasUserReservation ? 'Zarezerwowano' : 'Zarezerwuj' }}
						</button>

						<!-- Tylko dla administratora -->
						<div v-if="userStore.isAdmin" class="admin-buttons">
							<button class="edit-btn" @click="goToEdit">Edytuj</button>
							<button v-if="canDelete" class="delete-btn" @click="deleteTrip">Usuń</button>
						</div>
					</div>

					<div class="nav-buttons">
						<button class="page-btn" :disabled="tripsIds.indexOf(Number(route.params.id)) <= 0" @click="goToTrip(-1)">
							← Poprzednia
						</button>
						<button class="page-btn" :disabled="tripsIds.indexOf(Number(route.params.id)) >= tripsIds.length - 1" @click="goToTrip(1)">
							Następna →
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.trip-view {
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

.trip-card {
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

.trip-img {
	width: 100%;
	border-bottom: 2px solid var(--color-border);
	height: auto;
	object-fit: cover;
	max-height: 420px;
}

@media (max-width: 832px) {
	.trip-img {
		max-height: 380px;
	}
}

@media (max-width: 768px) {
	.trip-img {
		max-height: 340px;
	}
}

@media (max-width: 704px) {
	.trip-img {
		max-height: 300px;
	}
}

@media (max-width: 640px) {
	.trip-img {
		max-height: 260px;
	}
}

@media (max-width: 559px) {
	.trip-img {
		max-height: 220px;
	}
}

.trip-info {
	padding: 1.5rem;
	gap: 1.25rem;
	display: flex;
	flex-direction: column;
}

.trip-name {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1.2;
	color: var(--color-text);
}

.trip-desc {
	font-size: 1.25rem;
	font-weight: 500;
	line-height: 1.2;
	color: var(--color-text-muted);
}

@media (max-width: 559px) {
	.trip-name {
		font-size: 1.75rem;
	}

	.trip-desc {
		font-size: 1.175rem;
	}
}

.trip-details {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.trip-details li strong {
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

.reservation-btn {
	padding: 0.5rem 0.5rem;
	background-color: var(--color-accent3);
}

.reservation-btn:hover {
	background-color: var(--color-accent-hover3);
}

.reservation-btn:disabled {
	background-color: var(--color-border);
	cursor: not-allowed;
}
</style>