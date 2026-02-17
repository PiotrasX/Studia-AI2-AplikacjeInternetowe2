<script setup>
const props = defineProps({
    countries: {
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
    <div v-show="loading" class="loading">Ładowanie krajów...</div>

    <table v-show="!loading" class="country-table">
        <thead>
            <tr>
                <th style="width: 29%;" @click="toggleSort('name')" class="sortable">
                    Kraj
                    <span v-if="sort === 'name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 21.9%;" @click="toggleSort('continent_name')" class="sortable">
                    Kontynent
                    <span v-if="sort === 'continent_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 21%;" @click="toggleSort('area')" class="sortable">
                    Powierzchnia
                    <span v-if="sort !== 'area'">(km²)</span>
                    <span v-if="sort === 'area'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 16%;" @click="toggleSort('population')" class="sortable">
                    Ludność
                    <span v-if="sort === 'population'">{{ order === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th style="width: 12.1%;" class="no-sort">Link</th>
            </tr>
        </thead>

        <tbody>
            <tr v-for="country in countries" :key="country.id" class="table-row">
                <td>{{ country.name }}</td>
                <td>{{ country.continent_name }}</td>
                <td>{{ country.area ? country.area.toLocaleString() : '—' }}</td>
                <td>{{ country.population ? country.population.toLocaleString() : '—' }}</td>
                <td>
                    <RouterLink :to="`/countries/${country.id}`" class="link-btn">
                        Szczegóły
                    </RouterLink>
                </td>
            </tr>

            <tr v-if="!countries.length">
                <td colspan="5" class="no-data">Brak wyników do wyświetlenia.</td>
            </tr>
        </tbody>
    </table>
</template>

<style scoped>
.country-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1rem;
}

.country-table {
    max-width: 100%;
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.country-table th,
.country-table td {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.country-table th {
    cursor: pointer;
    font-weight: 700;
    background-color: var(--color-bg-table-th);
    user-select: none;
}

.country-table td:last-child,
.country-table th:last-child {
    padding: 0;
    text-align: left;
}

.country-table th.no-sort {
    cursor: default;
    padding: 0.75rem 1rem;
    text-align: left;
    color: var(--color-text);
}

.country-table th.no-sort:hover {
    color: var(--color-text);
}

.country-table tbody tr:nth-child(even) {
    background-color: var(--color-bg-table-td1);
}

.country-table tbody tr:nth-child(odd) {
    background-color: var(--color-bg-table-td2);
}

.country-table tbody tr:nth-child(even):hover {
    background-color: rgba(0, 0, 0, 0);
    transition: background-color var(--transition);
}

.country-table tbody tr:nth-child(odd):hover {
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