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
const userId = route.params.id || null

// Pola formularza
const first_name = ref('')
const last_name = ref('')
const email = ref('')
const role = ref('user')
const password = ref('')
const repeat_password = ref('')
const changePassword = ref(false)

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Pobranie danych pojedyńczeho użytkownika z backend'u
async function fetchUser() {
    if (!isEdit || !userId) {
        loading.value = false
        return
    }

    try {
        const res = await fetch(`http://localhost:3000/users/${userId}`, {
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
        if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania użytkownika.')

        const user = data.data
        first_name.value = user.first_name
        last_name.value = user.last_name
        email.value = user.email
        role.value = user.role
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

// Wysyłka formularza użytkownika
async function submitForm() {
    try {
        loadingForm.value = true

        if (!isEdit) {
            if (!password.value || !repeat_password.value) {
                toastStore.show("Brak wymaganych danych.", "warning")
                loadingForm.value = false
                return
            }
        }
        if (isEdit && changePassword.value) {
            if (!password.value || !repeat_password.value) {
                toastStore.show("Brak wymaganych danych.", "warning")
                loadingForm.value = false
                return
            }
        }
        if (password.value || repeat_password.value) {
            if (password.value !== repeat_password.value) {
                toastStore.show("Podane hasła nie są identyczne.", "warning")
                loadingForm.value = false
                return
            }
        }

        const payload = {
            first_name: first_name.value,
            last_name: last_name.value,
            email: email.value,
            role: role.value
        }
        if (password.value) {
            payload.password = password.value
        }
        const url = isEdit ? `http://localhost:3000/users/${userId}` : `http://localhost:3000/users`
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
            const message = isEdit ? 'Nie można edytować użytkownika.' : 'Nie można utworzyć nowego użytkownika.'
            toastStore.show(data.error || data.message || message, 'warning')
            return
        }
        if (!res.ok) {
            const message = isEdit ? 'Błąd podczas edytowania użytkownika.' : 'Błąd podczas tworzenia nowego użytkownika.'
            throw new Error(data.error || data.message || message)
        }

        toastStore.show(isEdit ? 'Zaktualizowano użytkownika.' : 'Dodano nowego użytkownika.', 'success')
        router.push('/users')
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        else toastStore.show(err.message, "error")
    } finally {
        loadingForm.value = false
        await nextTick()
    }
}

onMounted(async () => {
    await Promise.all([fetchUser()])
})
</script>

<template>
    <div class="user-form">
        <!-- Sekcja nagłówka -->
        <section class="hero">
            <h1 class="hero-title">{{ isEdit ? 'Edycja użytkownika' : 'Nowy użytkownik' }}</h1>
        </section>

        <!-- Ładowanie danych tylko w trybie edycji -->
        <div v-if="isEdit && loading" class="loading">Ładowanie danych użytkownika...</div>

        <!-- Błąd serwera tylko w trybie edycji -->
        <div v-else-if="isEdit && serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <!-- Formularz użytkownika, gdy nie ma błędu -->
        <section v-else class="user-box">
            <form @submit.prevent="submitForm">
                <label for="first_name">Imię</label>
                <input id="first_name" v-model="first_name" type="text" placeholder="Jan" />

                <label for="last_name">Nazwisko</label>
                <input id="last_name" v-model="last_name" type="text" placeholder="Kowalski" />

                <label for="email">E-mail</label>
                <input id="email" v-model="email" type="text" placeholder="jan@example.com" />

                <div v-if="isEdit" class="change-password-box">
                    <input id="changePassword" type="checkbox" v-model="changePassword" class="checkbox-changePassword" />
                    <label for="changePassword">Zmień hasło</label>
                </div>

                <div v-if="!isEdit || changePassword">
                    <label label for="password">Hasło</label>
                    <input id="password" v-model="password" type="password" placeholder="*****" />

                    <label for="repeat_password">Powtórz hasło</label>
                    <input id="repeat_password" v-model="repeat_password" type="password" placeholder="*****" />
                </div>

                <label for="role">Rola</label>
                <select id="role" v-model="role" required>
                    <option value="user">Użytkownik</option>
                    <option value="admin">Administrator</option>
                </select>

                <button type="submit" :disabled="loadingForm" class="user-btn">
                    {{ loadingForm
                        ? (isEdit ? 'Zapisywanie...' : 'Dodawanie...')
                        : (isEdit ? 'Zapisz zmiany' : 'Dodaj użytkownika') }}
                </button>
            </form>
        </section>
    </div>
</template>

<style scoped>
.user-form {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
}

@media (min-width: 560px) {
    .user-form {
        max-width: 500px;
    }
}

@media (min-width: 833px) {
    .user-form {
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

.user-box {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.user-box label {
    font-weight: 600;
    color: var(--color-text);
}

.user-box select,
.user-box input {
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

.user-box select:focus,
.user-box input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.user-box select:disabled,
.user-box input:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.user-box .change-password-box {
    display: flex;
    align-items: center;
}

.user-box .change-password-box .checkbox-changePassword {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    padding: 0px;
    cursor: pointer;
    accent-color: var(--color-accent);
}

.user-box .change-password-box label {
    margin-top: 0.35rem;
    margin-bottom: 1.25rem;
    font-weight: 600;
    padding-left: 8px;
    user-select: none;
    cursor: pointer;
    text-decoration: none;
    color: var(--color-text);
}

.user-btn {
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

.user-btn:hover {
    background-color: var(--color-accent-hover);
}

.user-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
}
</style>