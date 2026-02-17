<script setup>
import Carousel from '@/components/shared/Carousel.vue'
</script>

<template>
    <div class="home">
        <!-- Karuzela -->
        <section class="carousel-top">
            <Carousel :images="['carousel/carousel1.jpg', 'carousel/carousel2.jpg', 'carousel/carousel3.jpg']" />
        </section>

        <!-- Główne info -->
        <section class="hero">
            <h1 class="hero-title">URocze wycieczki – poznaj świat z nami!</h1>
            <p class="hero-subtitle">
                Zanurz się w podróżach pełnych emocji – od egzotycznych plaż po majestatyczne góry.
                <br></br>
                Odkrywaj świat krok po kroku, z pasją i ciekawością!
            </p>
        </section>

        <!-- Poboczne info -->
        <section class="info">
            <div class="info-box">
                <h2>Globalny zasięg</h2>
                <p>Nasza baza obejmuje wszystkie kontynenty i setki niezwykłych miejsc – od tropikalnych wysp po surowe
                    pustynie.</p>
            </div>
            <div class="info-box">
                <h2>Stworzone z myślą o Tobie</h2>
                <p>Przejrzysty interfejs, intuicyjna nawigacja i przyjemny design – podróżowanie jeszcze nigdy nie było
                    tak proste.</p>
            </div>
            <div class="info-box">
                <h2>Wiarygodne źródło informacji</h2>
                <p>Każda wycieczka oparta jest na sprawdzonych danych i aktualnych rekomendacjach – zwiedzaj bez stresu
                    i z pewnością.</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.home {
    display: flex;
    justify-self: center;
    flex-direction: column;
    gap: 4rem;
    padding: 2rem;
    max-width: 1200px;
    width: 100%;
}

.carousel-top {
    max-width: 1200px;
    margin: 0 auto;
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
    color: var(--color-text-muted);
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