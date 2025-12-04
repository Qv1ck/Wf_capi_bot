// ========================================================================
// WARFRAME BOT V3 FINAL - ЛОКАЛЬНАЯ ВЕРСИЯ
// ========================================================================

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// Локальные базы данных
const abilitiesDB = require('./warframe_abilities_ru.json');
const dropLocationsDB = require('./warframe_drop_locations_ru.json');
const cyclesDB = require('./warframe_cycles_ru.json');
const syndicateBountiesDB = require('./warframe_syndicate_bounties_ru.json');
const nameAliasesDB = require('./warframe_name_aliases_ru.json');
const warframe_abilities_ru = require('./warframe_abilities_ru.json');

// Базы оружия
const weaponsPrimary = require('./weapons_primary.json');
const weaponsSecondary = require('./weapons_secondary.json');
const weaponsMelee = require('./weapons_melee.json');

// База варфреймов Дувири
const warframesDuviri = require('./warframes_duviri.json');

// Логи загрузки
console.log('✓ Загружено оружия:');
console.log(`  Primary: ${Object.keys(weaponsPrimary).length}`);
console.log(`  Secondary: ${Object.keys(weaponsSecondary).length}`);
console.log(`  Melee: ${Object.keys(weaponsMelee).length}`);
console.log(`✓ Загружено варфреймов Дувири: ${Object.keys(warframesDuviri).length}`);

// Проверка токена
if (!process.env.BOT_TOKEN) {
    console.error('❌ Токен бота не найден!');
    process.exit(1);
}

// ========================================================================
// ИНИЦИАЛИЗАЦИЯ БОТА
// ========================================================================

const bot = new Telegraf(process.env.BOT_TOKEN);
const STATE_FILE = 'bot_state.json';

// Middleware: обрабатывать команды в группах только при упоминании бота
bot.use(async (ctx, next) => {
    // В личных чатах всегда обрабатываем
    if (ctx.chat?.type === 'private') {
        return next();
    }
    
    // В группах проверяем упоминание бота
    if (ctx.message?.text) {
        const botUsername = ctx.botInfo?.username;
        const text = ctx.message.text;
        
        // Если команда с упоминанием (@botname) или без команды - обрабатываем
        if (text.includes(`@${botUsername}`) || !text.startsWith('/')) {
            return next();
        }
        
        // Если команда без упоминания в группе - игнорируем
        return;
    }
    
    return next();
});

// Меню команд
bot.telegram.setChatMenuButton({
    menu_button: {
        type: 'commands'
    }
}).catch(err => console.log('Не удалось установить меню:', err));

// Регистрация команд
bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Главное меню' },
    { command: 'time', description: '🌍 Циклы' },
    { command: 'search', description: '🔍 Поиск варфрейма' },
    { command: 'primary', description: '🔫 Основное оружие' },
    { command: 'secondary', description: '🔫 Вторичное оружие' },
    { command: 'melee', description: '⚔️ Ближнее оружие' },
    { command: 'chain_guns', description: '🌀 Цепь Дувири (оружие)' },
    { command: 'chain_frame', description: '🤖 Цепь Дувири (варфреймы)' },
    { command: 'subscribe', description: '🔔 Подписаться' }
]).catch(err => console.log('Не удалось зарегистрировать команды:', err));

let state = loadState();
const subscribers = new Set(state.subscribers || []);
const checkedEvents = new Set(state.checkedEvents || []);
let checkIntervals = [];

// ========================================================================
// ФУНКЦИИ РАБОТЫ С ФАЙЛАМИ
// ========================================================================

function saveState() {
    try {
        const state = {
            subscribers: Array.from(subscribers),
            checkedEvents: Array.from(checkedEvents),
            lastSave: new Date().toISOString()
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log(`✓ Состояние сохранено: ${subscribers.size} подписчиков`);
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error.message);
    }
}

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            const state = JSON.parse(data);
            console.log(`✓ Состояние загружено: ${state.subscribers?.length || 0} подписчиков`);
            return state;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error.message);
    }
    return { subscribers: [], checkedEvents: [] };
}

// ========================================================================
// ФУНКЦИИ РАСЧЁТА НЕДЕЛЬ ДУВИРИ
// ========================================================================

// ИЗВЕСТНЫЕ ТОЧКИ
const WARFRAME_KNOWN_DATE = new Date('2025-11-24T00:00:00Z');
const WARFRAME_KNOWN_WEEK = 3;

const WEAPON_KNOWN_DATE = new Date('2025-11-24T00:00:00Z');
const WEAPON_KNOWN_WEEK = 3; // Проверь в игре!

// ФУНКЦИИ
function getCurrentDuviriWarframeWeek() {
    const now = new Date();
    const diffTime = now - WARFRAME_KNOWN_DATE;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    let currentWeek = WARFRAME_KNOWN_WEEK + diffWeeks;
    currentWeek = ((currentWeek - 1) % 11) + 1;
    
    return currentWeek;
}

function getCurrentDuviriWeek() {
    const now = new Date();
    const diffTime = now - WEAPON_KNOWN_DATE;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    let currentWeek = WEAPON_KNOWN_WEEK + diffWeeks;
    currentWeek = ((currentWeek - 1) % 8) + 1;
    
    return currentWeek;
}

function getWeekWeapons(week) {
    const weeklyRotation = {
        1: ['Брэйтон', 'Лато', 'Скана', 'Парис', 'Кунай'],
        2: ['Боар', 'Гаммакор', 'Ангструм', 'Горгон', 'Анку'],
        3: ['Бо', 'Латрон', 'Фурис', 'Фуракс', 'Стран'],
        4: ['Лекс', 'Магистр', 'Болтор', 'Бронко', 'Керамический кинжал'],
        5: ['Торид', 'Двойные Токсоцисты', 'Двойные Ихоры', 'Митра', 'Атомос'],
        6: ['Ак и Брант', 'Сома', 'Васто', 'Нами Соло', 'Берстон'],
		7: ['Зайлок', 'Сибирь', 'Страх', 'Отчаяние', 'Ненависть'],
		8: ['Дера', 'Сибарис', 'Цестра', 'Сикарус', 'Окина']
    };
    
    return weeklyRotation[week] || [];
}

