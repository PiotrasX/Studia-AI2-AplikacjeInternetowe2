<script setup>
const props = defineProps({
    users: {
        type: Array,
        required: true
    },
    loading: Boolean,
    sort: String,
    order: String
})

const emit = defineEmits(['sort'])

const toggleSort = (column) => {
    emit('sort', column)
}
</script>

<template>
    <div v-show="loading" class="loading">Ładowanie użytkowników...</div>

    <table v-show="!loading" class="user-table">
        <thead>
            <tr>
                <th style="width: 19%;" @click="toggleSort('first_name')" class="sortable">
                    Imię
                    <span v-if="sort === 'first_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 19%;" @click="toggleSort('last_name')" class="sortable">
                    Nazwisko
                    <span v-if="sort === 'last_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 28%;" @click="toggleSort('email')" class="sortable">
                    E-mail
                    <span v-if="sort === 'email'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 19%;" @click="toggleSort('role')" class="sortable">
                    Rola
                    <span v-if="sort === 'role'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 15%;" class="no-sort">Link</th>
            </tr>
        </thead>

        <tbody>
            <tr v-for="user in users" :key="user.id" class="table-row">
                <td>{{ user.first_name }}</td>
                <td>{{ user.last_name }}</td>
                <td>{{ user.email }}</td>
                <td>
                    <span class="role" :class="{
                        admin: user.role === 'admin',
                        user: user.role === 'user'
                    }">
                        {{ user.role === 'admin' ? 'Administrator' : 'Użytkownik' }}
                    </span>
                </td>
                <td>
                    <RouterLink :to="`/users/${user.id}`" class="link-btn">
                        Szczegóły
                    </RouterLink>
                </td>
            </tr>

            <tr v-if="!users.length">
                <td colspan="5" class="no-data">Brak wyników do wyświetlenia.</td>
            </tr>
        </tbody>
    </table>
</template>

<style scoped>
.user-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1rem;
}

.user-table {
    max-width: 100%;
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.user-table th,
.user-table td {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-table th {
    cursor: pointer;
    font-weight: 700;
    background-color: var(--color-bg-table-th);
    user-select: none;
}

.user-table td:last-child,
.user-table th:last-child {
    padding: 0;
    text-align: left;
}

.user-table th.no-sort {
    cursor: default;
    padding: 0.75rem 1rem;
    text-align: left;
    color: var(--color-text);
}

.user-table th.no-sort:hover {
    color: var(--color-text);
}

.user-table tbody tr:nth-child(even) {
    background-color: var(--color-bg-table-td1);
}

.user-table tbody tr:nth-child(odd) {
    background-color: var(--color-bg-table-td2);
}

.user-table tbody tr:nth-child(even):hover {
    background-color: rgba(0, 0, 0, 0);
    transition: background-color var(--transition);
}

.user-table tbody tr:nth-child(odd):hover {
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
</style>