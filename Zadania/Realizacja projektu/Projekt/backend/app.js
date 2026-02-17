// Import bibliotek
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');
require('dotenv').config();

// Tworzenie backend'u
const app = express();
const PORT = 3000;

// Użycie Middleware'ów
app.use(cors()); // Możliwość połączeń z innych portów
app.use(bodyParser.json()); // Możliwość odczytywania JSON

// Import tras
const tripsRoutes = require('./routes/trips');
const countriesRoutes = require('./routes/countries');
const continentsRoutes = require('./routes/continents');
const reservationsRoutes = require('./routes/reservations');
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

// Obsługa endpointów
app.use('/trips', tripsRoutes);
app.use('/countries', countriesRoutes);
app.use('/continents', continentsRoutes);
app.use('/reservations', reservationsRoutes);
app.use('/users', usersRoutes);
app.use('/auth', authRoutes);

// Podpięcie Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Uruchomienie serwera
app.listen(PORT, () => {
	console.log(`Serwer działa: http://localhost:${PORT}`);
	console.log(`Swagger działa: http://localhost:${PORT}/api-docs`);
});