// ========================================================================
// ФУНКЦИИ ДЛЯ ОРУЖИЯ
// ========================================================================

function searchWeapon(query, weaponsDB, type) {
    const normalizedQuery = query.toLowerCase().trim();
    
    console.log(`🔍 Поиск: '${normalizedQuery}' в ${Object.keys(weaponsDB).length} оружиях`);
    
    for (const [key, weapon] of Object.entries(weaponsDB)) {
        if (key.toLowerCase().includes(normalizedQuery) ||
            weapon.name.toLowerCase().includes(normalizedQuery) ||
            weapon.variants.some(v => v.toLowerCase().includes(normalizedQuery))) {
            
            console.log(`✅ Найдено: ${weapon.name} (ключ: ${key})`);
            return formatWeaponInfo(weapon, type);
        }
    }
    
    console.log(`❌ Не найдено: ${normalizedQuery}`);
    return null;
}

function formatWeaponInfo(weapon, type) {
    const currentWeek = getCurrentDuviriWeek();
    
    let message = `🔫 *${type}*\n\n`;
    message += `*Найдено:* ${weapon.variants.join(' | ')}\n\n`;
    
    if (weapon.incarnon.available) {
        const weaponWeek = weapon.incarnon.week;
        const isCurrentWeek = weaponWeek === currentWeek;
        
        message += `⚡ *Инкарнон:* Доступен\n`;
        message += `📅 *Неделя:* ${weaponWeek}\n`;
        
        if (isCurrentWeek) {
            message += `✅ *Статус:* Доступен сейчас! (${currentWeek}-я из 8-ми)\n`;
        } else {
            message += `⏰ *Статус:* Будет доступен на ${weaponWeek} неделе (сейчас ${currentWeek} из 8)\n`;
        }
        
        // Показываем оружие ТЕКУЩЕЙ недели
        const currentWeekWeapons = getWeekWeapons(currentWeek);
        message += `\n*Оружие текущей недели:*\n`;
        message += currentWeekWeapons.join(', ');
    } else {
        message += `❌ *Инкарнон:* Недоступен`;
    }
    
    return message;
}

// ========================================================================
// БАЗА ДАННЫХ HELMINTH И АУГМЕНТОВ
// ========================================================================

const helminthAbilities = {
    "Ash": { ability: "Ищущий Сюрикен", slot: 1 },
    "Atlas": { ability: "Груда Булыжников", slot: 1 },
    "Banshee": { ability: "Тишина", slot: 3 },
    "Baruuk": { ability: "Реактивный Шторм", slot: 4 },
    "Chroma": { ability: "Вечный Страж", slot: 2 },
    "Citrine": { ability: "Кристальный Резонанс", slot: 3 },
    "Ember": { ability: "Экзотермика", slot: 1 },
    "Equinox": { ability: "Отдых и Ярость", slot: 3 },
    "Excalibur": { ability: "Яростное Копьё", slot: 1 },
    "Frost": { ability: "Охлаждающая Сфера", slot: 1 },
    "Gara": { ability: "Спектроисточник", slot: 2 },
    "Garuda": { ability: "Измельчающие Когти", slot: 1 },
    "Gauss": { ability: "Термическое Клеймо", slot: 3 },
    "Grendel": { ability: "Сытость", slot: 3 },
    "Gyre": { ability: "Удар Вольт", slot: 1 },
    "Harrow": { ability: "Нерушимый Завет", slot: 1 },
    "Hildryn": { ability: "Пылающий Грабёж", slot: 2 },
    "Hydroid": { ability: "Вирусный Шторм", slot: 4 },
    "Inaros": { ability: "Инверсионная Броня", slot: 2 },
    "Ivara": { ability: "Проникновение", slot: 3 },
    "Khora": { ability: "Усиливающийся Когтехлыст", slot: 1 },
    "Kullervo": { ability: "Коллективное Проклятие", slot: 2 },
    "Lavos": { ability: "Вуаль Поганки", slot: 1 },
    "Limbo": { ability: "Укрытие Бездны", slot: 1 },
    "Loki": { ability: "Тихая Невидимость", slot: 2 },
    "Mag": { ability: "Разрывающее Сокрушение", slot: 2 },
    "Mesa": { ability: "Вальс Мисы", slot: 3 },
    "Mirage": { ability: "Полное Затмение", slot: 3 },
    "Nekros": { ability: "Щит Теней", slot: 4 },
    "Nezha": { ability: "Пылающий Нимб", slot: 1 },
    "Nidus": { ability: "Ненасытность", slot: 1 },
    "Nova": { ability: "Молекулярное Деление", slot: 4 },
    "Nyx": { ability: "Ассимиляция", slot: 4 },
    "Oberon": { ability: "Возрождение Феникса", slot: 4 },
    "Octavia": { ability: "Дирижёр", slot: 1 },
    "Protea": { ability: "Раздача Гранат", slot: 3 },
    "Qorvex": { ability: "Каменная Стена", slot: 2 },
    "Revenant": { ability: "Пакт Раба", slot: 1 },
    "Rhino": { ability: "Нерушимый Рывок", slot: 2 },
    "Saryn": { ability: "Доза Яда", slot: 1 },
    "Sevagoth": { ability: "Скользящее Мучение", slot: 1 },
    "Styanax": { ability: "Метательное Копьё", slot: 1 },
    "Titania": { ability: "Блиц Бритвокрыла", slot: 1 },
    "Trinity": { ability: "Вампирская Пиявка", slot: 2 },
    "Valkyr": { ability: "Вечная Война", slot: 2 },
    "Vauban": { ability: "Отталкивающая Бастилия", slot: 3 },
    "Volt": { ability: "Шокирующая Скорость", slot: 2 },
    "Wisp": { ability: "Разгоняющиеся Водохранилища", slot: 2 },
    "Wukong": { ability: "Небесный Посох", slot: 1 },
    "Xaku": { ability: "Осколок Отказа", slot: 4 },
    "Yareli": { ability: "Морская Раковина", slot: 3 },
    "Zephyr": { ability: "Воздушный Взрыв", slot: 1 }
};

