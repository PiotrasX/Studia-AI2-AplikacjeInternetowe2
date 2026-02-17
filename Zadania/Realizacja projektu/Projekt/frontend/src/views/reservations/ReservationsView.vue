<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/store/toastStore'
import { useUserStore } from '@/store/userStore'
import ReservationsTable from '@/components/reservations/ReservationsTable.vue'

let lastScrollY = 0

const router = useRouter()
const toastStore = useToastStore()
const userStore = useUserStore()

const isAdmin = computed(() => userStore.isAdmin)

const userEmails = ref([])
const reservations = ref([])
const loading = ref(true)
const loadingPDF = ref(false)

// Sortowanie, wyszukiwanie, paginacja
const search = ref('')
const sort = ref('id')
const order = ref('asc')
const page = ref(1)
const limit = ref(10)
const totalPages = ref(1)
const totalCount = ref(0)
const selectedStatus = ref('')
const selectedUserEmail = ref('')

onBeforeUnmount(() => {
    lastScrollY = window.scrollY
})

onMounted(() => {
    window.scrollTo(0, lastScrollY)
})

// Funkcja do pobrania nagłówka autoryzacji
function getAuthHeader() {
    const token = userStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Pobranie wszystkich rezerwacji z backend'u
async function fetchReservations() {
    try {
        lastScrollY = window.scrollY
        loading.value = true

        const params = new URLSearchParams({
            search: search.value,
            sort: sort.value,
            order: order.value,
            page: page.value,
            limit: limit.value
        })
        if (selectedStatus.value) params.append('status', selectedStatus.value)
        if (selectedUserEmail.value) params.append('user_email', selectedUserEmail.value)
        const res = await fetch(`http://localhost:3000/reservations?${params.toString()}`, {
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

        const countParams = new URLSearchParams({
            search: search.value,
            limit: 9999
        })
        if (selectedStatus.value) countParams.append('status', selectedStatus.value)
        if (selectedUserEmail.value) countParams.append('user_email', selectedUserEmail.value)
        const allRes = await fetch(`http://localhost:3000/reservations?${countParams.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        })
        const allData = await allRes.json()
        if (allRes.status === 401) {
            toastStore.show(allData.error || allData.message || 'Brak tokenu autoryzacyjnego.', 'warning')
            return
        }
        if (allRes.status === 403) {
            toastStore.show(allData.error || allData.message || 'Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            return
        }
        if (!allRes.ok) throw new Error(allData.error || allData.message || 'Błąd podczas pobierania rezerwacji.')

        totalCount.value = allData.data?.length || 0
        totalPages.value = Math.max(1, Math.ceil(totalCount.value / limit.value))
    } catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
    } finally {
        loading.value = false
        await nextTick()
        window.scrollTo(0, lastScrollY)
    }
}

// Pobranie wszystkich użytkowników z backend'u
async function fetchUserEmails() {
	try {
        const res = await fetch('http://localhost:3000/reservations?limit=9999', {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        })
        const data = await res.json()
		if (!res.ok) throw new Error(data.error || data.message || 'Błąd podczas pobierania użytkowników.')

        const emails = [...new Set((data.data || []).map(r => r.user_email))]
		userEmails.value = emails
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
	}
}

// Sortowanie
function toggleSort(column) {
    if (sort.value === column) {
        order.value = order.value === 'asc' ? 'desc' : 'asc'
    } else {
        sort.value = column
        order.value = 'asc'
    }
    fetchReservations()
}

// Paginacja
function changeLimit(event) {
    limit.value = Number(event.target.value)
    page.value = 1
    fetchReservations()
}

// Następna strona
function nextPage() {
    if (page.value < totalPages.value) {
        page.value++
        fetchReservations()
    }
}

// Poprzednia strona
function prevPage() {
    if (page.value > 1) {
        page.value--
        fetchReservations()
    }
}

// Przeniesienie do strony dodawania rezerwacji
function goToAddReservation() {
    router.push('/reservations/add')
}

// Pobieranie raportu PDF
async function downloadPDF() {
    try {
		loadingPDF.value = true

        const params = new URLSearchParams({
            search: search.value,
            sort: sort.value,
            order: order.value
        });
        if (selectedStatus.value) params.append('status', selectedStatus.value)
        if (selectedUserEmail.value) params.append('user_email', selectedUserEmail.value)
        const res = await fetch(`http://localhost:3000/reservations/report/pdf?${params.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        if (res.status === 401) {
            toastStore.show('Brak tokenu autoryzacyjnego.', 'warning')
            return
        }
        if (res.status === 403) {
            toastStore.show('Nieprawidłowy lub wygasły token autoryzacyjny.', 'warning')
            return
        }
        if (!res.ok) throw new Error('Błąd podczas tworzenia raportu PDF.')
        
		const a = document.createElement("a");
        a.href = url;
        a.download = "reservations_report.pdf";
        a.click();
        window.URL.revokeObjectURL(url);

        toastStore.show("Raport PDF dla rezerwacji pobrany.", "success");
    } catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") toastStore.show("Serwer nie odpowiada, spróbuj ponownie później.", "error")
		else toastStore.show(err.message, "error")
    } finally {
        loadingPDF.value = false
        await nextTick()
    }
}

watch(search, async () => {
    page.value = 1
    await fetchReservations()
})

watch(selectedStatus, async () => {
    page.value = 1
    await fetchReservations()
})

watch(selectedUserEmail, async () => {
    page.value = 1
    await fetchReservations()
})

onMounted(async () => {
    await fetchUserEmails()
    await fetchReservations()
})
</script>

<template>
    <div class="reservations">
        <!-- Główny opis -->
        <section class="hero">
            <div class="hero-header">
                <h1 class="hero-title">Rezerwacje</h1>
            </div>
            <p class="hero-subtitle">
                Lista wszystkich dokonanych rezerwacji – sprawdź kto, co i kiedy zarezerwował.
            </p>
            <div class="hero-admin-btn">
                <button v-if="isAdmin" @click="goToAddReservation" class="add-btn">Dodaj rezerwację</button>
				<button v-if="isAdmin" @click="downloadPDF" :disabled="loadingPDF" class="add-btn">{{ loadingPDF ? "Generowanie PDF..." : "Pobierz raport PDF" }}</button>
            </div>
        </section>

        <!-- Filtry -->
        <section class="filters">
            <div class="search-div">
                <input v-model="search" type="text" placeholder="Szukaj po adresie e-mail użytkownika, nazwie wycieczki lub statusie" class="filter-input" />
            </div>

            <div class="filters-div">
                <select v-model="selectedUserEmail" class="filter-select">
                    <option value="">Wszyscy użytkownicy</option>
                    <option v-for="email in userEmails" :key="email" :value="email">{{ email }}</option>
                </select>

                <select v-model="selectedStatus" class="filter-select">
                    <option value="">Wszystkie statusy</option>
                    <option value="oczekujacy">Oczekujący</option>
                    <option value="zatwierdzony">Zatwierdzony</option>
                    <option value="zakonczony">Zakończony</option>
                    <option value="anulowany">Anulowany</option>
                </select>

                <select v-model="limit" @change="changeLimit" class="filter-select">
                    <option value="5">5 rezerwacji na stronę</option>
                    <option value="10">10 rezerwacji na stronę</option>
                    <option value="20">20 rezerwacji na stronę</option>
                    <option value="30">30 rezerwacji na stronę</option>
                    <option value="50">50 rezerwacji na stronę</option>
                </select>
            </div>
        </section>

        <!-- Tabela -->
        <section class="table-section">
            <ReservationsTable :reservations="reservations" :loading="loading" :sort="sort" :order="order" @sort="toggleSort" />
        </section>

        <!-- Paginacja -->
        <section class="pagination" v-if="!loading && reservations.length">
            <button class="page-btn" :disabled="page <= 1" @click="prevPage">← Poprzednia</button>
            <span class="page-info">Strona {{ page }} z {{ totalPages }}</span>
            <button class="page-btn" :disabled="page >= totalPages" @click="nextPage">Następna →</button>
        </section>
    </div>
</template>

<style scoped>
.reservations {
	display: flex;
	justify-self: center;
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
	margin-bottom: 1.25rem;
}

.hero-subtitle {
	font-size: 1.25rem;
	margin-bottom: 2rem;
	color: var(--color-text-muted);
}

.hero-admin-btn {
	display: flex;
	justify-content: center;
	gap: 2rem;
}

.add-btn {
    display: inline-block;
    margin-bottom: 2rem;
    min-width: 179px;
    padding: 0.75rem 1.25rem;
	font-weight: 600;
	cursor: pointer;
	text-decoration: none;
	color: white;
	border-radius: var(--radius-md);
	background-color: var(--color-accent);
	transition: background-color var(--transition), color var(--transition);
}

.add-btn:hover {
	background-color: var(--color-accent-hover);
}

.add-btn:disabled {
	background-color: var(--color-border);
	cursor: not-allowed;
}

.filters {
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: 1rem;
	justify-content: center;
	align-items: center;
}

.search-div,
.filters-div {
	display: flex;
	gap: 1rem;
	width: 100%;
}

.filter-input,
.filter-select {
	flex: 1 1 250px;
	min-width: 306px;
	padding: 0.75rem 1rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	font-size: 1rem;
	color: var(--color-text);
	background-color: var(--color-bg);
	cursor: pointer;
}

.filter-input:focus,
.filter-select:focus {
	outline: none;
	border-color: var(--color-accent);
	box-shadow: 0 0 0 2px rgba(4, 129, 218, 0.2);
}

.filter-select:disabled {
    background-color: var(--color-bg-disabled);
    color: var(--color-text-muted);
    cursor: not-allowed;
    opacity: 0.75;
}

.table-section {
	display: flex;
	flex-direction: column;
	min-width: 100%;
	max-width: 100%;
	width: 100%;
	box-sizing: border-box;
	background-color: var(--color-bg-table);
	border: 2px solid var(--color-border);
	border-radius: var(--radius-lg);
	padding: 1.25rem;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 1rem;
}

.page-btn {
	width: 135px;
	padding: 0.5rem 1rem;
	font-weight: 600;
	cursor: pointer;
	text-decoration: none;
	color: white;
	border-radius: var(--radius-md);
	background-color: var(--color-accent);
	transition: background-color var(--transition), color var(--transition);
}

.page-btn:hover {
	background-color: var(--color-accent-hover);
}

.page-btn:disabled {
	background-color: var(--color-border);
	cursor: not-allowed;
}

.page-info {
	font-weight: 600;
	padding: 0rem 0.25rem;
	color: var(--color-text-muted);
}
</style>