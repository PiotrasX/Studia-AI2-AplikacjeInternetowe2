<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/store/toastStore'
import { useUserStore } from '@/store/userStore'
import { getOwnProfile, updateOwnProfile, getReservationsByUser } from '@/services/api.js'

const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const reservations = ref([])

// Pola formularza
const profile = ref({
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    role: ''
})
const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    repeat_password: ''
})
const changePassword = ref(false)
const changeUserData = ref(false)

const errorMessage = ref('')
const serverError = ref(false)
const loading = ref(true)
const loadingForm = ref(false)

// Wybieranie obrazka na podstawie ID
function getUserImage(id) {
    const imgNumber = ((id - 1) % 10) + 1
    return `/img/users/user${imgNumber}.jpg`
}

// Formatowanie statusu
const statusMap = {
    oczekujacy: 'Oczekujący',
    zatwierdzony: 'Zatwierdzony',
    zakonczony: 'Zakończony',
    anulowany: 'Anulowany'
}

// Pobranie danych użytkownika
async function fetchProfile() {
    try {
        const data = await getOwnProfile()

        profile.value = data.data
        form.value.first_name = profile.value.first_name
        form.value.last_name = profile.value.last_name
        form.value.email = profile.value.email
    } catch (err) {
        serverError.value = true
        if (err instanceof TypeError && err.message === "Failed to fetch") {
            errorMessage.value = 'Serwer nie odpowiada, spróbuj ponownie później.'
            toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        } else if (err.status === 401) {
            toastStore.show(err.error || err.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            errorMessage.value = 'Brak tokenu autoryzacyjnego.'
        } else if (err.status === 403) {
            toastStore.show(err.error || err.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
        } else {
            errorMessage.value = err.message
            toastStore.show(err.message, "error")
        }
    } finally {
        loading.value = false
        await nextTick()
    }
}

// Pobranie rezerwacji użytkownika
async function fetchReservations() {
    try {
        const data = await getReservationsByUser(userStore.user.id)

        reservations.value = data.data || []
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
            errorMessage.value = 'Serwer nie odpowiada, spróbuj ponownie później.'
            toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        } else if (err.status === 401) {
            toastStore.show(err.error || err.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            errorMessage.value = 'Brak tokenu autoryzacyjnego.'
        } else if (err.status === 403) {
            toastStore.show(err.error || err.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
        } else {
            errorMessage.value = err.message
            toastStore.show(err.message, "error")
        }
    }
}

// Wysyłanie formularza profilu
async function submitForm() {
    try {
        loadingForm.value = true

        if (changePassword.value) {
            if (!password.value || !repeat_password.value) {
                toastStore.show("Brak wymaganych danych.", "warning")
                return
            }
            if (password.value !== repeat_password.value) {
                toastStore.show("Podane hasła nie są identyczne.", "warning")
                return
            }
        }

        const payload = {
            first_name: form.value.first_name,
            last_name: form.value.last_name,
            email: form.value.email
        }
        if (changePassword.value) {
            payload.password = password.value
        }

        const res = await updateOwnProfile(payload)

        if (res.token) userStore.setToken(res.token)
        if (res.user) userStore.setUser(res.user)

        await fetchProfile()

        toastStore.show('Profil zaktualizowany', 'success')
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
            errorMessage.value = 'Serwer nie odpowiada, spróbuj ponownie później.'
            toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
        } else if (err.status === 401) {
            toastStore.show(err.error || err.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            errorMessage.value = 'Brak tokenu autoryzacyjnego.'
        } else if (err.status === 403) {
            toastStore.show(err.error || err.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            errorMessage.value = 'Nieprawidłowy lub wygasły token autoryzacyjny.'
        } else if (err.status === 400) {
            toastStore.show(err.error || err.message || 'Brak jakichkolwiek danych.', 'warning')
            errorMessage.value = 'Brak jakichkolwiek danych.'
        } else {
            errorMessage.value = err.message
            toastStore.show(err.message, "error")
        }
    } finally {
        loadingForm.value = false
        await nextTick()
    }
}

onMounted(async () => {
    await fetchProfile()
    await fetchReservations()
})
</script>

<template>
    <div class="profile-view">
        <!-- Sekcja nagłówka -->
        <section class="hero">
            <h1 class="hero-title">Mój profil</h1>
        </section>

        <!-- Ładowanie danych -->
        <div v-if="loading" class="loading">Ładowanie danych profilu...</div>

        <!-- Błąd serwera -->
        <div v-else-if="serverError" class="no-data">
            {{ errorMessage }}
        </div>

        <!-- Profil użytkownika -->
        <div v-else class="profile-card">
            <img class="profile-img" :src="getUserImage(profile.id)" :alt="profile.first_name" />

            <div class="profile-info">
                <h2 class="profile-name">{{ profile.first_name }} {{ profile.last_name }}</h2>

                <ul class="profile-details">
                    <li><strong>Email: </strong> {{ profile.email }}</li>
                    <li><strong>Rola: </strong>
                        {{ profile.role === 'admin' ? 'Administrator' : profile.role === 'user' ? 'Użytkownik' : userStore.user.role }}
                    </li>
                </ul>

                <div class="line"></div>

                <div class="change-data-box">
                    <input id="changeUserData" type="checkbox" v-model="changeUserData"
                        class="checkbox-changeUserData" />
                    <label for="changeUserData">Zmień dane</label>
                </div>

                <div v-if="changeUserData" class="form-container">
                    <form @submit.prevent="submitForm">
                        <label for="first_name">Imię</label>
                        <input id="first_name" v-model="form.first_name" type="text" placeholder="Jan" />

                        <label for="last_name">Nazwisko</label>
                        <input id="last_name" v-model="form.last_name" type="text" placeholder="Kowalski" />

                        <label for="email">E-mail</label>
                        <input id="email" v-model="form.email" type="text" placeholder="jan@example.com" />

                        <div class="change-password-box">
                            <input id="changePassword" type="checkbox" v-model="changePassword"
                                class="checkbox-changePassword" />
                            <label for="changePassword">Zmień hasło</label>
                        </div>

                        <div v-if="changePassword">
                            <label label for="password">Hasło</label>
                            <input id="password" v-model="password" type="password" placeholder="*****" />

                            <label for="repeat_password">Powtórz hasło</label>
                            <input id="repeat_password" v-model="repeat_password" type="password" placeholder="*****" />
                        </div>

                        <button type="submit" :disabled="loadingForm" class="user-btn">
                            {{ loadingForm ? 'Zapisywanie...' : 'Zapisz zmiany' }}
                        </button>
                    </form>
                </div>

                <div class="line"></div>

                <h2 class="sub-title">Moje rezerwacje ({{ reservations.length }})</h2>

                <!-- Brak rezerwacji -->
                <div v-if="reservations.length === 0" class="no-reservations-box">
                    <p class="loading">Brak posiadanych rezerwacji</p>
                    <button class="go-trips-btn" @click="router.push('/trips')">Przeglądaj wycieczki</button>
                </div>

                <!-- Są rezerwacje -->
                <div v-else class="reservation-list">
                    <ul v-for="reservation in reservations" :key="reservation.id">
                        <li><strong>Nazwa wycieczki: </strong> {{ reservation.trip_name }}</li>
                        <li><strong>Data wycieczki: </strong> {{ reservation.trip_date }}</li>
                        <li><strong>Data rezerwacji: </strong> {{ reservation.reservation_date }}</li>
                        <li>
                            <strong>Status: </strong>
                            <span :class="['status-label', reservation.status]">
                                 {{ statusMap[reservation.status] || reservation.status }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.profile-view {
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

.profile-card {
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-box3);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    max-width: 700px;
    width: 100%;
}

.profile-img {
    width: 100%;
    border-bottom: 2px solid var(--color-border);
    height: auto;
    object-fit: cover;
    max-height: 420px;
}

@media (max-width: 832px) {
    .profile-img {
        max-height: 380px;
    }
}

@media (max-width: 768px) {
    .profile-img {
        max-height: 340px;
    }
}

@media (max-width: 704px) {
    .profile-img {
        max-height: 300px;
    }
}

@media (max-width: 640px) {
    .profile-img {
        max-height: 260px;
    }
}

@media (max-width: 559px) {
    .profile-img {
        max-height: 220px;
    }
}

.profile-info {
    padding: 1.5rem;
    gap: 1.25rem;
    display: flex;
    flex-direction: column;
}

.profile-name,
.sub-title {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text);
}

.sub-title {
    text-align: center;
}

@media (max-width: 559px) {
    .profile-name,
    .sub-title {
        font-size: 1.75rem;
    }
}

.profile-details,
.reservation-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    font-size: 1rem;
    line-height: 1.2;
}

.profile-details li strong {
    color: var(--color-strong);
}

.line {
    width: 100%;
    height: 2px;
    background: var(--color-border);
}

.form-container {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-box2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.form-container label {
    font-weight: 600;
    color: var(--color-text);
}

.form-container select,
.form-container input,
.profile-info input {
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

.form-container select:focus,
.form-container input:focus,
.profile-info input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.form-container select:disabled,
.form-container input:disabled,
.profile-info input:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.form-container .change-password-box,
.profile-info .change-data-box {
    display: flex;
    align-items: center;
}

.form-container .change-password-box .checkbox-changePassword,
.profile-info .change-data-box .checkbox-changeUserData {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    padding: 0px;
    cursor: pointer;
    accent-color: var(--color-accent);
}

.profile-info .change-data-box .checkbox-changeUserData {
    margin: 0;
}

.form-container .change-password-box label,
.profile-info .change-data-box label {
    margin-top: 0.35rem;
    margin-bottom: 1.25rem;
    font-weight: 600;
    padding-left: 8px;
    user-select: none;
    cursor: pointer;
    text-decoration: none;
    color: var(--color-text);
}

.profile-info .change-data-box label {
    margin: 0;
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

.no-reservations-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
}

.go-trips-btn {
    padding: 0.75rem 1.25rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    border: none;
    color: white;
    border-radius: var(--radius-md);
    background-color: var(--color-accent);
    transition: background-color var(--transition), color var(--transition);
}

.go-trips-btn:hover {
    background: var(--color-accent-hover);
}

.reservation-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.reservation-list ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 1rem;
    line-height: 1.25;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
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