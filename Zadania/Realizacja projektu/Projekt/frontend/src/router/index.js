import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '@/views/HomeView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import ProfileView from '@/views/profile/ProfileView.vue';
import ContinentsView from '@/views/continents/ContinentsView.vue';
import ContinentView from '@/views/continents/ContinentView.vue';
import ContinentForm from '@/views/continents/ContinentForm.vue';
import CountriesView from '@/views/countries/CountriesView.vue';
import CountryView from '@/views/countries/CountryView.vue';
import CountryForm from '@/views/countries/CountryForm.vue';
import TripsView from '@/views/trips/TripsView.vue';
import TripView from '@/views/trips/TripView.vue';
import TripForm from '@/views/trips/TripForm.vue';
import UsersView from '@/views/users/UsersView.vue';
import UserView from '@/views/users/UserView.vue';
import UserForm from '@/views/users/UserForm.vue';
import ReservationsView from '@/views/reservations/ReservationsView.vue';
import ReservationView from '@/views/reservations/ReservationView.vue';
import ReservationForm from '@/views/reservations/ReservationForm.vue';

import { useUserStore } from '@/store/userStore'
import { useToastStore } from '@/store/toastStore'

function getLastAllowedRoute() {
	return sessionStorage.getItem('lastAllowedRoute') || '/'
}

function setLastAllowedRoute(path) {
	sessionStorage.setItem('lastAllowedRoute', path)
}

const routes = [
	{ path: '/', name: 'home', component: HomeView },
	{ path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },

	// Autoryzacja
	{ path: '/login', name: 'login', component: LoginView, meta: { requiresGuest: true } },
	{ path: '/register', name: 'register', component: RegisterView, meta: { requiresGuest: true } },
	
	// Profil użytkownika
	{ path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },

	// Kontynenty
	{ path: '/continents', name: 'continents', component: ContinentsView },
	{ path: '/continents/:id', name: 'continent', component: ContinentView },
	{ path: '/continents/add', name: 'continent-add', component: ContinentForm, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/continents/edit/:id', name: 'continent-edit', component: ContinentForm, meta: { requiresAuth: true, requiresAdmin: true }, props: true },

	// Kraje
	{ path: '/countries', name: 'countries', component: CountriesView },
	{ path: '/countries/:id', name: 'country', component: CountryView },
	{ path: '/countries/add', name: 'country-add', component: CountryForm, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/countries/edit/:id', name: 'country-edit', component: CountryForm, meta: { requiresAuth: true, requiresAdmin: true }, props: true },

	// Wycieczki
	{ path: '/trips', name: 'trips', component: TripsView },
	{ path: '/trips/:id', name: 'trip', component: TripView },
	{ path: '/trips/add', name: 'trip-add', component: TripForm, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/trips/edit/:id', name: 'trip-edit', component: TripForm, meta: { requiresAuth: true, requiresAdmin: true }, props: true },

	// Użytkownicy
	{ path: '/users', name: 'users', component: UsersView, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/users/:id', name: 'user', component: UserView, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/users/add', name: 'user-add', component: UserForm, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/users/edit/:id', name: 'user-edit', component: UserForm, meta: { requiresAuth: true, requiresAdmin: true }, props: true },

	// Rezerwacje
	{ path: '/reservations', name: 'reservations', component: ReservationsView, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/reservations/:id', name: 'reservation', component: ReservationView, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/reservations/add', name: 'reservation-add', component: ReservationForm, meta: { requiresAuth: true, requiresAdmin: true } },
	{ path: '/reservations/edit/:id', name: 'reservation-edit', component: ReservationForm, meta: { requiresAuth: true, requiresAdmin: true }, props: true }
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) return savedPosition
		if (to.fullPath === from.fullPath) return false
		return { top: 0 }
	}
})

router.beforeEach((to, from, next) => {
	const userStore = useUserStore()
	const toastStore = useToastStore()

	const isAuthenticated = !!userStore.token
	const isAdmin = userStore.user?.role === 'admin'

	// Automatyczne wylogowanie gdy wygaśnie token
	if (isAuthenticated) {
		try {
			const tokenPayload = JSON.parse(atob(userStore.token.split('.')[1]))
			const isExpired = tokenPayload.exp * 1000 < Date.now()

			if (isExpired) {
				userStore.logout()
				toastStore.show('Wygasły token autoryzacyjny. Zaloguj się ponownie.', 'warning')
				return next('/login')
			}
		} catch (err) {
			userStore.logout()
			toastStore.show('Nieprawidłowy token autoryzacyjny. Zaloguj się ponownie.', 'error')
			return next('/login')
		}
	}

	// Trasa wymaga logowania, użytkownik jest wylogowany
	if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
		toastStore.show('Musisz być zalogowany.', 'warning')
		return next(getLastAllowedRoute())
	}

	// Trasa wymaga roli administratora, użytkownik nie jest administratorem
	if (to.matched.some(record => record.meta.requiresAdmin) && !isAdmin) {
		toastStore.show('Nie posiadasz uprawnień administratora.', 'warning')
		return next(getLastAllowedRoute())
	}

	// Trasa dostępna tylko dla niezalogowanych
	if (to.matched.some(record => record.meta.requiresGuest) && isAuthenticated) {
		toastStore.show('Jesteś już zalogowany.', 'warning')
		return next(getLastAllowedRoute())
	}

	// Reszta działa normalnie
	setLastAllowedRoute(to.fullPath)
	next()
})

export default router;