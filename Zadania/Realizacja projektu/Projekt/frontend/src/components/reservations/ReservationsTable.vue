<script setup>
const props = defineProps({
    reservations: {
        type: Array,
        required: true
    },
    loading: Boolean,
    sort: String,
    order: String
})

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

const emit = defineEmits(['sort'])

const toggleSort = (column) => {
    emit('sort', column)
}
</script>

<template>
    <div v-show="loading" class="loading">Ładowanie rezerwacji...</div>

    <table v-show="!loading" class="reservation-table">
        <thead>
            <tr>
                <th style="width: 22%;" @click="toggleSort('user_email')" class="sortable">
                    E-mail użytkownika
                    <span v-if="sort === 'user_email'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 21.8%;" @click="toggleSort('trip_name')" class="sortable">
                    Nazwa wycieczki
                    <span v-if="sort === 'trip_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 15%;" @click="toggleSort('reservation_date')" class="sortable">
                    Rezerwacja
                    <span v-if="sort === 'reservation_date'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 15%;" @click="toggleSort('trip_date')" class="sortable">
                    Wycieczka
                    <span v-if="sort === 'trip_date'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 14.2%;" @click="toggleSort('status')" class="sortable">
                    Status
                    <span v-if="sort === 'status'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 12%;" class="no-sort">Link</th>
            </tr>
        </thead>

        <tbody>
            <tr v-for="reservation in reservations" :key="reservation.id" class="table-row">
                <td>{{ reservation.user_email }}</td>
                <td>{{ reservation.trip_name }}</td>
                <td>{{ formatDate(reservation.reservation_date) }}</td>
                <td>{{ formatDate(reservation.trip_date) }}</td>
                <td :class="['status-label', reservation.status]">
                    {{ statusMap[reservation.status] || reservation.status }}
                </td>
                <td>
                    <RouterLink :to="`/reservations/${reservation.id}`" class="link-btn">
                        Szczegóły
                    </RouterLink>
                </td>
            </tr>

            <tr v-if="!reservations.length">
                <td colspan="6" class="no-data">Brak wyników do wyświetlenia.</td>
            </tr>
        </tbody>
    </table>
</template>

<style scoped>
.reservation-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1rem;
}

.reservation-table {
    max-width: 100%;
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.reservation-table th,
.reservation-table td {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.reservation-table th {
    cursor: pointer;
    font-weight: 700;
    background-color: var(--color-bg-table-th);
    user-select: none;
}

.reservation-table td:last-child,
.reservation-table th:last-child {
    padding: 0;
    text-align: left;
}

.reservation-table th.no-sort {
    cursor: default;
    padding: 0.75rem 1rem;
    text-align: left;
    color: var(--color-text);
}

.reservation-table th.no-sort:hover {
    color: var(--color-text);
}

.reservation-table tbody tr:nth-child(even) {
    background-color: var(--color-bg-table-td1);
}

.reservation-table tbody tr:nth-child(odd) {
    background-color: var(--color-bg-table-td2);
}

.reservation-table tbody tr:nth-child(even):hover {
    background-color: rgba(0, 0, 0, 0);
    transition: background-color var(--transition);
}

.reservation-table tbody tr:nth-child(odd):hover {
    background-color: rgba(0, 0, 0, 0);
    transition: background-color var(--transition);
}

.sortable:hover {
    color: var(--color-accent);
}

.no-data {
    text-align: left !important;
    padding: 0.75rem 1rem !important;
    color: var(--color-text-muted);
    font-style: italic;
}

.loading {
    flex: 1;
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
    font-style: italic;
    font-size: 1.2rem;
    padding: 34.61px;
    color: var(--color-text-muted);
}

.link-btn {
    color: var(--color-accent-table);
    font-weight: 600;
    padding: 0.75rem 1rem;
    transition: color var(--transition);
}

.link-btn:hover {
    color: var(--color-accent-hover-table);
}

.status-label.oczekujacy {
	color: var(--color-status-oczekujacy);
	background-color: var(--bg-status-oczekujacy);
}

.status-label.zatwierdzony {
	color: var(--color-status-zatwierdzony);
	background-color: var(--bg-status-zatwierdzony);
}

.status-label.zakonczony {
	color: var(--color-status-zakonczony);
	background-color: var(--bg-status-zakonczony);
}

.status-label.anulowany {
	color: var(--color-status-anulowany);
	background-color: var(--bg-status-anulowany);
}
</style>