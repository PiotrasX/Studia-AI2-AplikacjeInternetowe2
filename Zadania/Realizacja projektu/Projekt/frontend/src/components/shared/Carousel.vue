<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const activeIndex = ref(0)
const props = defineProps({
	images: {
		type: Array,
		default: () => ['carousel/no-image.png']
	},
	interval: {
		type: Number,
		default: 5000
	}
})

let timer = null

function nextSlide() {
	activeIndex.value = (activeIndex.value + 1) % props.images.length
}

function prevSlide() {
	activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

function goToSlide(i) {
	activeIndex.value = i
}

function startAuto() {
	stopAuto()
	timer = setInterval(nextSlide, props.interval)
}

function stopAuto() {
	if (timer) clearInterval(timer)
}

onMounted(startAuto)
onUnmounted(stopAuto)
</script>

<template>
	<div class="carousel" @mouseenter="stopAuto" @mouseleave="startAuto">
		<!-- Wrapper -->
		<div class="carousel-wrapper">
			<div class="carousel-track" :style="{ transform: `translateX(-${activeIndex * 100}%)` }">
				<div v-for="(image, i) in props.images" :key="i" class="carousel-item">
					<img :src="`/img/${image}`" alt="Slajd" class="carousel-image" />
				</div>
			</div>
		</div>

		<!-- Wskaźniki -->
		<div class="carousel-indicators">
			<button v-for="(image, index) in props.images" :key="index" class="carousel-indicator"
				:class="{ active: index === activeIndex }" @click="goToSlide(index)"></button>
		</div>

		<!-- Przyciski nawigacji -->
		<button type="button" class="carousel-prev" @click="prevSlide">
			<span class="carousel-arrow">
				<svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M5 1 1 5l4 4" />
				</svg>
			</span>
		</button>
		<button type="button" class="carousel-next" @click="nextSlide">
			<span class="carousel-arrow">
				<svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="m1 9 4-4-4-4" />
				</svg>
			</span>
		</button>
	</div>
</template>

<style scoped>
.carousel {
	position: relative;
	width: 100%;
	z-index: 10;
}

.carousel-wrapper {
	position: relative;
	overflow: hidden;
	width: 100%;
	height: 18rem;
	border-radius: 3rem;
	border: 2px solid var(--color-border);
}

@media (min-width: 833px) {
	.carousel-wrapper {
		height: 24rem;
	}
}

.carousel-track {
	display: flex;
	height: 100%;
	transition: transform 1s ease-in-out;
}

.carousel-item {
	width: 100%;
	flex-shrink: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #000;
}

.carousel-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center center;
	display: block;
}

.carousel-indicators {
	position: absolute;
	display: flex;
	bottom: 1.25rem;
	left: 50%;
	transform: translateX(-50%);
	gap: 0.75rem;
	z-index: 30;
}

.carousel-indicator {
	cursor: pointer;
	width: 0.75rem;
	height: 0.75rem;
	border-radius: 9999px;
	background-color: white;
	opacity: 0.6;
	transition: opacity 0.3s, transform 0.3s;
}

.carousel-indicator.active {
	opacity: 1;
	transform: scale(1.25);
}

.carousel-prev,
.carousel-next {
	position: absolute;
	top: 0;
	z-index: 30;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: 1rem;
	cursor: pointer;
	border: 2px solid var(--color-border);
	transition: background-color 0.3s;
}

.carousel-prev {
	left: 0;
	border-top-left-radius: 3rem;
	border-bottom-left-radius: 3rem;
	border-right: none;
}

.carousel-next {
	right: 0;
	border-top-right-radius: 3rem;
	border-bottom-right-radius: 3rem;
	border-left: none;
}

.carousel-prev:hover,
.carousel-next:hover {
	background: rgba(0, 0, 0, 0.75);
	border: 2px solid var(--color-border);
}

.carousel-prev:hover {
	border-top-left-radius: 3rem;
	border-bottom-left-radius: 3rem;
	border-right: none;
}

.carousel-next:hover {
	border-top-right-radius: 3rem;
	border-bottom-right-radius: 3rem;
	border-left: none;
}

.carousel-arrow {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 9999px;
	background-color: rgba(255, 255, 255, 0.25);
	backdrop-filter: blur(4px);
	transition: background-color 0.3s;
}

.carousel-arrow:hover {
	background-color: rgba(255, 255, 255, 0.5);
}

.arrow-icon {
	width: 1rem;
	height: 1rem;
	color: white;
}
</style>