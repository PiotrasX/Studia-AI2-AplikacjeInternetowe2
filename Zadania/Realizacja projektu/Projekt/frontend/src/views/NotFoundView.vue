<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
	<div class="home notfound">
		<!-- Główne info -->
		<section class="hero">
			<h1 class="hero-title">404 – Strona nie została znaleziona</h1>
			<p class="hero-subtitle">
				Wygląda na to, że trafiłeś w nieznane miejsce.
				<br></br>
				Ale spokojnie – każda podróż zaczyna się od jednego kliknięcia!
			</p>
			<RouterLink :to="{ name: 'home' }" class="hero-button">
				Powrót na stronę główną
			</RouterLink>
		</section>

		<!-- Poboczne info -->
		<section class="info">
			<div class="info-box">
				<h2>Nie martw się</h2>
				<p>Nasz świat jest ogromny – czasem łatwo się zgubić. Skorzystaj z nawigacji, by wrócić do podróży.</p>
			</div>
			<div class="info-box">
				<h2>Odkrywaj dalej</h2>
				<p>Przejrzyj dostępne wycieczki, poznaj kraje i kontynenty. Każdy błąd może być początkiem przygody!</p>
			</div>
		</section>
	</div>
</template>

<style scoped>
.home.notfound {
	display: flex;
	justify-self: center;
	flex-direction: column;
	gap: 4rem;
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
	margin-bottom: 1.25rem;
	color: var(--color-text-muted);
}

.hero-button {
	display: inline-block;
	padding: 0.75rem 1.25rem;
	font-weight: 600;
	text-decoration: none;
	color: white;
	border-radius: var(--radius-xmd);
	background-color: var(--color-accent);
	transition: background-color var(--transition), color var(--transition);
}

.hero-button:hover {
	background-color: var(--color-accent-hover);
}

.info {
	display: flex;
	flex-direction: column;
	gap: 2rem;
	margin: 0 auto;
	text-align: center;
}

.info-box h2 {
	font-size: 1.175rem;
	font-weight: bold;
	margin-bottom: 0.575rem;
}
</style>