const augmentMods = {
    "Ash": [
        "Ищущий Сюрикен (аугмент на способность 1)",
        "Восходящий Шторм (аугмент на способность 2)",
        "Восполняющий Клинок (аугмент на способность 4)"
    ],
    "Atlas": [
        "Груда Булыжников (аугмент на способность 1)",
        "Окаменение (аугмент на способность 3)",
        "Текущая Лава (аугмент на способность 4)"
    ],
    "Banshee": [
        "Заряженный Резонанс (аугмент на способность 1)",
        "Тишина (аугмент на способность 3)",
        "Звуковой Удар (аугмент на способность 4)"
    ],
    "Ember": [
        "Экзотермика (аугмент на способность 1)",
        "Огненный Взрыв (аугмент на способность 2)",
        "Пламенный Взрыв (аугмент на способность 4)"
    ],
    "Excalibur": [
        "Яростное Копьё (аугмент на способность 1)",
        "Превосходящий Клинок (аугмент на способность 2)",
        "Хроматический Клинок (аугмент на способность 4)"
    ],
    "Frost": [
        "Охлаждающая Сфера (аугмент на способность 1)",
        "Ледяная Лавина (аугмент на способность 3)",
        "Ледяная Волна Импеданса (аугмент на способность 4)"
    ],
    "Mag": [
        "Разрывающее Сокрушение (аугмент на способность 2)",
        "Противодействие (аугмент на способность 3)",
        "Магнетизировать Аномалию (аугмент на способность 4)"
    ],
    "Nova": [
        "Молекулярное Деление (аугмент на способность 4)",
        "Нейтронная Звезда (аугмент на способность 1)",
        "Червоточина Потока (аугмент на способность 3)"
    ],
    "Rhino": [
        "Нерушимый Рывок (аугмент на способность 2)",
        "Железная Броня (аугмент на способность 3)",
        "Мощный Удар Раскалывающий (аугмент на способность 4)"
    ],
    "Saryn": [
        "Доза Яда (аугмент на способность 1)",
        "Токсичный Прилив (аугмент на способность 3)",
        "Возрождение Спор (аугмент на способность 4)"
    ],
    "Trinity": [
        "Вампирская Пиявка (аугмент на способность 2)",
        "Благословение Истребителей (аугмент на способность 4)",
        "Энергетический Вампир (аугмент на способность 3)"
    ],
    "Volt": [
        "Шокирующая Скорость (аугмент на способность 2)",
        "Переделывающийся Щит (аугмент на способность 3)",
        "Ёмкая Разгрузка (аугмент на способность 4)"
    ]
};

// ========================================================================
// ФУНКЦИИ РАСЧЁТА ЦИКЛОВ
// ========================================================================

function getEarthCycle() {
    const now = Date.now();
    const cycleLength = 4 * 60 * 60 * 1000; // 4 часа
    const dayLength = 2 * 60 * 60 * 1000;   // 2 часа день
    
    const timeInCycle = now % cycleLength;
    
    const isDay = timeInCycle < dayLength;
    const timeLeft = isDay 
        ? dayLength - timeInCycle 
        : cycleLength - timeInCycle;
    
    return {
        isDay,
        state: isDay ? 'День' : 'Ночь',
        timeLeft: formatTime(timeLeft)
    };
}

// ========================================================================
// РАСЧЁТ ЦИКЛОВ ОТ ИЗВЕСТНЫХ ТОЧЕК (обновлено 02.12.2025 20:24 МСК)
// ========================================================================

// Известные точки (проверено в игре 02.12.2025 в 20:24 МСК = 17:24 UTC):
// - Деймос: ВОУМ (идёт сейчас), смена через 16м
//   → Воум НАЧАЛСЯ в 17:24 - (50 - 16) = 17:24 - 34м = 16:50 UTC
// - Цетус: НОЧЬ (идёт сейчас), смена через 16м
//   → Ночь НАЧАЛАСЬ в 17:24 - (50 - 16) = 17:24 - 34м = 16:50 UTC
// - Фортуна: ХОЛОД (идёт сейчас), смена через 9м = 540с
//   → Холод НАЧАЛСЯ в 17:24 - (800 - 540) = 17:24 - 260с = 17:19:40 UTC

const DEIMOS_REFERENCE = new Date('2025-12-02T16:50:00Z'); // начало Воум
const DEIMOS_FASS_DURATION = 150 * 60 * 1000;  // 150 минут
const DEIMOS_VOME_DURATION = 50 * 60 * 1000;   // 50 минут
const DEIMOS_CYCLE = DEIMOS_FASS_DURATION + DEIMOS_VOME_DURATION;

const CETUS_REFERENCE = new Date('2025-12-02T16:50:00Z'); // начало Ночь
const CETUS_DAY_DURATION = 100 * 60 * 1000;  // 100 минут
const CETUS_NIGHT_DURATION = 50 * 60 * 1000; // 50 минут
const CETUS_CYCLE = CETUS_DAY_DURATION + CETUS_NIGHT_DURATION;

