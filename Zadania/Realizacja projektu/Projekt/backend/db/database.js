// Import bibliotek
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Inicjalizacja bazy danych
const db = new sqlite3.Database('./db/trips.db');
db.run('PRAGMA foreign_keys = ON');

db.serialize(() => {
    // Tworzenie tabel jeśli nie istnieją

    // Tabela kontynentów
    db.run(`
        CREATE TABLE IF NOT EXISTS continents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            area INTEGER
        )
    `);

    // Tabela krajów
    db.run(`
        CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            area INTEGER,
            population INTEGER,
            continent_id INTEGER,
            FOREIGN KEY (continent_id) REFERENCES continents(id)
        )
    `);

    // Tabela wycieczek
    db.run(`
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            period INTEGER,
            price REAL,
            country_id INTEGER,
            FOREIGN KEY (country_id) REFERENCES countries(id)
        )
    `);

    // Tabela użytkowników
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user'
        )
    `);

    // Tabela rezerwacji
    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trip_id INTEGER NOT NULL,
            reservation_date TEXT DEFAULT (date('now', 'localtime')),
            trip_date TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('oczekujacy', 'zatwierdzony', 'anulowany', 'zakonczony')) DEFAULT 'oczekujacy',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
        )
    `);

    // Tabela logów
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Dodanie danych startowych jeśli nie istnieją

    // Definicja kontynentów
    const continents = [
        { name: 'Europa', description: 'Kontynent kultury, historii i zróżnicowanych krajobrazów.', area: 10180000 },
        { name: 'Azja', description: 'Największy i najbardziej zaludniony kontynent na Ziemi.', area: 44579000 },
        { name: 'Afryka', description: 'Kolebka ludzkości i kontynent o ogromnym bogactwie przyrody.', area: 30370000 },
        { name: 'Ameryka Północna', description: 'Zróżnicowany kontynent: od Arktyki po Karaiby.', area: 24709000 },
        { name: 'Ameryka Południowa', description: 'Dom Amazonii, Andów i fascynujących kultur.', area: 17840000 },
        { name: 'Australia', description: 'Najmniejszy kontynent, znany z unikalnej fauny.', area: 7692000 },
        { name: 'Antarktyda', description: 'Lodowy kontynent: najzimniejsze miejsce na Ziemi.', area: 13200000 }
    ];

    // Iteracja przez kontynenty
    continents.forEach(continent => {
        // Szukanie kontynentu, aby uniknąć duplikatów
        db.get(
            'SELECT id FROM continents WHERE name = ?',
            [continent.name],
            (err, row) => {
                // Jeśli kontynent nie istnieje
                if (!row) {
                    // Dodanie kontynentu
                    db.run(
                        'INSERT INTO continents (name, description, area) VALUES (?, ?, ?)',
                        [continent.name, continent.description, continent.area]
                    );
                }
            }
        );
    });

    // Definicja krajów
    const countries = [
        { name: 'Polska', description: 'Kraj w Europie Wschodniej.', area: 312679, population: 38000000, continent: 'Europa' },
        { name: 'Ukraina', description: 'Kraj w Europie Wschodniej.', area: 603500, population: 42000000, continent: 'Europa' },
        { name: 'Białoruś', description: 'Kraj w Europie Wschodniej.', area: 207600, population: 9400000, continent: 'Europa' },
        { name: 'Litwa', description: 'Kraj w Europie Północno-Wschodniej.', area: 65300, population: 2800000, continent: 'Europa' },
        { name: 'Łotwa', description: 'Kraj w Europie Północno-Wschodniej.', area: 64589, population: 1900000, continent: 'Europa' },
        { name: 'Estonia', description: 'Kraj w Europie Północno-Wschodniej.', area: 45227, population: 1300000, continent: 'Europa' },
        { name: 'Dania', description: 'Kraj w Europie Północnej.', area: 43094, population: 5800000, continent: 'Europa' },
        { name: 'Szwecja', description: 'Kraj w Europie Północnej.', area: 450295, population: 10300000, continent: 'Europa' },
        { name: 'Norwegia', description: 'Kraj w Europie Północnej.', area: 385207, population: 5400000, continent: 'Europa' },
        { name: 'Finlandia', description: 'Kraj w Europie Północnej.', area: 338424, population: 5500000, continent: 'Europa' },
        { name: 'Węgry', description: 'Kraj w Europie Środkowej.', area: 93028, population: 9700000, continent: 'Europa' },
        { name: 'Czechy', description: 'Kraj w Europie Środkowej.', area: 78865, population: 10700000, continent: 'Europa' },
        { name: 'Austria', description: 'Kraj w Europie Środkowej.', area: 83879, population: 8900000, continent: 'Europa' },
        { name: 'Słowacja', description: 'Kraj w Europie Środkowej.', area: 49037, population: 5400000, continent: 'Europa' },
        { name: 'Szwajcaria', description: 'Kraj w Europie Środkowej.', area: 41285, population: 8600000, continent: 'Europa' },
        { name: 'Grecja', description: 'Kraj w Europie Południowej.', area: 131957, population: 10400000, continent: 'Europa' },
        { name: 'Włochy', description: 'Kraj w Europie Południowej.', area: 301340, population: 60000000, continent: 'Europa' },
        { name: 'Hiszpania', description: 'Kraj w Europie Południowej.', area: 505990, population: 47000000, continent: 'Europa' },
        { name: 'Portugalia', description: 'Kraj w Europie Południowej.', area: 92212, population: 10200000, continent: 'Europa' },
        { name: 'Niemcy', description: 'Kraj w Europie Zachodniej.', area: 357022, population: 83000000, continent: 'Europa' },
        { name: 'Belgia', description: 'Kraj w Europie Zachodniej.', area: 30528, population: 11500000, continent: 'Europa' },
        { name: 'Francja', description: 'Kraj w Europie Zachodniej.', area: 551695, population: 67000000, continent: 'Europa' },
        { name: 'Holandia', description: 'Kraj w Europie Zachodniej.', area: 41543, population: 17400000, continent: 'Europa' },
        { name: 'Luksemburg', description: 'Małe państwo w Europie Zachodniej.', area: 2586, population: 630000, continent: 'Europa' },
        { name: 'Irlandia', description: 'Kraj na wyspie w Europie Północno-Zachodniej.', area: 70273, population: 5000000, continent: 'Europa' },
        { name: 'Wielka Brytania', description: 'Kraj na wyspie w Europie Północno-Zachodniej.', area: 242495, population: 67000000, continent: 'Europa' },
        { name: 'Islandia', description: 'Wyspa wulkanów i gejzerów na północnym Atlantyku.', area: 103000, population: 360000, continent: 'Europa' },
        { name: 'Rosja', description: 'Największy kraj na świecie, rozciągający się przez Europę i Azję.', area: 17098242, population: 146000000, continent: 'Europa' },
        { name: 'Turcja', description: 'Kraj na styku Europy i Azji.', area: 783356, population: 84000000, continent: 'Europa' },

        { name: 'Antarktyda', description: 'Kontynent bez stałej populacji.', area: 13200000, population: 0, continent: 'Antarktyda' },

        { name: 'Meksyk', description: 'Kraj w Ameryce Północnej.', area: 1964375, population: 128000000, continent: 'Ameryka Północna' },
        { name: 'Kanada', description: 'Kraj w Ameryce Północnej.', area: 9984670, population: 38000000, continent: 'Ameryka Północna' },
        { name: 'Stany Zjednoczone', description: 'Kraj w Ameryce Północnej.', area: 9834000, population: 331000000, continent: 'Ameryka Północna' },
        { name: 'Kuba', description: 'Wyspa w Ameryce Północnej.', area: 109884, population: 11300000, continent: 'Ameryka Północna' },
        { name: 'Jamajka', description: 'Wyspa w Ameryce Północnej.', area: 10991, population: 3000000, continent: 'Ameryka Północna' },
        { name: 'Haiti', description: 'Kraj na wyspie Hispaniola w Ameryce Północnej.', area: 27750, population: 11000000, continent: 'Ameryka Północna' },
        { name: 'Dominikana', description: 'Kraj na wyspie Hispaniola w Ameryce Północnej.', area: 48671, population: 10000000, continent: 'Ameryka Północna' },
        { name: 'Grenlandia', description: 'Największa wyspa na świecie, autonomiczny region Danii.', area: 2166086, population: 56000, continent: 'Ameryka Północna' },
        { name: 'Belize', description: 'Kraj w Ameryce Środkowej.', area: 22966, population: 400000, continent: 'Ameryka Północna' },
        { name: 'Panama', description: 'Kraj w Ameryce Środkowej.', area: 75417, population: 4300000, continent: 'Ameryka Północna' },
        { name: 'Salwador', description: 'Kraj w Ameryce Środkowej.', area: 21041, population: 6500000, continent: 'Ameryka Północna' },
        { name: 'Honduras', description: 'Kraj w Ameryce Środkowej.', area: 112492, population: 10000000, continent: 'Ameryka Północna' },
        { name: 'Gwatemala', description: 'Kraj w Ameryce Środkowej.', area: 108889, population: 18000000, continent: 'Ameryka Północna' },
        { name: 'Nikaragua', description: 'Kraj w Ameryce Środkowej.', area: 130373, population: 6500000, continent: 'Ameryka Północna' },
        { name: 'Kostaryka', description: 'Kraj w Ameryce Środkowej.', area: 51100, population: 5000000, continent: 'Ameryka Północna' },

        { name: 'Peru', description: 'Kraj w Ameryce Południowej.', area: 1285216, population: 33000000, continent: 'Ameryka Południowa' },
        { name: 'Ekwador', description: 'Kraj w Ameryce Południowej.', area: 283561, population: 17000000, continent: 'Ameryka Południowa' },
        { name: 'Urugwaj', description: 'Kraj w Ameryce Południowej.', area: 176215, population: 3500000, continent: 'Ameryka Południowa' },
        { name: 'Boliwia', description: 'Kraj w Ameryce Południowej.', area: 1098581, population: 11500000, continent: 'Ameryka Południowa' },
        { name: 'Paragwaj', description: 'Kraj w Ameryce Południowej.', area: 406752, population: 7000000, continent: 'Ameryka Południowa' },
        { name: 'Brazylia', description: 'Kraj w Ameryce Południowej.', area: 8516000, population: 213000000, continent: 'Ameryka Południowa' },
        { name: 'Argentyna', description: 'Kraj w Ameryce Południowej.', area: 2780400, population: 45000000, continent: 'Ameryka Południowa' },
        { name: 'Wenezuela', description: 'Kraj w północnej Ameryce Południowej.', area: 916445, population: 28000000, continent: 'Ameryka Południowa' },
        { name: 'Kolumbia', description: 'Kraj w północno-zachodniej Ameryce Południowej.', area: 1141748, population: 51000000, continent: 'Ameryka Południowa' },
        { name: 'Chile', description: 'Długi, wąski kraj wzdłuż zachodniego wybrzeża Ameryki Południowej.', area: 756102, population: 19000000, continent: 'Ameryka Południowa' },

        { name: 'Fidżi', description: 'Archipelag na Oceanii.', area: 18274, population: 900000, continent: 'Australia' },
        { name: 'Bahamy', description: 'Archipelag na Oceanii.', area: 13943, population: 400000, continent: 'Australia' },
        { name: 'Seszele', description: 'Archipelag na Oceanii.', area: 452, population: 100000, continent: 'Australia' },
        { name: 'Vanuatu', description: 'Archipelag na Oceanii.', area: 12189, population: 300000, continent: 'Australia' },
        { name: 'Malediwy', description: 'Archipelag na Oceanii.', area: 298, population: 500000, continent: 'Australia' },
        { name: 'Nowa Zelandia', description: 'Kraj w Oceanii.', area: 268021, population: 5000000, continent: 'Australia' },
        { name: 'Nowa Kaledonia', description: 'Francuski terytorium zamorskie na Oceanii.', area: 18575, population: 270000, continent: 'Australia' },
        { name: 'Papua-Nowa Gwinea', description: 'Kraj na wyspie Nowa Gwinea w Oceanii.', area: 462840, population: 9000000, continent: 'Australia' },
        { name: 'Australia', description: 'Kraj i kontynent.', area: 7692000, population: 25600000, continent: 'Australia' },

        { name: 'Laos', description: 'Kraj w Azji Południowo-Wschodniej.', area: 236800, population: 7000000, continent: 'Azja' },
        { name: 'Myanmar', description: 'Kraj w Azji Południowo-Wschodniej.', area: 676578, population: 54000000, continent: 'Azja' },
        { name: 'Wietnam', description: 'Kraj w Azji Południowo-Wschodniej.', area: 331212, population: 97000000, continent: 'Azja' },
        { name: 'Malezja', description: 'Kraj w Azji Południowo-Wschodniej.', area: 330803, population: 32000000, continent: 'Azja' },
        { name: 'Kambodża', description: 'Kraj w Azji Południowo-Wschodniej.', area: 181035, population: 16000000, continent: 'Azja' },
        { name: 'Tajlandia', description: 'Kraj w Azji Południowo-Wschodniej.', area: 513120, population: 70000000, continent: 'Azja' },
        { name: 'Filipiny', description: 'Archipelag w Azji Południowo-Wschodniej.', area: 300000, population: 110000000, continent: 'Azja' },
        { name: 'Indonezja', description: 'Archipelag w Azji Południowo-Wschodniej.', area: 1904569, population: 273000000, continent: 'Azja' },
        { name: 'Singapur', description: 'Miasto-państwo w Azji Południowo-Wschodniej.', area: 728, population: 5700000, continent: 'Azja' },
        { name: 'Nepal', description: 'Kraj w Azji Południowej.', area: 147516, population: 30000000, continent: 'Azja' },
        { name: 'Bhutan', description: 'Kraj w Azji Południowej.', area: 38394, population: 800000, continent: 'Azja' },
        { name: 'Pakistan', description: 'Kraj w Azji Południowej.', area: 881913, population: 220000000, continent: 'Azja' },
        { name: 'Bangladesz', description: 'Kraj w Azji Południowej.', area: 147570, population: 160000000, continent: 'Azja' },
        { name: 'Afganistan', description: 'Kraj w Azji Południowej.', area: 652230, population: 38000000, continent: 'Azja' },
        { name: 'Sri Lanka', description: 'Wyspa w Azji Południowej.', area: 65610, population: 21000000, continent: 'Azja' },
        { name: 'Iran', description: 'Kraj na Bliskim Wschodzie.', area: 1648195, population: 83000000, continent: 'Azja' },
        { name: 'Irak', description: 'Kraj na Bliskim Wschodzie.', area: 438317, population: 40000000, continent: 'Azja' },
        { name: 'Liban', description: 'Kraj na Bliskim Wschodzie.', area: 10452, population: 6800000, continent: 'Azja' },
        { name: 'Syria', description: 'Kraj na Bliskim Wschodzie.', area: 185180, population: 17000000, continent: 'Azja' },
        { name: 'Izrael', description: 'Kraj na Bliskim Wschodzie.', area: 22072, population: 9000000, continent: 'Azja' },
        { name: 'Jordania', description: 'Kraj na Bliskim Wschodzie.', area: 89342, population: 10000000, continent: 'Azja' },
        { name: 'Oman', description: 'Kraj na Półwyspie Arabskim.', area: 309500, population: 5100000, continent: 'Azja' },
        { name: 'Katar', description: 'Kraj na Półwyspie Arabskim.', area: 11586, population: 2900000, continent: 'Azja' },
        { name: 'Kuwejt', description: 'Kraj na Półwyspie Arabskim.', area: 17818, population: 4300000, continent: 'Azja' },
        { name: 'Arabia Saudyjska', description: 'Kraj na Półwyspie Arabskim.', area: 2149690, population: 35000000, continent: 'Azja' },
        { name: 'Zjednoczone Emiraty Arabskie', description: 'Kraj na Półwyspie Arabskim.', area: 83600, population: 9800000, continent: 'Azja' },
        { name: 'Bahrajn', description: 'Wyspiarski kraj na Półwyspie Arabskim.', area: 765, population: 1700000, continent: 'Azja' },
        { name: 'Japonia', description: 'Wyspiarski kraj w Azji Wschodniej.', area: 377975, population: 126000000, continent: 'Azja' },
        { name: 'Korea Północna', description: 'Kraj w Azji Wschodniej.', area: 120538, population: 25000000, continent: 'Azja' },
        { name: 'Korea Południowa', description: 'Kraj w Azji Wschodniej.', area: 100210, population: 52000000, continent: 'Azja' },
        { name: 'Mongolia', description: 'Kraj w Azji Środkowej.', area: 1564116, population: 3300000, continent: 'Azja' },
        { name: 'Kirgistan', description: 'Kraj w Azji Środkowej.', area: 199951, population: 6500000, continent: 'Azja' },
        { name: 'Kazachstan', description: 'Kraj w Azji Środkowej.', area: 2724900, population: 19000000, continent: 'Azja' },
        { name: 'Uzbekistan', description: 'Kraj w Azji Środkowej.', area: 447400, population: 34000000, continent: 'Azja' },
        { name: 'Tadżykistan', description: 'Kraj w Azji Środkowej.', area: 143100, population: 9000000, continent: 'Azja' },
        { name: 'Turkmenistan', description: 'Kraj w Azji Środkowej.', area: 488100, population: 6000000, continent: 'Azja' },
        { name: 'Armenia', description: 'Kraj w Azji Zachodniej.', area: 29743, population: 3000000, continent: 'Azja' },
        { name: 'Gruzja', description: 'Kraj na pograniczu Europy i Azji.', area: 69700, population: 3700000, continent: 'Azja' },
        { name: 'Azerbejdżan', description: 'Kraj na pograniczu Europy i Azji.', area: 86600, population: 10000000, continent: 'Azja' },
        { name: 'Indie', description: 'Najludniejszy kraj w Azji i na świecie.', area: 3287263, population: 1380000000, continent: 'Azja' },
        { name: 'Chiny', description: 'Drugi najludniejszy kraj na świecie.', area: 9596961, population: 1400000000, continent: 'Azja' },

        { name: 'Madagaskar', description: 'Wyspa u wybrzeży Afryki.', area: 587041, population: 28000000, continent: 'Afryka' },
        { name: 'Egipt', description: 'Kraj w Afryce.', area: 1002450, population: 102000000, continent: 'Afryka' },
        { name: 'RPA', description: 'Kraj w Afryce.', area: 1221037, population: 60000000, continent: 'Afryka' },
        { name: 'Maroko', description: 'Kraj w północno-zachodniej Afryce.', area: 446550, population: 36000000, continent: 'Afryka' },
        { name: 'Libia', description: 'Kraj w Afryce Północnej.', area: 1759540, population: 7000000, continent: 'Afryka' },
        { name: 'Tunezja', description: 'Kraj w Afryce Północnej.', area: 163610, population: 12000000, continent: 'Afryka' },
        { name: 'Algieria', description: 'Kraj w Afryce Północnej.', area: 2381741, population: 43000000, continent: 'Afryka' },
        { name: 'Czad', description: 'Kraj w Afryce Środkowej.', area: 1284000, population: 16000000, continent: 'Afryka' },
        { name: 'Kongo', description: 'Kraj w Afryce Środkowej.', area: 2344858, population: 90000000, continent: 'Afryka' },
        { name: 'Togo', description: 'Kraj w Afryce Zachodniej.', area: 56785, population: 8000000, continent: 'Afryka' },
        { name: 'Mali', description: 'Kraj w Afryce Zachodniej.', area: 1240000, population: 20000000, continent: 'Afryka' },
        { name: 'Niger', description: 'Kraj w Afryce Zachodniej.', area: 1267000, population: 24000000, continent: 'Afryka' },
        { name: 'Benin', description: 'Kraj w Afryce Zachodniej.', area: 112622, population: 12000000, continent: 'Afryka' },
        { name: 'Ghana', description: 'Kraj w Afryce Zachodniej.', area: 238533, population: 31000000, continent: 'Afryka' },
        { name: 'Gambia', description: 'Kraj w Afryce Zachodniej.', area: 11295, population: 2000000, continent: 'Afryka' },
        { name: 'Gwinea', description: 'Kraj w Afryce Zachodniej.', area: 245857, population: 13000000, continent: 'Afryka' },
        { name: 'Nigeria', description: 'Kraj w Afryce Zachodniej.', area: 923768, population: 206000000, continent: 'Afryka' },
        { name: 'Senegal', description: 'Kraj w Afryce Zachodniej.', area: 196722, population: 17000000, continent: 'Afryka' },
        { name: 'Liberia', description: 'Kraj w Afryce Zachodniej.', area: 111369, population: 5000000, continent: 'Afryka' },
        { name: 'Burkina Faso', description: 'Kraj w Afryce Zachodniej.', area: 272967, population: 21000000, continent: 'Afryka' },
        { name: 'Sierra Leone', description: 'Kraj w Afryce Zachodniej.', area: 71740, population: 8000000, continent: 'Afryka' },
        { name: 'Gwinea Bissau', description: 'Kraj w Afryce Zachodniej.', area: 36125, population: 2000000, continent: 'Afryka' },
        { name: 'Angola', description: 'Kraj w południowo-zachodniej Afryce.', area: 1246700, population: 30000000, continent: 'Afryka' },
        { name: 'Namibia', description: 'Kraj w południowo-zachodniej Afryce.', area: 825615, population: 2500000, continent: 'Afryka' },
        { name: 'Zambia', description: 'Kraj w południowej Afryce.', area: 752618, population: 18000000, continent: 'Afryka' },
        { name: 'Zimbabwe', description: 'Kraj w południowej Afryce.', area: 390757, population: 15000000, continent: 'Afryka' },
        { name: 'Botswana', description: 'Kraj w południowej Afryce.', area: 581730, population: 2400000, continent: 'Afryka' },
        { name: 'Kenia', description: 'Kraj we wschodniej Afryce.', area: 580367, population: 54000000, continent: 'Afryka' },
        { name: 'Uganda', description: 'Kraj we wschodniej Afryce.', area: 241038, population: 45000000, continent: 'Afryka' },
        { name: 'Rwanda', description: 'Kraj we wschodniej Afryce.', area: 26338, population: 13000000, continent: 'Afryka' },
        { name: 'Burundi', description: 'Kraj we wschodniej Afryce.', area: 27834, population: 12000000, continent: 'Afryka' },
        { name: 'Etiopia', description: 'Kraj we wschodniej Afryce.', area: 1104300, population: 120000000, continent: 'Afryka' },
        { name: 'Tanzania', description: 'Kraj we wschodniej Afryce.', area: 945087, population: 60000000, continent: 'Afryka' },
        { name: 'Malawi', description: 'Kraj w południowo-wschodniej Afryce.', area: 118484, population: 19000000, continent: 'Afryka' },
        { name: 'Mozambik', description: 'Kraj w południowo-wschodniej Afryce.', area: 801590, population: 30000000, continent: 'Afryka' }
    ];

    // Iteracja przez kraje
    setTimeout(() => {
        countries.forEach(country => {
            // Szukanie kraju, aby uniknąć duplikatów
            db.get(
                'SELECT id FROM countries WHERE name = ?',
                [country.name],
                (err, row) => {
                    // Jeśli kraj nie istnieje
                    if (!row) {
                        // Szukanie kontynentu, aby uzyskać jego ID
                        db.get(
                            'SELECT id FROM continents WHERE name = ?',
                            [country.continent],
                            (err, continentRow) => {
                                // Jeśli kontynent istnieje
                                if (continentRow) {
                                    // Dodanie kraju z powiązaniem do kontynentu
                                    db.run(
                                        'INSERT INTO countries (name, description, area, population, continent_id) VALUES (?, ?, ?, ?, ?)',
                                        [country.name, country.description, country.area, country.population, continentRow.id]
                                    );
                                }
                            }
                        );
                    }
                }
            );
        });
    }, 1000);

    // Definicja wycieczek
    const trips = [
        { name: 'Wakacje w Krakowie', description: 'Zwiedzanie starego miasta.', period: 3, price: 900.00, country: 'Polska' },
        { name: 'Góry Stołowe', description: 'Wędrówki po malowniczych górach.', period: 4, price: 1200.00, country: 'Polska' },
        { name: 'Mazury', description: 'Relaks nad jeziorami.', period: 5, price: 1300.00, country: 'Polska' },
        { name: 'Zakopane', description: 'Wypoczynek w polskich Tatrach.', period: 6, price: 1400.00, country: 'Polska' },
        { name: 'Trójmiasto', description: 'Relaks nad Bałtykiem.', period: 5, price: 1500.00, country: 'Polska' },
        { name: 'Wyprawa do Pekinu', description: 'Wielki Mur i Zakazane Miasto.', period: 7, price: 3400.00, country: 'Chiny' },
        { name: 'Wielki Mur Chiński', description: 'Zwiedzanie jednego z cudów świata.', period: 6, price: 2500.00, country: 'Chiny' },
        { name: 'Wyprawa do Szanghaju', description: 'Nowoczesne miasto nad rzeką Huangpu.', period: 5, price: 2400.00, country: 'Chiny' },
        { name: 'Wyprawa do Chengdu', description: 'Spotkanie z pandami i kultura Syczuanu.', period: 6, price: 2600.00, country: 'Chiny' },
        { name: 'Safari w Egipcie', description: 'Przygoda na pustyni i zwiedzanie starożytnych zabytków.', period: 5, price: 2700.00, country: 'Egipt' },
        { name: 'Piramidy w Gizie', description: 'Odkrywanie tajemnic starożytnych piramid.', period: 3, price: 1800.00, country: 'Egipt' },
        { name: 'Nieznany Kair', description: 'Odkrywanie tętniącej życiem stolicy Egiptu.', period: 4, price: 1600.00, country: 'Egipt' },
        { name: 'Starożytny Luksor', description: 'Zwiedzanie starożytnych świątyń i grobowców.', period: 4, price: 2000.00, country: 'Egipt' },
        { name: 'Wodny Asuan', description: 'Rejs po Nilu i zwiedzanie świątyń.', period: 5, price: 2200.00, country: 'Egipt' },
        { name: 'Wyprawa do Tokio', description: 'Nowoczesne miasto pełne kontrastów.', period: 7, price: 4000.00, country: 'Japonia' },
        { name: 'Zwiedzanie Kioto', description: 'Tradycyjna stolica Japonii z licznymi świątyniami.', period: 6, price: 3500.00, country: 'Japonia' },
        { name: 'NieOsaka', description: 'Kuchnia i kultura w sercu Japonii.', period: 5, price: 3000.00, country: 'Japonia' },
        { name: 'Toksyczna Hiroshima', description: 'Historia i odbudowa po II wojnie światowej.', period: 4, price: 2800.00, country: 'Japonia' },
        { name: 'Stara Nara', description: 'Starożytne miasto z licznymi świątyniami i jeleniami.', period: 3, price: 2500.00, country: 'Japonia' },
        { name: 'Wyprawa do Rzymu', description: 'Zwiedzanie starożytnych zabytków i renesansowej architektury.', period: 5, price: 3000.00, country: 'Włochy' },
        { name: 'Pływająca Wenecja', description: 'Romantyczne miasto na wodzie.', period: 4, price: 2800.00, country: 'Włochy' },
        { name: 'Florencja', description: 'Kolebka renesansu z licznymi dziełami sztuki.', period: 4, price: 2700.00, country: 'Włochy' },
        { name: 'Neapol i Pompeje', description: 'Historia i kuchnia południowych Włoch.', period: 5, price: 3200.00, country: 'Włochy' },
        { name: 'Mafijna Sycylia', description: 'Wyspa pełna historii, kultury i pięknych plaż.', period: 8, price: 5500.00, country: 'Włochy' },
        { name: 'Wyprawa do Paryża', description: 'Miasto miłości i sztuki.', period: 5, price: 3200.00, country: 'Francja' },
        { name: 'Luwr', description: 'Największe muzeum sztuki na świecie.', period: 3, price: 2000.00, country: 'Francja' },
        { name: 'Dolina Loary', description: 'Zamki i winnice w malowniczej okolicy.', period: 4, price: 2500.00, country: 'Francja' },
        { name: 'Lazurowe Wybrzeże', description: 'Piękne plaże i luksusowe kurorty.', period: 6, price: 4000.00, country: 'Francja' },
        { name: 'Wyprawa do Nowego Jorku', description: 'Miasto, które nigdy nie śpi.', period: 10, price: 7900.00, country: 'Stany Zjednoczone' },
        { name: 'Nocne Los Angeles', description: 'Miasto aniołów i przemysłu filmowego.', period: 8, price: 7300.00, country: 'Stany Zjednoczone' },
        { name: 'Nocne San Francisco', description: 'Most Golden Gate i malownicze wzgórza.', period: 7, price: 6000.00, country: 'Stany Zjednoczone' },
        { name: 'Kasynowe Las Vegas', description: 'Miasto rozrywki i kasyn.', period: 3, price: 2800.00, country: 'Stany Zjednoczone' },
        { name: 'Plażowe Miami', description: 'Plaże, słońce i kultura latynoska.', period: 5, price: 3200.00, country: 'Stany Zjednoczone' },
        { name: 'Wyprawa do Sydney', description: 'Ikoniczna Opera i piękne plaże.', period: 7, price: 6500.00, country: 'Australia' },
        { name: 'Wielka Rafa Koralowa', description: 'Nurkowanie i snorkeling w jednym z największych ekosystemów koralowych na świecie.', period: 6, price: 5100.00, country: 'Australia' },
        { name: 'Melbourne', description: 'Kultura, sztuka i sport w sercu Australii.', period: 5, price: 3500.00, country: 'Australia' },
        { name: 'Podróż do Rio de Janeiro', description: 'Karnawał, plaże i góra Corcovado.', period: 7, price: 5100.00, country: 'Brazylia' },
        { name: 'Lasy Amazonii', description: 'Eksploracja największego lasu deszczowego na świecie.', period: 3, price: 3900.00, country: 'Brazylia' },
        { name: 'Foz do Iguaçu', description: 'Spektakularne wodospady na granicy z Argentyną i Paragwajem.', period: 5, price: 4800.00, country: 'Brazylia' },
        { name: 'Przeprawa przez Kapsztad', description: 'Góra Stołowa i piękne plaże.', period: 7, price: 4400.00, country: 'RPA' },
        { name: 'Park Narodowy Krugera', description: 'Safari i obserwacja dzikich zwierząt.', period: 2, price: 800.00, country: 'RPA' },
        { name: 'Bogaty Dubaj', description: 'Luksus, nowoczesna architektura i pustynne safari.', period: 5, price: 11600.00, country: 'Zjednoczone Emiraty Arabskie' },
        { name: 'Nowoczesne Abu Zabi', description: 'Kultura, sztuka i nowoczesne atrakcje.', period: 4, price: 9700.00, country: 'Zjednoczone Emiraty Arabskie' },
        { name: 'Wyprawa do Delhi', description: 'Historia, kultura i kuchnia Indii.', period: 6, price: 3400.00, country: 'Indie' },
        { name: 'Agra i Tadź Mahal', description: 'Jedno z nowych siedmiu cudów świata.', period: 4, price: 3500.00, country: 'Indie' },
        { name: 'Różowy Jaipur', description: 'Różowe miasto z fortami i pałacami.', period: 4, price: 2100.00, country: 'Indie' },
        { name: 'Nocny Bangkok', description: 'Tętniące życiem miasto z pięknymi świątyniami.', period: 5, price: 3050.00, country: 'Tajlandia' },
        { name: 'Kultura Chiang Mai', description: 'Kultura północnej Tajlandii i górskie krajobrazy.', period: 4, price: 2850.00, country: 'Tajlandia' },
        { name: 'Starożytne Ayutthaya', description: 'Starożytne ruiny i historia Tajlandii.', period: 8, price: 7500.00, country: 'Tajlandia' },
        { name: 'Podróż do Singapuru', description: 'Nowoczesne miasto-państwo z unikalną kulturą.', period: 5, price: 3300.00, country: 'Singapur' },
        { name: 'Marina Bay Sands', description: 'Ikoniczny hotel i kasyno z niesamowitym widokiem.', period: 3, price: 2000.00, country: 'Singapur' },
        { name: 'Sentosa', description: 'Wyspa rozrywki z plażami i atrakcjami.', period: 4, price: 2500.00, country: 'Singapur' },
        { name: 'Ogród Botaniczny', description: 'Piękne ogrody i unikalna flora.', period: 2, price: 1500.00, country: 'Singapur' },
        { name: 'Chinatown i Little India', description: 'Kultura i kuchnia różnych społeczności.', period: 3, price: 1800.00, country: 'Singapur' },
        { name: 'Zwiedzanie Vancouver', description: 'Piękne krajobrazy i kultura na zachodnim wybrzeżu Kanady.', period: 6, price: 35600.00, country: 'Kanada' },
        { name: 'Ikoniczne Toronto', description: 'Multikulturowe miasto z ikoną CN Tower.', period: 9, price: 4480.00, country: 'Kanada' },
        { name: 'Francuskie Montreal', description: 'Kultura francuska w sercu Kanady.', period: 4, price: 3000.00, country: 'Kanada' },
        { name: 'Europejskie Quebec City', description: 'Historyczne miasto z europejskim urokiem.', period: 4, price: 2800.00, country: 'Kanada' },
        { name: 'Piękne Buenos Aires', description: 'Kultura, tango i kuchnia Argentyny.', period: 6, price: 3670.00, country: 'Argentyna' },
        { name: 'Dzika Patagonia', description: 'Dzika przyroda i spektakularne krajobrazy.', period: 7, price: 4990.00, country: 'Argentyna' },
        { name: 'Winiarska Mendoza', description: 'Region winiarski u podnóża Andów.', period: 5, price: 3210.00, country: 'Argentyna' },
        { name: 'Żeglarskie Auckland', description: 'Miasto żagli i pięknych krajobrazów.', period: 8, price: 8000.00, country: 'Nowa Zelandia' },
        { name: 'Przygodowe Queenstown', description: 'Stolica przygód Nowej Zelandii.', period: 6, price: 5230.00, country: 'Nowa Zelandia' },
        { name: 'Rotorua', description: 'Geotermalne cuda i kultura Maorysów.', period: 5, price: 3840.00, country: 'Nowa Zelandia' },
        { name: 'Wyprawa do Nairobi', description: 'Brama do safari w Kenii.', period: 5, price: 4050.00, country: 'Kenia' },
        { name: 'Masai Mara', description: 'Słynny rezerwat przyrody z Wielką Migracją.', period: 2, price: 900.00, country: 'Kenia' },
        { name: 'Lewa Wildlife Conservancy', description: 'Ochrona dzikiej przyrody i unikalne safari.', period: 7, price: 6500.00, country: 'Kenia' }
    ];

    // Iteracja przez wycieczki
    setTimeout(() => {
        trips.forEach(trip => {
            // Szukanie kraju, aby uzyskać jego ID
            db.get(
                'SELECT id FROM countries WHERE name = ?',
                [trip.country],
                (err, countryRow) => {
                    // Jeśli wystąpił błąd lub kraj nie istnieje
                    if (err || !countryRow) return;

                    // Jeśli kraj istnieje
                    const countryId = countryRow.id;

                    // Szukanie wycieczki, aby uniknąć duplikatów
                    db.get(
                        'SELECT id FROM trips WHERE name = ? AND description = ? AND period = ? AND price = ? AND country_id = ?',
                        [trip.name, trip.description, trip.period, trip.price, countryId],
                        (err, row) => {
                            // Jeśli wycieczka nie istnieje
                            if (!row) {
                                // Dodanie wycieczki z powiązaniem do kraju
                                db.run(
                                    'INSERT INTO trips (name, description, period, price, country_id) VALUES (?, ?, ?, ?, ?)',
                                    [trip.name, trip.description, trip.period, trip.price, countryRow.id]
                                );
                            }
                        }
                    );
                }
            );
        });
    }, 3000);

    // Definicja użytkowników
    const users = [
        { first_name: 'Admin', last_name: 'Root', email: 'admin@example.com', password: 'admin123', role: 'admin' },
        { first_name: 'Jan', last_name: 'Kowalski', email: 'user1@example.com', password: 'user123', role: 'user' },
        { first_name: 'Anna', last_name: 'Nowak', email: 'user2@example.com', password: 'user123', role: 'user' },
        { first_name: 'Piotr', last_name: 'Wiśniewski', email: 'user3@example.com', password: 'user123', role: 'user' },
        { first_name: 'Katarzyna', last_name: 'Wójcik', email: 'user4@example.com', password: 'user123', role: 'user' },
        { first_name: 'Martyna', last_name: 'Stefaniak', email: 'user5@example.com', password: 'user123', role: 'user' },
        { first_name: 'Sylwester', last_name: 'Osioł', email: 'user6@example.com', password: 'user123', role: 'user' },
        { first_name: 'Monika', last_name: 'Kiepska', email: 'user7@example.com', password: 'user123', role: 'user' }
    ];

    // Iteracja przez użytkowników
    setTimeout(() => {
        users.forEach(user => {
            // Szukanie użytkownika, aby uniknąć duplikatów
            db.get(
                'SELECT id FROM users WHERE email = ?',
                [user.email],
                (err, row) => {
                    // Jeśli użytkownik nie istnieje
                    if (!row) {
                        // Haszowanie hasła
                        const hashedPassword = bcrypt.hashSync(user.password, 10);

                        // Dodanie użytkownika
                        db.run(
                            'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                            [user.first_name, user.last_name, user.email, hashedPassword, user.role]
                        );
                    }
                }
            );
        });
    }, 5000);

    // Definicja rezerwacji
    const reservations = [
        { email: 'user1@example.com', trip_name: 'Wyprawa do Tokio', trip_date: '2025-10-10', status: 'zakonczony' },
        { email: 'user1@example.com', trip_name: 'Wakacje w Krakowie', trip_date: '2025-11-28', status: 'oczekujacy' },
        { email: 'user1@example.com', trip_name: 'Wyprawa do Pekinu', trip_date: '2025-12-02', status: 'oczekujacy' },
        { email: 'user2@example.com', trip_name: 'Lasy Amazonii', trip_date: '2025-08-22', status: 'anulowany' },
        { email: 'user2@example.com', trip_name: 'Plażowe Miami', trip_date: '2025-11-19', status: 'oczekujacy' },
        { email: 'user3@example.com', trip_name: 'Wodny Asuan', trip_date: '2025-09-16', status: 'zakonczony' },
        { email: 'user3@example.com', trip_name: 'NieOsaka', trip_date: '2025-10-04', status: 'zakonczony' },
        { email: 'user3@example.com', trip_name: 'Chinatown i Little India', trip_date: '2025-11-24', status: 'oczekujacy' },
        { email: 'user3@example.com', trip_name: 'Lewa Wildlife Conservancy', trip_date: '2025-11-30', status: 'zatwierdzony' },
        { email: 'user5@example.com', trip_name: 'Starożytny Luksor', trip_date: '2025-12-28', status: 'zatwierdzony' },
        { email: 'user7@example.com', trip_name: 'Trójmiasto', trip_date: '2025-10-08', status: 'anulowany' },
        { email: 'user7@example.com', trip_name: 'Zakopane', trip_date: '2025-11-21', status: 'oczekujacy' },
        { email: 'user7@example.com', trip_name: 'Safari w Egipcie', trip_date: '2025-12-12', status: 'zatwierdzony' },
    ];

    // Iteracja przez rezerwacje
    setTimeout(() => {
        reservations.forEach(reservation => {
            // Szukanie wycieczki, aby uzyskać jej ID
            db.get(
                'SELECT id FROM trips WHERE name = ?',
                [reservation.trip_name],
                (err, tripRow) => {
                    // Jeśli wystąpił błąd lub wycieczka nie istnieje
                    if (err || !tripRow) return;

                    // Jeśli wycieczka istnieje
                    const tripId = tripRow.id;

                    // Szukanie użytkownika, aby uzyskać jego ID
                    db.get(
                        'SELECT id FROM users WHERE email = ?',
                        [reservation.email],
                        (err, userRow) => {
                            // Jeśli wystąpił błąd lub użytkownik nie istnieje
                            if (err || !userRow) return;

                            // Jeśli użytkownik istnieje
                            const userId = userRow.id;

                            // Szukanie rezerwacji, aby uniknąć duplikatów
                            db.get(
                                'SELECT id FROM reservations WHERE user_id = ? AND trip_id = ? AND trip_date = ?',
                                [userId, tripId, reservation.trip_date],
                                (err, row) => {
                                    // Jeśli rezerwacji nie istnieje
                                    if (!row) {
                                        // Dodanie rezerwacji z powiązaniem do użytkownika i wycieczki
                                        db.run(
                                            'INSERT INTO reservations (user_id, trip_id, trip_date, status) VALUES (?, ?, ?, ?)',
                                            [userId, tripId, reservation.trip_date, reservation.status]
                                        );
                                    }
                                }
                            );
                        }
                    );
                }
            );
        });
    }, 7000);

    // Aktualizacja statusów rezerwacji na podstawie daty
    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];

        // Zamiana 'oczekujacy' na 'anulowany' (jeśli 'trip_date' jest dziś lub wcześniej)
        db.run(
            `UPDATE reservations SET status = 'anulowany' WHERE status = 'oczekujacy' AND trip_date <= ?`,
            [today],
            function (err) { }
        );

        // Zamiana 'zatwierdzony' na 'zakonczony' (jeśli 'trip_date' jest dziś lub wcześniej)
        db.run(
            `UPDATE reservations SET status = 'zakonczony' WHERE status = 'zatwierdzony' AND trip_date <= ?`,
            [today],
            function (err) { }
        );

        // Zamiana 'reservation_date' na 'trip_date - 1 dzień' (jeśli 'trip_date' jest dziś lub wcześniej)
        db.run(
            `UPDATE reservations SET reservation_date = DATE(trip_date, '-1 day') WHERE trip_date <= ?`,
            [today],
            function (err) { }
        );
    }, 9000);
});

// Eksport połączenia z bazą danych
module.exports = db;