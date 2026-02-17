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
const tripId = route.params.id || null

// Pola formularza
const name = ref('')
const description = ref('')
const period = ref('')
const price = ref('')
const countryId = ref('')

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Lista krajów (do selecta)
const countries = ref([])

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Pobieranie wszystkich krajów z backend'u
async function fetchCountries() {
    try {
        const res = await fetch('http://localhost:3000/countries?limit=9999', {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania krajów.')

        countries.value = data.data || []
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    }
}

// Pobranie danych pojedyńczej wycieczki z backend'u
async function fetchTrip() {
    if (!isEdit || !tripId) {
        loading.value = false
        return
    }

    try {
        const res = await fetch(`http://localhost:3000/trips/${tripId}`, {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania wycieczki.')

        const trip = data.data
        name.value = trip.name
        description.value = trip.description
        period.value = trip.period
        price.value = trip.price
        countryId.value = trip.country_id
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

// Wysyłanie formularza wycieczki
async function submitForm() {
    try {
        loadingForm.value = true

        const payload = {
            name: name.value,
            description: description.value,
            period: period.value,
            price: price.value,
            country_id: countryId.value
        }
        const url = isEdit ? `http://localhost:3000/trips/${tripId}` : `http://localhost:3000/trips`
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
            const message = isEdit ? 'Nie można edytować wycieczki.' : 'Nie można utworzyć nowej wycieczki.'
            toastStore.show(data.error || data.message || message, 'warning')
            return
        }
        if (!res.ok) {
            const message = isEdit ? 'Błąd podczas edytowania wycieczki.' : 'Błąd podczas tworzenia nowej wycieczki.'
            throw new Error(data.error || data.message || message)
        }

        toastStore.show(isEdit ? 'Zaktualizowano wycieczkę.' : 'Dodano nową wycieczkę.', 'success')
        router.push('/trips')
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    } finally {
        loadingForm.value = false
        await nextTick()
    }
}

onMounted(async () => {
    await Promise.all([fetchCountries(), fetchTrip()])
})
</script>

<template>
    <div class="trip-form">
        <!-- Sekcja nagłówka -->
        <section class="hero">
            <h1 class="hero-title">{{ isEdit ? 'Edycja wycieczki' : 'Nowa wycieczka' }}</h1>
        </section>

        <!-- Ładowanie danych tylko w trybie edycji -->
        <div v-if="isEdit && loading" class="loading">Ładowanie danych wycieczki...</div>

        <!-- Błąd serwera tylko w trybie edycji -->
        <div v-else-if="isEdit && serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <section v-else class="trip-box">
            <form @submit.prevent="submitForm">
                <label for="name">Nazwa wycieczki</label>
                <input id="name" v-model="name" type="text" placeholder="Wycieczka do..." />

                <label for="description">Opis</label>
                <textarea id="description" v-model="description" rows="3" placeholder="Krótki opis wycieczki..."></textarea>

                <label for="period">Czas trwania (dni)</label>
                <input id="period" v-model="period" type="number" placeholder="3" />

                <label for="price">Cena (zł)</label>
                <input id="price" v-model="price" type="number" step="0.01" placeholder="3500.75" />

                <label for="country">Nazwa kraju</label>
                <select id="country" v-model="countryId">
                    <option disabled value="">Wybierz kraj</option>
                    <option v-for="country in countries" :key="country.id" :value="country.id">
                        {{ country.name }}
                    </option>
                </select>

                <button type="submit" :disabled="loadingForm" class="trip-btn">
                    {{ loadingForm
                        ? (isEdit ? 'Zapisywanie...' : 'Dodawanie...')
                        : (isEdit ? 'Zapisz zmiany' : 'Dodaj wycieczkę') }}
                </button>
            </form>
        </section>
    </div>
</template>

<style scoped>
.trip-form {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
}

@media (min-width: 560px) {
    .trip-form {
        max-width: 500px;
    }
}

@media (min-width: 833px) {
    .trip-form {
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

.trip-box {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.trip-box label {
    font-weight: 600;
    color: var(--color-text);
}

.trip-box select,
.trip-box input,
.trip-box textarea {
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

.trip-box textarea {
    resize: none;
}

.trip-box select:focus,
.trip-box input:focus,
.trip-box textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.trip-box select:disabled,
.trip-box input:disabled,
.trip-box textarea:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.trip-btn {
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

.trip-btn:hover {
    background-color: var(--color-accent-hover);
}

.trip-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
}
</style>