const FORTUNA_REFERENCE = new Date('2025-12-02T17:44:40Z'); // начало Холод (уточнено 20:42 МСК)
const FORTUNA_WARM_DURATION = 400 * 1000;  // 400 секунд (6м 40с)
const FORTUNA_COLD_DURATION = 800 * 1000;  // 800 секунд (13м 20с)
const FORTUNA_CYCLE = FORTUNA_WARM_DURATION + FORTUNA_COLD_DURATION;

const EARTH_DAY_DURATION = 240 * 60 * 1000;  // 240 минут
const EARTH_NIGHT_DURATION = 240 * 60 * 1000; // 240 минут
const EARTH_CYCLE = EARTH_DAY_DURATION + EARTH_NIGHT_DURATION;
const EARTH_REFERENCE = new Date('2025-12-02T16:00:00Z'); // начало ночи

function getCycleStatus(locationKey) {
    const now = Date.now();
    
    // ЦЕТУС
    if (locationKey === 'Равнины Эйдолона' || locationKey === 'Цетус') {
        const elapsed = now - CETUS_REFERENCE.getTime();
        const cyclePosition = ((elapsed % CETUS_CYCLE) + CETUS_CYCLE) % CETUS_CYCLE;
        
        // Reference = начало Ночь
        // 0 - 50м: Ночь
        // 50м - 150м: День
        if (cyclePosition < CETUS_NIGHT_DURATION) {
            // Ночь
            return {
                phase: 'Ночь',
                timeLeft: formatTime(CETUS_NIGHT_DURATION - cyclePosition),
                isPhase1: false
            };
        } else {
            // День
            return {
                phase: 'День',
                timeLeft: formatTime(CETUS_CYCLE - cyclePosition),
                isPhase1: true
            };
        }
    }
    
    // ФОРТУНА
    if (locationKey === 'Фортуна') {
        const elapsed = now - FORTUNA_REFERENCE.getTime();
        const cyclePosition = ((elapsed % FORTUNA_CYCLE) + FORTUNA_CYCLE) % FORTUNA_CYCLE;
        
        // Reference = начало Холод
        // 0 - 800с: Холод
        // 800с - 1200с: Тепло
        if (cyclePosition < FORTUNA_COLD_DURATION) {
            // Холод
            return {
                phase: 'Холод',
                timeLeft: formatTime(FORTUNA_COLD_DURATION - cyclePosition),
                isPhase1: false
            };
        } else {
            // Тепло
            return {
                phase: 'Тепло',
                timeLeft: formatTime(FORTUNA_CYCLE - cyclePosition),
                isPhase1: true
            };
        }
    }
    
    // ДЕЙМОС
    if (locationKey === 'Камбионский Дрейф' || locationKey === 'Деймос') {
        const elapsed = now - DEIMOS_REFERENCE.getTime();
        const cyclePosition = ((elapsed % DEIMOS_CYCLE) + DEIMOS_CYCLE) % DEIMOS_CYCLE;
        
        // Reference = начало Воум
        // 0 - 50м: Воум
        // 50м - 200м: Фэз
        if (cyclePosition < DEIMOS_VOME_DURATION) {
            // Воум
            return {
                phase: 'Воум',
                timeLeft: formatTime(DEIMOS_VOME_DURATION - cyclePosition),
                isPhase1: false
            };
        } else {
            // Фэз
            return {
                phase: 'Фэз',
                timeLeft: formatTime(DEIMOS_CYCLE - cyclePosition),
                isPhase1: true
            };
        }
    }
    
    // ЗЕМЛЯ
    if (locationKey === 'Земля') {
        const elapsed = now - EARTH_REFERENCE.getTime();
        const cyclePosition = ((elapsed % EARTH_CYCLE) + EARTH_CYCLE) % EARTH_CYCLE;
        
        // Reference = начало Ночь
        if (cyclePosition < EARTH_NIGHT_DURATION) {
            // Ночь
            return {
                phase: 'Ночь',
                timeLeft: formatTime(EARTH_NIGHT_DURATION - cyclePosition),
                isPhase1: false
            };
        } else {
            // День
            return {
                phase: 'День',
                timeLeft: formatTime(EARTH_CYCLE - cyclePosition),
                isPhase1: true
            };
        }
    }
    
    return null;
}

function formatTime(milliseconds) {
    if (milliseconds < 0) return 'Истекло';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let result = '';
    if (hours > 0) result += `${hours}ч `;
    result += `${minutes}м`;

    return result.trim();
}

