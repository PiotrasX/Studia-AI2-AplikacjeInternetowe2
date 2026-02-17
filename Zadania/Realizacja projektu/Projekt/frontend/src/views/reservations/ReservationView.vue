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

const reservation = ref(null)
const loading = ref(true)
const tripImage = ref('')
const errorMessage = ref('')
const serverError = ref(false)

const reservations = ref([])
const reservationsIds = ref([])
const totalReservations = ref(0)

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

// Formatowanie daty
function formatDate(dateStr) {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
}

// Formatowanie statusu
const statusMap = {
    oczekujacy: 'Oczekujący',
    zatwierdzony: 'Zatwierdzony',
    zakonczony: 'Zakończony',
    anulowany: 'Anulowany'
}

// Pobranie wszystkich rezerwacji z backend'u
async function fetchAllReservation() {
    try {
        const res = await fetch('http://localhost:3000/reservations?limit=9999', {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania rezerwacji.')

        reservations.value = data.data || []
        reservationsIds.value = reservations.value.map(c => c.id).sort((a, b) => a - b)
        totalReservations.value = reservationsIds.value.length
    } catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
    }
}

// Pobranie danych pojedynczj rezerwacji z backend'u
async function fetchReservation() {
    try {
        const id = Number(route.params.id)
        if (!isValidId(id)) {
            toastStore.show('Nieprawidłowy ID rezerwacji.', 'warning')
            errorMessage.value = 'Nieprawidłowy ID rezerwacji.'
            serverError.value = true
            reservation.value = null
            return
        }

        const res = await fetch(`http://localhost:3000/reservations/${id}`, {
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
            reservation.value = null
            return
        }
        if (res.status === 403) {
            toastStore.show(data.error || data.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
            serverError.value = true
            reservation.value = null
            return
        }
        if (res.status === 404) {
            toastStore.show('Rezerwacja o podanym ID nie istnieje.', 'warning')
            errorMessage.value = 'Rezerwacja o podanym ID nie istnieje.'
            serverError.value = true
            reservation.value = null
            return
        }
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania rezerwacji.')

        reservation.value = data.data
        tripImage.value = getTripImage(data.data.trip_id)
    } catch (err) {
        serverError.value = true
        reservation.value = null
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

// Usuwanie rezerwacji
async function deleteReservation() {
    if (!reservation.value) return
    const confirmDelete = confirm(`Czy na pewno chcesz usunąć rezerwacje użytkownika "${reservation.value.user_email}" na wycieczke "${reservation.value.trip_name}"?`)
    if (!confirmDelete) return

    try {
        const res = await fetch(`http://localhost:3000/reservations/${reservation.value.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        })
        const data = await res.json()
        if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
            toastStore.show(data.error || data.message || 'Nie można usunąć rezerwacji.', 'warning')
            return
        }
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas usuwania rezerwacji.')

        toastStore.show('Rezerwacja została usunięta.', 'success')
        router.push('/reservations')
    } catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
    }
}

// Przejście do edycji rezerwacji
function goToEdit() {
    if (reservation.value) router.push(`/reservations/edit/${reservation.value.id}`)
}

// Nawigacja między rezerwacjami
function goToReservation(offset) {
    lastScrollY = window.scrollY

    const currentId = Number(route.params.id)
    const index = reservationsIds.value.indexOf(currentId)
    if (index === -1) {
        toastStore.show('Nie znaleziono bieżącej rezerwacji.', 'warning')
        return
    }

    const newIndex = index + offset
    if (newIndex < 0 || newIndex >= reservationsIds.value.length) {
        toastStore.show('Brak kolejnej rezerwacji w tym kierunku.', 'warning')
        return
    }

    const newId = reservationsIds.value[newIndex]
    router.push(`/reservations/${newId}`)
}

// Ponowne pobranie danych rezerwacji z backend'u przy zmianie ID
watch(() => route.params.id, () => {
    loading.value = true
    fetchReservation()
})

onMounted(async () => {
    await fetchAllReservation()
    await fetchReservation()
})
</script>

<template>
    <div class="reservation-view">
        <section class="hero">
            <h1 class="hero-title">Szczegóły rezerwacji</h1>
            <p class="hero-subtitle">Informacje dotyczące wybranej rezerwacji.</p>
        </section>

        <div v-if="loading" class="loading">Ładowanie danych rezerwacji...</div>

        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <div v-else-if="reservation" class="reservation-card">
            <img class="trip-img" :src="tripImage" :alt="reservation.trip_name" />

            <div class="reservation-info">
                <h2 class="reservation-name">Rezerwacja nr {{ reservation.id }}</h2>

                <ul class="reservation-details">
                    <li><strong>Użytkownik: </strong> {{ reservation.user_email }}</li>
                    <li><strong>Wycieczka: </strong> {{ reservation.trip_name }}</li>
                    <li><strong>Data rezerwacji: </strong> {{ formatDate(reservation.reservation_date) }}</li>
                    <li><strong>Data wycieczki: </strong> {{ formatDate(reservation.trip_date) }}</li>
                    <li><strong>Status: </strong>
                        <a :class="['status-label', reservation.status]">
                             {{ statusMap[reservation.status] || reservation.status }}
                        </a>
                    </li>
                </ul>

                <div class="buttons-container">
                    <div class="action-buttons">
                        <RouterLink to="/reservations" class="back-btn">Powrót do listy</RouterLink>

                        <!-- Tylko dla administratora -->
                        <div v-if="userStore.isAdmin" class="admin-buttons">
                            <button class="edit-btn" @click="goToEdit">Edytuj</button>
                            <button class="delete-btn" @click="deleteReservation">Usuń</button>
                        </div>
                    </div>

                    <div class="nav-buttons">
                        <button class="page-btn" :disabled="reservationsIds.indexOf(Number(route.params.id)) <= 0"
                            @click="goToReservation(-1)">
                            ← Poprzedni
                        </button>
                        <button class="page-btn"
                            :disabled="reservationsIds.indexOf(Number(route.params.id)) >= reservationsIds.length - 1"
                            @click="goToReservation(1)">
                            Następny →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.reservation-view {
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

.reservation-card {
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

.reservation-info {
    padding: 1.5rem;
    gap: 1.25rem;
    display: flex;
    flex-direction: column;
}

.reservation-name {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text);
}

@media (max-width: 559px) {
    .reservation-name {
        font-size: 1.75rem;
    }
}

.reservation-details {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.reservation-details li strong {
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

.status-label.oczekujacy {
    color: var(--color-card-status-oczekujacy);
}

.status-label.zatwierdzony {
    color: var(--color-card-status-zatwierdzony);
}

.status-label.zakonczony {
    color: var(--color-card-status-zakonczony);
}

.status-label.anulowany {
    color: var(--color-card-status-anulowany);
}
</style>