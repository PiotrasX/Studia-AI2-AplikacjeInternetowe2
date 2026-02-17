const API_URL = 'http://localhost:3000'; // Adres backendu

// Funkcja do pobierania tokenu JWT z localStorage
function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Funkcja do obsługi odpowiedzi z backendu
async function handleResponse(response) {
	if (!response.ok) {
		let errorMessage = 'Błąd zapytania.'
		try {
			const data = await response.json()
			errorMessage = data.message || data.error || errorMessage
		} catch {
			const text = await response.text()
			if (text) errorMessage = text
		}

		const error = new Error(errorMessage)
		error.status = response.status
		throw error
	}

    const contentType = response.headers.get('content-type') || ''
    if (response.status === 204) return null
    if (contentType.includes('application/json')) return await response.json()
    return await response.text()
}

// Autoryzacja

// Rejestracja
export async function registerUser(data) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Logowanie
export async function loginUser(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return await handleResponse(res);
}

// Wylogowanie
export async function logoutUser() {
    const res = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Weryfikacja tokenu JWT
export async function verifyAuthToken() {
    const res = await fetch(`${API_URL}/auth/verify`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Użytkownicy

// Pobranie wszystkich użytkowników
export async function getAllUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/users?${query}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Pobranie jednego użytkownika
export async function getUser(id) {
    const res = await fetch(`${API_URL}/users/${id}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Dodanie nowego użytkownika
export async function addUser(data) {
    const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Aktualizacja użytkownika
export async function updateUser(id, data) {
    const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Usunięcie użytkownika
export async function deleteUser(id) {
    const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Pobranie własnych danych zalogowanego użytkownika
export async function getOwnProfile() {
	const res = await fetch(`${API_URL}/users/profile/me`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Aktualizacja własnych danych zalogowanego użytkownika
export async function updateOwnProfile(data) {
	const res = await fetch(`${API_URL}/users/profile/me`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data),
	});
	return await handleResponse(res);
}

// Kontynenty

// Pobranie wszystkich kontynentów
export async function getAllContinents(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/continents?${query}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Pobranie jednego kontynentu
export async function getContinent(id) {
    const res = await fetch(`${API_URL}/continents/${id}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Dodanie nowego kontynentu
export async function addContinent(data) {
    const res = await fetch(`${API_URL}/continents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Aktualizacja kontynentu
export async function updateContinent(id, data) {
    const res = await fetch(`${API_URL}/continents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Usunięcie kontynentu
export async function deleteContinent(id) {
    const res = await fetch(`${API_URL}/continents/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Kraje

// Pobranie wszystkich krajów
export async function getAllCountries(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/countries?${query}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Pobranie jednego kraju
export async function getCountry(id) {
    const res = await fetch(`${API_URL}/countries/${id}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Dodanie nowego kraju
export async function addCountry(data) {
    const res = await fetch(`${API_URL}/countries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Aktualizacja kraju
export async function updateCountry(id, data) {
    const res = await fetch(`${API_URL}/countries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Usunięcie kraju
export async function deleteCountry(id) {
    const res = await fetch(`${API_URL}/countries/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Wycieczki

// Pobranie wszystkich wycieczek
export async function getAllTrips(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/trips?${query}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Pobranie jednej wycieczki
export async function getTrip(id) {
    const res = await fetch(`${API_URL}/trips/${id}`, {
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Dodanie nowej wycieczki
export async function addTrip(data) {
    const res = await fetch(`${API_URL}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Aktualizacja wycieczki
export async function updateTrip(id, data) {
    const res = await fetch(`${API_URL}/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return await handleResponse(res);
}

// Usunięcie wycieczki
export async function deleteTrip(id) {
    const res = await fetch(`${API_URL}/trips/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return await handleResponse(res);
}

// Rezerwacje

// Pobranie wszystkich rezerwacji
export async function getAllReservations(params = {}) {
	const query = new URLSearchParams(params).toString();
	const res = await fetch(`${API_URL}/reservations?${query}`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Pobranie jednej rezerwacji
export async function getReservation(id) {
	const res = await fetch(`${API_URL}/reservations/${id}`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Dodanie nowej rezerwacji
export async function addReservation(data) {
	const res = await fetch(`${API_URL}/reservations`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data),
	});
	return await handleResponse(res);
}

// Aktualizacja rezerwacji
export async function updateReservation(id, data) {
	const res = await fetch(`${API_URL}/reservations/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data),
	});
	return await handleResponse(res);
}

// Usunięcie rezerwacji
export async function deleteReservation(id) {
	const res = await fetch(`${API_URL}/reservations/${id}`, {
		method: 'DELETE',
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Pobranie liczby rezerwacji wycieczki
export async function getReservationsCountByTrip(tripId) {
	const res = await fetch(`${API_URL}/reservations/count/trip/${tripId}`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Pobranie liczby rezerwacji użytkownika
export async function getReservationsCountByUser(userId) {
	const res = await fetch(`${API_URL}/reservations/count/user/${userId}`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Pobranie wszystkich rezerwacji użytkownika
export async function getReservationsByUser(userId) {
	const res = await fetch(`${API_URL}/reservations/user/${userId}`, {
		headers: { ...getAuthHeader() },
	});
	return await handleResponse(res);
}

// Rezerwacja wycieczki przez zalogowanego użytkownika
export async function bookTrip(data) {
	const res = await fetch(`${API_URL}/reservations/book`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data),
	});
	return await handleResponse(res);
}