function getFormattedCycles(location = null) {
    const locationMap = {
        'цетус': 'Цетус',
        'cetus': 'Цетус',
        'равнины': 'Цетус',
        'эйдолон': 'Цетус',
        'фортуна': 'Фортуна',
        'fortuna': 'Фортуна',
        'vallis': 'Фортуна',
        'венера': 'Фортуна',
        'venus': 'Фортуна',
        'деймос': 'Деймос',
        'deimos': 'Деймос',
        'камбион': 'Деймос',
        'дрейф': 'Деймос',
        'земля': 'Земля',
        'earth': 'Земля'
    };
    
    // Если указана конкретная локация
    if (location) {
        const loc = location.toLowerCase().trim();
        const targetLocation = locationMap[loc];
        
        if (!targetLocation) {
            return '❌ Локация не найдена. Доступные: Цетус, Фортуна, Деймос, Земля';
        }
        
        if (targetLocation === 'Земля') {
            const earth = getEarthCycle();
            const emoji = earth.isDay ? '☀️' : '🌙';
            return `🌍 *Земля*\n\n${emoji} ${earth.state}\n⏰ До смены: ${earth.timeLeft}`;
        } else if (targetLocation === 'Цетус') {
            const cetus = getCycleStatus('Равнины Эйдолона');
            const emoji = cetus.phase === 'День' ? '☀️' : '🌙';
            return `🌍 *Цетус*\n\n${emoji} ${cetus.phase}\n⏰ До смены: ${cetus.timeLeft}`;
        } else if (targetLocation === 'Фортуна') {
            const fortuna = getCycleStatus('Фортуна');
            const emoji = fortuna.phase === 'Тепло' ? '☀️' : '❄️';
            return `🌍 *Фортуна*\n\n${emoji} ${fortuna.phase}\n⏰ До смены: ${fortuna.timeLeft}`;
        } else if (targetLocation === 'Деймос') {
            const deimos = getCycleStatus('Камбионский Дрейф');
            const emoji = deimos.phase === 'Фэз' ? '☀️' : '🌙';
            return `🌍 *Деймос*\n\n${emoji} ${deimos.phase}\n⏰ До смены: ${deimos.timeLeft}`;
        }
    }
    
    // Показываем все циклы
    const earth = getEarthCycle();
    const cetus = getCycleStatus('Равнины Эйдолона');
    const fortuna = getCycleStatus('Фортуна');
    const deimos = getCycleStatus('Камбионский Дрейф');
    
    let message = `🌍 *ЦИКЛЫ*\n\n`;
    
    // Земля
    const earthEmoji = earth.isDay ? '☀️' : '🌙';
    message += `*Земля:* ${earthEmoji} ${earth.state}\n`;
    message += `⏰ До смены: ${earth.timeLeft}\n\n`;
    
    // Цетус (Равнины Эйдолона)
    const cetusEmoji = cetus.phase === 'День' ? '☀️' : '🌙';
    message += `*Цетус:* ${cetusEmoji} ${cetus.phase}\n`;
    message += `⏰ До смены: ${cetus.timeLeft}\n\n`;
    
    // Фортуна
    const fortunaEmoji = fortuna.phase === 'Тепло' ? '☀️' : '❄️';
    message += `*Фортуна:* ${fortunaEmoji} ${fortuna.phase}\n`;
    message += `⏰ До смены: ${fortuna.timeLeft}\n\n`;
    
    // Деймос
    const deimosEmoji = deimos.phase === 'Фэз' ? '☀️' : '🌙';
    message += `*Деймос:* ${deimosEmoji} ${deimos.phase}\n`;
    message += `⏰ До смены: ${deimos.timeLeft}`;
    
    return message;
}

// ========================================================================
// ФУНКЦИЯ ПОИСКА ВАРФРЕЙМОВ
// ========================================================================

async function searchLocalDB(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    console.log(`🔍 Ищу варфрейма: '${normalizedQuery}'`);
    
    let englishKey = null;
    let bestMatch = null;
    
    // Точное совпадение
    for (const [key, aliases] of Object.entries(nameAliasesDB)) {
        if (key.toLowerCase() === normalizedQuery ||
            aliases.some(alias => alias.toLowerCase() === normalizedQuery)) {
            englishKey = key;
            console.log(`✅ Найдено точное совпадение: '${normalizedQuery}' → '${englishKey}'`);
            break;
        }
    }
    
    // Частичное совпадение
    if (!englishKey) {
        for (const [key, aliases] of Object.entries(nameAliasesDB)) {
            if (key.toLowerCase().includes(normalizedQuery) ||
                aliases.some(alias => alias.toLowerCase().includes(normalizedQuery))) {
                
                if (!bestMatch) {
                    bestMatch = key;
                }
                
                if (key.toLowerCase().startsWith(normalizedQuery) ||
                    aliases.some(alias => alias.toLowerCase().startsWith(normalizedQuery))) {
                    bestMatch = key;
                    break;
                }
            }
        }
        
        if (bestMatch) {
            englishKey = bestMatch;
            console.log(`✅ Найдено частичное совпадение: '${normalizedQuery}' → '${englishKey}'`);
        }
    }
    
    // Английское имя
    if (!englishKey) {
        englishKey = normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1);
        console.log(`📝 Пробую английский ключ: '${englishKey}'`);
    }
    
    if (!abilitiesDB[englishKey]) {
        console.log(`❌ Варфрейм '${englishKey}' не найден в базе`);
        return null;
    }
    
    console.log(`✅ НАЙДЕНО: ${englishKey}`);
    
    const russianData = warframe_abilities_ru[englishKey];
    const englishAbilities = abilitiesDB[englishKey];
    
    let abilities = [];
    if (Array.isArray(russianData)) {
        abilities = russianData.map(name => ({ name, description: "" }));
    } else if (russianData && russianData.abilities) {
        abilities = russianData.abilities;
    } else {
        abilities = englishAbilities.map(name => ({ name, description: "" }));
    }
    
    const displayName = russianData?.name || 
                       Object.keys(nameAliasesDB).find(k => k === englishKey) ||
                       englishKey;
    
    let duviriInfo = null;
    try {
        for (const [key, warframe] of Object.entries(warframesDuviri)) {
            if (key.toLowerCase() === englishKey.toLowerCase()) {
                duviriInfo = warframe;
                console.log(`✅ Найден в Дувири: неделя ${warframe.week}`);
                break;
            }
        }
        
        if (!duviriInfo) {
            console.log(`❌ Цепь Дувири: ${englishKey} не найден`);
            duviriInfo = false; // Помечаем что проверили, но не нашли
        }
    } catch (error) {
        console.error('❌ Ошибка поиска в Дувири:', error.message);
    }
    
    const helminthInfo = helminthAbilities[englishKey];
    const augments = augmentMods[englishKey] || [];
    
    return {
        title: displayName,
        englishKey: englishKey,
        abilities: abilities,
        dropLocations: dropLocationsDB[englishKey],
        duviri: duviriInfo,
        helminth: helminthInfo,
        augments: augments
    };
}

