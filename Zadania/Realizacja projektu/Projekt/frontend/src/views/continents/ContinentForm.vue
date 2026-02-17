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
const continentId = route.params.id || null

// Pola formularza
const name = ref('')
const description = ref('')
const area = ref('')

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Pobranie danych pojedyńczego kontynentu z backend'u
async function fetchContinent() {
	if (!isEdit || !continentId) {
		loading.value = false
		return
	}

	try {
		const res = await fetch(`http://localhost:3000/continents/${continentId}`, {
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
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania kontynentu.')

        const continent = data.data
		name.value = continent.name
		description.value = continent.description
		area.value = continent.area
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

// Wysyłanie formularza kontynentu
async function submitForm() {
	try {
		loadingForm.value = true

		const payload = {
			name: name.value,
			description: description.value,
			area: area.value
		}
		const url = isEdit ? `http://localhost:3000/continents/${continentId}` : 'http://localhost:3000/continents'
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
            const message = isEdit ? 'Nie można edytować kontynentu.' : 'Nie można utworzyć nowego kontynentu.'
            toastStore.show(data.error || data.message || message, 'warning')
            return
        }
        if (!res.ok) {
            const message = isEdit ? 'Błąd podczas edytowania kontynentu.' : 'Błąd podczas tworzenia nowego kontynentu.'
            throw new Error(data.error || data.message || message)
        }

		toastStore.show(isEdit ? 'Zaktualizowano kontynent.' : 'Dodano nowy kontynent.', 'success')
		router.push('/continents')
	} catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
	} finally {
		loadingForm.value = false
		await nextTick()
	}
}

onMounted(async () => {
    await Promise.all([fetchContinent()])
})
</script>

<template>
	<div class="continent-form">
        <!-- Sekcja nagłówka -->
		<section class="hero">
			<h1 class="hero-title">{{ isEdit ? 'Edycja kontynentu' : 'Nowy kontynent' }}</h1>
		</section>

        <!-- Ładowanie danych tylko w trybie edycji -->
		<div v-if="isEdit && loading" class="loading">Ładowanie danych kontynentu...</div>

        <!-- Błąd serwera tylko w trybie edycji -->
		<div v-else-if="isEdit && serverError" class="no-data">
			{{ errorMessage }}
		</div>

		<section v-else class="continent-box">
			<form @submit.prevent="submitForm">
				<label for="name">Nazwa kontynentu</label>
				<input id="name" v-model="name" type="text" placeholder="Euroazja" />

				<label for="description">Opis</label>
				<textarea id="description" v-model="description" rows="3" placeholder="Krótki opis kontynentu..."></textarea>

                <label for="area">Powierzchnia (km²)</label>
				<input id="area" v-model="area" type="number" placeholder="123456789" />

				<button type="submit" :disabled="loadingForm" class="continent-btn">
					{{ loadingForm
						? (isEdit ? 'Zapisywanie...' : 'Dodawanie...')
						: (isEdit ? 'Zapisz zmiany' : 'Dodaj kontynent') }}
				</button>
			</form>
		</section>
	</div>
</template>

<style scoped>
.continent-form {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
}

@media (min-width: 560px) {
    .continent-form {
        max-width: 500px;
    }
}

@media (min-width: 833px) {
    .continent-form {
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

.continent-box {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.continent-box label {
    font-weight: 600;
    color: var(--color-text);
}

.continent-box select,
.continent-box input,
.continent-box textarea {
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

.continent-box textarea {
    resize: none;
}

.continent-box select:focus,
.continent-box input:focus,
.continent-box textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.continent-box select:disabled,
.continent-box input:disabled,
.continent-box textarea:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.continent-btn {
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

.continent-btn:hover {
    background-color: var(--color-accent-hover);
}

.continent-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
}
</style>