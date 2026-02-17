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
const countryId = route.params.id || null

// Pola formularza
const name = ref('')
const description = ref('')
const area = ref('')
const population = ref('')
const continentId = ref('')

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Lista kontynentów (do selecta)
const continents = ref([])

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Pobranie wszystkich kontynentów z backend'u
async function fetchContinents() {
    try {
        const res = await fetch('http://localhost:3000/continents?limit=9999', {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kontynentów.')

        continents.value = data.data || []
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    }
}

// Pobranie danych pojedyńczego kraju z backend'u
async function fetchCountry() {
    if (!isEdit || !countryId) {
        loading.value = false
        return
    }

    try {
        const res = await fetch(`http://localhost:3000/countries/${countryId}`, {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kraju.')

        const country = data.data
        name.value = country.name
        description.value = country.description
        area.value = country.area
        population.value = country.population
        continentId.value = country.continent_id
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

// Wysyłanie formularza kraju
async function submitForm() {
    try {
        loadingForm.value = true

        const payload = {
            name: name.value,
            description: description.value,
            area: area.value,
            population: population.value,
            continent_id: continentId.value
        }
        const url = isEdit ? `http://localhost:3000/countries/${countryId}` : 'http://localhost:3000/countries'
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
            const message = isEdit ? 'Nie można edytować kraju.' : 'Nie można utworzyć nowego kraju.'
            toastStore.show(data.error || data.message || message, 'warning')
            return
        }
        if (!res.ok) {
            const message = isEdit ? 'Błąd podczas edytowania kraju.' : 'Błąd podczas tworzenia nowego kraju.'
            throw new Error(data.error || data.message || message)
        }

        toastStore.show(isEdit ? 'Zaktualizowano kraj.' : 'Dodano nowy kraj.', 'success')
        router.push('/countries')
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    } finally {
        loadingForm.value = false
        await nextTick()
    }
}

onMounted(async () => {
    await Promise.all([fetchContinents(), fetchCountry()])
})
</script>

<template>
    <div class="country-form">
        <!-- Sekcja nagłówka -->
        <section class="hero">
            <h1 class="hero-title">{{ isEdit ? 'Edycja kraju' : 'Nowy kraj' }}</h1>
        </section>

        <!-- Ładowanie danych tylko w trybie edycji -->
        <div v-if="isEdit && loading" class="loading">Ładowanie danych kraju...</div>

        <!-- Błąd serwera tylko w trybie edycji -->
        <div v-else-if="isEdit && serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <!-- Formularz kraju, gdy nie ma błędu -->
        <section v-else class="country-box">
            <form @submit.prevent="submitForm">
                <label for="name">Nazwa kraju</label>
                <input id="name" v-model="name" type="text" placeholder="Polska" />

                <label for="description">Opis</label>
                <textarea id="description" v-model="description" rows="3" placeholder="Krótki opis kraju..."></textarea>

                <label for="area">Powierzchnia (km²)</label>
                <input id="area" v-model="area" type="number" placeholder="123456789" />

                <label for="population">Ludność</label>
                <input id="population" v-model="population" type="number" placeholder="35000000" />

                <label for="continent">Nazwa kontynentu</label>
                <select id="continent" v-model="continentId">
                    <option disabled value="">Wybierz kontynent</option>
                    <option v-for="continent in continents" :key="continent.id" :value="continent.id">
                        {{ continent.name }}
                    </option>
                </select>

                <button type="submit" :disabled="loadingForm" class="country-btn">
                    {{ loadingForm
                        ? (isEdit ? 'Zapisywanie...' : 'Dodawanie...')
                        : (isEdit ? 'Zapisz zmiany' : 'Dodaj kraj') }}
                </button>
            </form>
        </section>
    </div>
</template>

<style scoped>
.country-form {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
}

@media (min-width: 560px) {
    .country-form {
        max-width: 500px;
    }
}

@media (min-width: 833px) {
    .country-form {
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

.country-box {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.country-box label {
    font-weight: 600;
    color: var(--color-text);
}

.country-box select,
.country-box input,
.country-box textarea {
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

.country-box textarea {
    resize: none;
}

.country-box select:focus,
.country-box input:focus,
.country-box textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.country-box select:disabled,
.country-box input:disabled,
.country-box textarea:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.country-btn {
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

.country-btn:hover {
    background-color: var(--color-accent-hover);
}

.country-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
}
</style>