function formatWarframeInfo(info) {
    let message = `🤖 *${info.title}*\n\n`;
    
    // Способности
    if (info.abilities && info.abilities.length > 0) {
        message += `⚡ *Способности:*\n`;
        info.abilities.forEach((ability, index) => {
            if (typeof ability === 'string') {
                message += `${index + 1}. ${ability}\n`;
            } else if (ability.name) {
                message += `${index + 1}. *${ability.name}*\n`;
                if (ability.description) {
                    message += `   _${ability.description}_\n`;
                }
            }
        });
        message += '\n';
    }
    
    // Helminth
    if (info.helminth) {
        message += `🧬 *Helminth:*\n`;
        message += `• ${info.helminth.ability} (слот ${info.helminth.slot})\n\n`;
    }
    
    // Аугменты
    if (info.augments && info.augments.length > 0) {
        message += `📦 *Моды-аугменты:*\n`;
        info.augments.forEach(aug => {
            message += `• ${aug}\n`;
        });
        message += '\n';
    }
    
    // Места фарма
    if (info.dropLocations) {
        message += `🎯 *Где добыть:*\n`;
        
        const partEmojis = {
            'Нейроптика': '🔸',
            'Система': '📘',
            'Каркас': '🔲',
            'Основной Чертеж': '📜'
        };
        
        for (const [part, location] of Object.entries(info.dropLocations)) {
            const emoji = partEmojis[part] || '•';
            message += `${emoji} ${part}: ${location}\n`;
        }
        message += '\n';
    }
    
    // Дувири
    if (info.duviri && info.duviri !== false) {
        const currentWeek = getCurrentDuviriWarframeWeek();
        const isCurrentWeek = info.duviri.week === currentWeek;
        
        message += `🌀 *Цепь Дувири:*\n`;
        message += `📅 Неделя: ${info.duviri.week} из 11\n`;
        message += `💉 Гельминт: ${info.duviri.helminth}\n`;
        
        if (isCurrentWeek) {
            message += `✅ *Доступен СЕЙЧАС!*\n`;
        } else {
            message += `⏰ Будет доступен на ${info.duviri.week} неделе (сейчас ${currentWeek} из 11)\n`;
        }
    } else if (info.duviri === false) {
        message += `❌ *Цепь Дувири:* Недоступен\n`;
    }
    
    return message;
}

// ========================================================================
// КОМАНДА /start
// ========================================================================

bot.start((ctx) => {
    const message = 
        `🤖 *Warf_bot*\n\n` +
        `Still sane, exile?\n\n` +
        `Выберите команду ниже или введите вручную:`;
    
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('🌍 Циклы', 'cmd_cycles'),
            Markup.button.callback('🔍 Варфрейм', 'cmd_search')
        ],
        [
            Markup.button.callback('🔫 Оружие', 'cmd_weapon'),
            Markup.button.callback('🌀 Цепь (оружие)', 'cmd_chain_guns')
        ],
        [
            Markup.button.callback('🤖 Цепь (варфреймы)', 'cmd_chain_frame'),
            Markup.button.callback('🔔 Подписки', 'cmd_subscribe')
        ]
    ]);
    
    ctx.replyWithMarkdown(message, keyboard);
});

// ========================================================================
// КОМАНДЫ ОРУЖИЯ
// ========================================================================

