<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/store/toastStore'
import { useUserStore } from '@/store/userStore'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const isEdit = route.path.includes('/edit/')
const reservationId = route.params.id || null

// Pola formularza
const userId = ref('')
const tripId = ref('')
const tripDate = ref('')
const reservationDate = ref('')
const status = ref('oczekujacy')

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Lista użytkowników i wycieczek (do selectów)
const users = ref([])
const trips = ref([])

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Funkcja do pobrania dzisiejszej daty
function getTodayDateString() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Pobranie wszystkich użytkowników i wycieczek z backend'u
async function fetchUsersAndTrips() {
    try {
        const [usersRes, tripsRes] = await Promise.all([
            fetch('http://localhost:3000/users?limit=9999', {
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                }
            }),
            fetch('http://localhost:3000/trips?limit=9999'),
        ])
        const usersData = await usersRes.json()
        const tripsData = await tripsRes.json()
        if (usersRes.status === 401) {
            toastStore.show(usersData.error || usersData.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            return
        }
        if (tripsRes.status === 401) {
            toastStore.show(tripsData.error || tripsData.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            return
        }
        if (usersRes.status === 403) {
            toastStore.show(usersData.error || usersData.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            return
        }
        if (tripsRes.status === 403) {
            toastStore.show(tripsData.error || tripsData.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            return
        }
        if (!usersRes.ok) throw new Error(usersData.error || usersData.message || 'Błąd podczas pobierania użytkowników.')
        if (!tripsRes.ok) throw new Error(tripsData.error || tripsData.message || 'Błąd podczas pobierania wycieczek.')

        users.value = usersData.data || []
        trips.value = tripsData.data || []
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    }
}

// Pobranie danych pojedyńczej rezerwacji z backend'u
async function fetchReservation() {
    if (!isEdit || !reservationId) {
        loading.value = false
        reservationDate.value = getTodayDateString()
        return
    }

    try {
        const res = await fetch(`http://localhost:3000/reservations/${reservationId}`, {
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
            return
        }
        if (res.status === 403) {
            toastStore.show(data.error || data.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
            serverError.value = true
            return
        }
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania rezerwacji.')

        const reservation = data.data
        userId.value = reservation.user_id
        tripId.value = reservation.trip_id
        tripDate.value = reservation.trip_date
        reservationDate.value = reservation.reservation_date
        status.value = reservation.status
    } catch (err) {
        serverError.value = true
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
    }
}

// Wysyłanie formularza rezerwacji
async function submitForm() {
    try {
        loadingForm.value = true

        const payload = {
            user_id: userId.value,
            trip_id: tripId.value,
            status: status.value
        }
        if (tripDate.value) {
            payload.trip_date = tripDate.value
        }
        const url = isEdit ? `http://localhost:3000/reservations/${reservationId}` : `http://localhost:3000/reservations`
        const method = isEdit ? 'PUT' : 'POST'

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(payload)
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
        if (res.status === 400 || res.status === 404) {
            const message = isEdit ? 'Nie można edytować rezerwacji.' : 'Nie można utworzyć nowej rezerwacji.'
            toastStore.show(data.error || data.message || message, 'warning')
            return
        }
        if (!res.ok) {
            const message = isEdit ? 'Błąd podczas edytowania rezerwacji.' : 'Błąd podczas tworzenia nowej rezerwacji.'
            throw new Error(data.error || data.message || message)
        }

        toastStore.show(isEdit ? 'Zaktualizowano rezerwację.' : 'Dodano nową rezerwację.', 'success')
        router.push('/reservations')
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    } finally {
        loadingForm.value = false
        await nextTick()
    }
}

onMounted(async () => {
    await Promise.all([fetchUsersAndTrips(), fetchReservation()])
})
</script>

<template>
    <div class="reservation-form">
        <!-- Sekcja nagłówka -->
        <section class="hero">
            <h1 class="hero-title">{{ isEdit ? 'Edycja rezerwacji' : 'Nowa rezerwacja' }}</h1>
        </section>

        <!-- Ładowanie danych tylko w trybie edycji -->
        <div v-if="isEdit && loading" class="loading">Ładowanie danych rezerwacji...</div>

        <!-- Błąd serwera tylko w trybie edycji -->
        <div v-else-if="isEdit && serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <!-- Formularz rezerwacji, gdy nie ma błędu -->
        <section v-else class="reservation-box">
            <form @submit.prevent="submitForm">
                <label for="user_email">Użytkownik</label>
                <select id="user_email" v-model="userId">
                    <option disabled value="">Wybierz użytkownika</option>
                    <option v-for="user in users" :key="user.id" :value="user.id">{{ user.email }}</option>
                </select>

                <label for="trip_name">Wycieczka</label>
                <select id="trip_name" v-model="tripId">
                    <option disabled value="">Wybierz wycieczkę</option>
                    <option v-for="trip in trips" :key="trip.id" :value="trip.id">{{ trip.name }}</option>
                </select>

                <label for="reservation_date">Data rezerwacji</label>
                <input id="reservation_date" v-model="reservationDate" type="date" placeholder="DD-MM-RRRR" disabled />

                <label for="trip_date">Data wycieczki</label>
                <input id="trip_date" v-model="tripDate" type="date" placeholder="DD-MM-RRRR" />

                <label for="status">Status</label>
                <select id="status" v-model="status">
                    <option value="zatwierdzony">Zatwierdzony</option>
                    <option value="zakonczony">Zakończony</option>
                    <option value="oczekujacy">Oczekujący</option>
                    <option value="anulowany">Anulowany</option>
                </select>

                <button type="submit" :disabled="loadingForm" class="reservation-btn">
                    {{ loadingForm
                        ? (isEdit ? 'Zapisywanie...' : 'Dodawanie...')
                        : (isEdit ? 'Zapisz zmiany' : 'Dodaj rezerwację') }}
                </button>
            </form>
        </section>
    </div>
</template>

<style scoped>
.reservation-form {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
}

@media (min-width: 560px) {
    .reservation-form {
        max-width: 500px;
    }
}

@media (min-width: 833px) {
    .reservation-form {
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

.loading,
.no-data {
    text-align: center;
    font-style: italic;
    font-size: 1.2rem;
    color: var(--color-text-muted);
}

.reservation-box {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.reservation-box label {
    font-weight: 600;
    color: var(--color-text);
}

.reservation-box select,
.reservation-box input {
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

.reservation-box select:focus,
.reservation-box input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.reservation-box select:disabled,
.reservation-box input:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.reservation-btn {
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

.reservation-btn:hover {
    background-color: var(--color-accent-hover);
}

.reservation-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
}
</style>