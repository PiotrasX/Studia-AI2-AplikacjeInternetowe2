<script setup>
const props = defineProps({
	trips: {
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
	<div v-show="loading" class="loading">Ładowanie wycieczek...</div>

	<table v-show="!loading" class="trip-table">
		<thead>
			<tr>
				<th style="width: 25.7%;" @click="toggleSort('name')" class="sortable">
					Nazwa wycieczki
					<span v-if="sort === 'name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
				</th>
				<th style="width: 18%;" @click="toggleSort('continent_name')" class="sortable">
					Kontynent
					<span v-if="sort === 'continent_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
				</th>
				<th style="width: 24%;" @click="toggleSort('country_name')" class="sortable">
					Kraj
					<span v-if="sort === 'country_name'">{{ order === 'asc' ? '▲' : '▼' }}</span>
				</th>
				<th style="width: 10%;" @click="toggleSort('period')" class="sortable">
					Okres
					<span v-if="sort === 'period'">{{ order === 'asc' ? '▲' : '▼' }}</span>
				</th>
				<th style="width: 12%;" @click="toggleSort('price')" class="sortable">
					Cena
					<span v-if="sort === 'price'">{{ order === 'asc' ? '▲' : '▼' }}</span>
				</th>
				<th style="width: 10.3%;" class="no-sort">Link</th>
			</tr>
		</thead>

		<tbody>
			<tr v-for="trip in trips" :key="trip.id" class="table-row">
				<td>{{ trip.name }}</td>
				<td>{{ trip.continent_name }}</td>
				<td>{{ trip.country_name }}</td>
				<td>{{ trip.period }} dni</td>
				<td>{{ trip.price }} PLN</td>
				<td>
					<RouterLink :to="`/trips/${trip.id}`" class="link-btn">
						Szczegóły
					</RouterLink>
				</td>
			</tr>

			<tr v-if="!trips.length">
				<td colspan="6" class="no-data">Brak wyników do wyświetlenia.</td>
			</tr>
		</tbody>
	</table>
</template>

<style scoped>
.trip-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 1rem;
}

.trip-table {
	max-width: 100%;
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

.trip-table th,
.trip-table td {
	padding: 0.75rem 1rem;
	border: 1px solid var(--color-border);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.trip-table th {
	cursor: pointer;
	font-weight: 700;
	background-color: var(--color-bg-table-th);
	user-select: none;
}

.trip-table td:last-child,
.trip-table th:last-child {
	padding: 0;
	text-align: left;
}

.trip-table th.no-sort {
	cursor: default;
	padding: 0.75rem 1rem;
	text-align: left;
	color: var(--color-text);
}

.trip-table th.no-sort:hover {
	color: var(--color-text);
}

.trip-table tbody tr:nth-child(even) {
	background-color: var(--color-bg-table-td1);
}

.trip-table tbody tr:nth-child(odd) {
	background-color: var(--color-bg-table-td2);
}

.trip-table tbody tr:nth-child(even):hover {
	background-color: rgba(0, 0, 0, 0);
	transition: background-color var(--transition);
}

.trip-table tbody tr:nth-child(odd):hover {
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