bot.command('primary', async (ctx) => {
    console.log('🔫 Команда /primary вызвана');
    
    try {
        let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        if (!query) {
            return ctx.reply(
                '🔫 *Основное оружие*\n\n' +
                'Использование: `/primary <название>`\n\n' +
                'Примеры:\n' +
                '`/primary Болтор`\n' +
                '`/primary Сома`\n' +
                '`/primary Braton`',
                { parse_mode: 'Markdown' }
            );
        }
        
        console.log(`🔍 Ищу основное оружие: ${query}`);
        
        const result = searchWeapon(query, weaponsPrimary, 'Основное оружие');
        
        if (result) {
            await ctx.replyWithMarkdown(result);
        } else {
            await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
        }
    } catch (error) {
        console.error('❌ Ошибка /primary:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

bot.command('secondary', async (ctx) => {
    console.log('🔫 Команда /secondary вызвана');
    
    try {
        let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        if (!query) {
            return ctx.reply(
                '🔫 *Вторичное оружие*\n\n' +
                'Использование: `/secondary <название>`\n\n' +
                'Примеры:\n' +
                '`/secondary Лекс`\n' +
                '`/secondary Атомос`\n' +
                '`/secondary Lex`',
                { parse_mode: 'Markdown' }
            );
        }
        
        console.log(`🔍 Ищу вторичное оружие: ${query}`);
        
        const result = searchWeapon(query, weaponsSecondary, 'Вторичное оружие');
        
        if (result) {
            await ctx.replyWithMarkdown(result);
        } else {
            await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
        }
    } catch (error) {
        console.error('❌ Ошибка /secondary:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

bot.command('melee', async (ctx) => {
    console.log('⚔️ Команда /melee вызвана');
    
    try {
        let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        if (!query) {
            return ctx.reply(
                '⚔️ *Ближнее оружие*\n\n' +
                'Использование: `/melee <название>`\n\n' +
                'Примеры:\n' +
                '`/melee Скана`\n' +
                '`/melee Никана`\n' +
                '`/melee Skana`',
                { parse_mode: 'Markdown' }
            );
        }
        
        console.log(`🔍 Ищу ближнее оружие: ${query}`);
        
        const result = searchWeapon(query, weaponsMelee, 'Ближнее оружие');
        
        if (result) {
            await ctx.replyWithMarkdown(result);
        } else {
            await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
        }
    } catch (error) {
        console.error('❌ Ошибка /melee:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

bot.command('chain_guns', async (ctx) => {
    console.log('🌀 Команда /chain_guns вызвана');
    
    try {
        const currentWeek = getCurrentDuviriWeek();
        const weekWeapons = getWeekWeapons(currentWeek);
        
        let message = `🌀 *ЦЕПЬ ДУВИРИ (ОРУЖИЕ)*\n\n`;
        message += `📅 *Текущая неделя:* ${currentWeek} из 8\n\n`;
        message += `⚡ *Доступные Инкарноны:*\n`;
        message += weekWeapons.join('\n');
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /chain_guns:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

bot.command('chain_frame', async (ctx) => {
    console.log('🤖 Команда /chain_frame вызвана');
    
    try {
        const currentWeek = getCurrentDuviriWarframeWeek();
        
        const weekFrames = [];
        for (const [key, warframe] of Object.entries(warframesDuviri)) {
            if (warframe.week === currentWeek) {
                weekFrames.push(`• *${warframe.name}* - ${warframe.helminth}`);
            }
        }
        
        let message = `🤖 *ЦЕПЬ ДУВИРИ (ВАРФРЕЙМЫ)*\n\n`;
        message += `📅 *Текущая неделя:* ${currentWeek} из 11\n\n`;
        message += `⚡ *Доступные варфреймы:*\n`;
        message += weekFrames.join('\n');
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /chain_frame:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /time (ЕДИНСТВЕННАЯ ДЛЯ ЦИКЛОВ)
// ========================================================================

bot.command(['time', 'cycles'], async (ctx) => {
    console.log('🌍 Команда /time вызвана');
    
    try {
        const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
        const message = getFormattedCycles(args || null);
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /time:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /search
// ========================================================================

bot.command('search', async (ctx) => {
    let query = ctx.message.text.replace(/\/search(@\w+)?/, '').trim();
    
    if (!query) {
        return ctx.reply('Использование: /search <название варфрейма>\n\nПример: /search Excalibur');
    }

    console.log(`✓ Поиск: '${query}' от ${ctx.from.first_name}`);
    
    const info = await searchLocalDB(query);
    
    if (info) {
        console.log(`✓ Найдено: ${info.title}`);
        await ctx.replyWithMarkdown(formatWarframeInfo(info));
    } else {
        console.log(`✗ Не найдено: '${query}'`);
        await ctx.reply('❌ Ничего не найдено. Попробуй другой запрос.');
    }
});

// ========================================================================
// CALLBACK КНОПКИ
// ========================================================================

bot.action('cmd_cycles', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
        const message = getFormattedCycles();
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('Ошибка cmd_cycles:', error);
        await ctx.reply('❌ Произошла ошибка при получении циклов');
    }
});

bot.action('cmd_search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        '🔍 *Поиск варфрейма*\n\n' +
        'Используйте: `/search <название>`\n\n' +
        'Примеры:\n' +
        '`/search Экс` (найдёт Excalibur)\n' +
        '`/search Volt`\n' +
        '`/search Нокко`',
        { parse_mode: 'Markdown' }
    );
});

bot.action('cmd_weapon', async (ctx) => {
    await ctx.answerCbQuery();
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔫 Основное', 'weapon_primary')],
        [Markup.button.callback('🔫 Вторичное', 'weapon_secondary')],
        [Markup.button.callback('⚔️ Ближнее', 'weapon_melee')]
    ]);
    
    ctx.reply('🔫 Выберите тип оружия:', keyboard);
});

bot.action('weapon_primary', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        '🔫 *Основное оружие*\n\n' +
        'Используйте: `/primary <название>`\n\n' +
        'Примеры:\n' +
        '`/primary Болтор`\n' +
        '`/primary Сома`\n' +
        '`/primary Braton`',
        { parse_mode: 'Markdown' }
    );
});

bot.action('weapon_secondary', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        '🔫 *Вторичное оружие*\n\n' +
        'Используйте: `/secondary <название>`\n\n' +
        'Примеры:\n' +
        '`/secondary Лекс`\n' +
        '`/secondary Атомос`\n' +
        '`/secondary Lex`',
        { parse_mode: 'Markdown' }
    );
});

bot.action('weapon_melee', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        '⚔️ *Ближнее оружие*\n\n' +
        'Используйте: `/melee <название>`\n\n' +
        'Примеры:\n' +
        '`/melee Скана`\n' +
        '`/melee Никана`\n' +
        '`/melee Skana`',
        { parse_mode: 'Markdown' }
    );
});

bot.action('cmd_chain_guns', async (ctx) => {
    await ctx.answerCbQuery();
    
    const currentWeek = getCurrentDuviriWeek();
    const weekWeapons = getWeekWeapons(currentWeek);
    
    let message = `🌀 *ЦЕПЬ ДУВИРИ (ОРУЖИЕ)*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 8\n\n`;
    message += `⚡ *Доступные Инкарноны:*\n`;
    message += weekWeapons.join('\n');
    
    await ctx.replyWithMarkdown(message);
});

bot.action('cmd_chain_frame', async (ctx) => {
    await ctx.answerCbQuery();
    
    const currentWeek = getCurrentDuviriWarframeWeek();
    
    const weekFrames = [];
    for (const [key, warframe] of Object.entries(warframesDuviri)) {
        if (warframe.week === currentWeek) {
            weekFrames.push(`• *${warframe.name}* - ${warframe.helminth}`);
        }
    }
    
    let message = `🤖 *ЦЕПЬ ДУВИРИ (ВАРФРЕЙМЫ)*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 11\n\n`;
    message += `⚡ *Доступные варфреймы:*\n`;
    message += weekFrames.join('\n');
    
    await ctx.replyWithMarkdown(message);
});

bot.action('cmd_subscribe', async (ctx) => {
    await ctx.answerCbQuery();
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Подписаться', 'sub_yes')],
        [Markup.button.callback('❌ Отписаться', 'sub_no')]
    ]);
    
    ctx.reply('🔔 Управление подписками:', keyboard);
});

bot.action('sub_yes', async (ctx) => {
    await ctx.answerCbQuery('✅ Подписка оформлена!');
    const chatId = ctx.chat.id;
    if (!subscribers.has(chatId)) {
        subscribers.add(chatId);
        saveState();
    }
    ctx.reply('✅ Вы подписаны на уведомления');
});

bot.action('sub_no', async (ctx) => {
    await ctx.answerCbQuery('❌ Отписка выполнена');
    const chatId = ctx.chat.id;
    if (subscribers.has(chatId)) {
        subscribers.delete(chatId);
        saveState();
    }
    ctx.reply('❌ Вы отписаны от уведомлений');
});

// ========================================================================
// ПОДПИСКИ
// ========================================================================

bot.command('subscribe', (ctx) => {
    const chatId = ctx.chat.id;
    if (!subscribers.has(chatId)) {
        subscribers.add(chatId);
        saveState();
        console.log(`✓ Новый подписчик: ${ctx.from.first_name} (ID: ${chatId})`);
        ctx.reply('✅ Вы подписаны на уведомления о событиях');
    } else {
        ctx.reply('ℹ️ Вы уже подписаны на уведомления.');
    }
});

bot.command('unsubscribe', (ctx) => {
    const chatId = ctx.chat.id;
    if (subscribers.has(chatId)) {
        subscribers.delete(chatId);
        saveState();
        console.log(`✓ Отписался: ${ctx.from.first_name} (ID: ${chatId})`);
        ctx.reply('❌ Вы отписаны от уведомлений.');
    } else {
        ctx.reply('ℹ️ Вы не подписаны на уведомления.');
    }
});

// ========================================================================
// СИСТЕМА УВЕДОМЛЕНИЙ
// ========================================================================

async function sendToSubscribers(message) {
    console.log(`📤 Отправка уведомлений ${subscribers.size} подписчикам`);
    let sent = 0;
    let failed = 0;
    
    for (const chatId of subscribers) {
        try {
            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            sent++;
        } catch (error) {
            console.error(`❌ Ошибка отправки в ${chatId}:`, error.message);
            failed++;
            if (error.response?.error_code === 403) {
                subscribers.delete(chatId);
                console.log(`ℹ️ Удалён заблокировавший бота: ${chatId}`);
            }
        }
    }
    
    console.log(`✓ Отправлено: ${sent}, ошибок: ${failed}`);
    if (failed > 0) saveState();
}

function checkCycles() {
    const now = new Date();
    
    ['Равнины Эйдолона', 'Фортуна', 'Камбионский Дрейф'].forEach(locationKey => {
        checkSingleCycle(locationKey, now);
    });
}

function checkSingleCycle(locationKey, now) {
    const location = cyclesDB[locationKey];
    if (!location) return;

    const currentTime = now.getTime();
    
    let cycleDuration, phase1Duration, phase1Name, phase2Name, displayName;
    
    if (locationKey === 'Равнины Эйдолона') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.day_duration * 60 * 1000;
        phase1Name = 'День';
        phase2Name = 'Ночь';
        displayName = 'Цетус';
    } else if (locationKey === 'Фортуна') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.warm_duration * 60 * 1000;
        phase1Name = 'Тепло';
        phase2Name = 'Холод';
        displayName = 'Фортуна';
    } else if (locationKey === 'Камбионский Дрейф') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.active_duration * 60 * 1000;
        phase1Name = 'Фэз';
        phase2Name = 'Воум';
        displayName = 'Деймос';
    } else {
        return;
    }
    
    const startDate = new Date('2021-01-01T00:00:00Z');
    const startTime = startDate.getTime();
    
    const timeSinceStart = currentTime - startTime;
    const timeInCycle = timeSinceStart % cycleDuration;
    
    const isPhase1 = timeInCycle < phase1Duration;
    const timeUntilChange = isPhase1 
        ? phase1Duration - timeInCycle 
        : cycleDuration - timeInCycle;
    
    const minutesUntilChange = Math.floor(timeUntilChange / 60000);
    
    [5, 2].forEach(threshold => {
        const eventKey = `${locationKey}_${threshold}_${Math.floor(currentTime / (60000 * threshold))}`;
        
        if (minutesUntilChange === threshold && !checkedEvents.has(eventKey)) {
            checkedEvents.add(eventKey);
            const nextPhase = isPhase1 ? phase2Name : phase1Name;
            const message = `⏰ *${displayName}*\n\n` +
                          `Через ${threshold} минут наступит: *${nextPhase}*`;
            sendToSubscribers(message);
            saveState();
        }
    });
}

// ========================================================================
// ЗАПУСК БОТА
// ========================================================================

console.log('='.repeat(60));
console.log('🤖 WARFRAME BOT V3 FINAL (LOCAL)');
console.log('='.repeat(60));
console.log('✓ Бот инициализирован');
console.log('✓ Локальные расчёты циклов');
console.log(`✓ Подписчики: ${subscribers.size}`);
console.log('='.repeat(60));
console.log('✓ 🚀 Бот запущен и готов к работе!');
console.log('='.repeat(60));
console.log('Нажмите Ctrl+C для остановки\n');

bot.launch().catch(err => {
    console.error('❌ Ошибка запуска:', err);
    process.exit(1);
});

checkIntervals.push(setInterval(checkCycles, 60000));
checkIntervals.push(setInterval(saveState, 5 * 60000));

process.once('SIGINT', () => {
    console.log('\n' + '='.repeat(60));
    console.log('✓ Бот остановлен');
    saveState();
    checkIntervals.forEach(interval => clearInterval(interval));
    console.log('='.repeat(60));
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('\n' + '='.repeat(60));
    console.log('✓ Бот остановлен системой');
    saveState();
    checkIntervals.forEach(interval => clearInterval(interval));
    console.log('='.repeat(60));
    bot.stop('SIGTERM');
});
