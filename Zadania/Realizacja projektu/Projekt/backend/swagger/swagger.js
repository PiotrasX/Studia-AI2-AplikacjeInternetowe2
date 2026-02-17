// Import bibliotek
const swaggerJsdoc = require('swagger-jsdoc');

// Konfiguracja opisu REST API w formacie OpenAPI 3.0
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Projekt REST API & SPA: Zarządzanie Wycieczkami',
            version: '1.0',
            description: 'REST API do zarządzania wycieczkami',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./routes/*.js'],
};

// Generowanie specyfikacji Swaggera
const swaggerSpec = swaggerJsdoc(options);

// Eksport specyfikacji
module.exports = swaggerSpec;