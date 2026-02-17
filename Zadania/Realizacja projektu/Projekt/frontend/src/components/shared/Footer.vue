<script setup>

</script>

<template>
	<footer class="footer">
		<div class="footer-container">
			<div class="footer-top">
				<div class="footer-brand" @click="$router.push('/')">
					<span class="footer-logo">🌍 URocze&nbsp;wycieczki</span>
				</div>
				<ul class="footer-links">
					<li>
						<RouterLink to="#" class="footer-link">O nas</RouterLink>
					</li>
					<li>
						<RouterLink to="#" class="footer-link">Polityka prywatności</RouterLink>
					</li>
					<li>
						<RouterLink to="#" class="footer-link">Kontakt</RouterLink>
					</li>
				</ul>
			</div>

			<hr class="footer-separator" />

			<p class="footer-bottom">
				© 2026 URocze wycieczki™ – wszystkie prawa zastrzeżone
			</p>
		</div>
	</footer>
</template>

<style scoped>
.footer {
	background-color: var(--color-bg);
	color: var(--color-text);
	padding: 12px;
}

.footer-container {
	max-width: 1200px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.footer-top {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding-bottom: 2px;
}

.footer-brand {
	cursor: pointer;
	user-select: none;
}

.footer-logo {
	font-size: 1.3rem;
	font-weight: 600;
}

.footer-links {
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	justify-content: center;
	list-style: none;
	padding: 0;
	padding-right: 4px;
	margin: 0;
}

.footer-link {
	text-decoration: none;
	color: var(--color-text);
	font-weight: 500;
	transition: color 0.25s ease;
}

.footer-link:hover {
	color: var(--color-accent);
}

.footer-separator {
	border: none;
	border-top: 1px solid var(--color-border);
	margin: 0 4px;
}

.footer-bottom {
	text-align: center;
	font-size: 0.85rem;
	color: var(--color-text);
}

.footer-bottom-link {
	text-decoration: none;
	font-weight: 500;
	color: var(--color-text);
}

.footer-bottom-link:hover {
	color: var(--color-accent);
}

@media (min-width: 560px) {
	.footer-top {
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}
}
</style>