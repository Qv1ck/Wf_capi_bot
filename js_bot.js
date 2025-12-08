// ========================================================================
// WARFRAME BOT V3 FINAL - ЛОКАЛЬНАЯ ВЕРСИЯ
// ========================================================================

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const https = require('https');

// ========================================================================
// API TENNO.TOOLS - ЖИВЫЕ ДАННЫЕ
// ========================================================================

// Кэш для API данных (обновляется каждые 60 секунд)
let worldstateCache = null;
let worldstateCacheTime = 0;
const CACHE_DURATION = 60000; // 60 секунд

// Функция запроса к API
function fetchTennoAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.tenno.tools',
            path: '/worldstate/pc',
            method: 'GET',
            headers: { 'User-Agent': 'WarframeBot/1.0' }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('JSON parse error'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

// Получить worldstate с кэшированием
async function getWorldstate() {
    const now = Date.now();
    if (worldstateCache && (now - worldstateCacheTime) < CACHE_DURATION) {
        return worldstateCache;
    }
    
    try {
        worldstateCache = await fetchTennoAPI();
        worldstateCacheTime = now;
        console.log('✓ Worldstate обновлён');
        return worldstateCache;
    } catch (error) {
        console.error('❌ Ошибка API:', error.message);
        return worldstateCache; // Вернуть старый кэш если есть
    }
}

// Переводы
const TIER_NAMES = {
    'Lith': 'Лит', 'Meso': 'Мезо', 'Neo': 'Нео', 
    'Axi': 'Акси', 'Requiem': 'Реквием', 'Omnia': 'Омния'
};

const MISSION_TYPES = {
    'Exterminate': 'Истребление', 'Survival': 'Выживание', 'Defense': 'Защита',
    'Capture': 'Захват', 'Rescue': 'Спасение', 'Sabotage': 'Саботаж',
    'Mobile Defense': 'Мобильная защита', 'Excavation': 'Раскопки',
    'Interception': 'Перехват', 'Spy': 'Шпионаж', 'Assassination': 'Убийство',
    'Disruption': 'Сбой', 'Void Cascade': 'Каскад Бездны', 'Void Flood': 'Потоп Бездны',
    'Void Armageddon': 'Армагеддон Бездны', 'Defection': 'Дезертирство',
    'Hive': 'Улей', 'Hijack': 'Угон', 'Infested Salvage': 'Заражённый улов',
    'Skirmish': 'Стычка', 'Volatile': 'Нестабильность', 'Orphix': 'Орфикс'
};

const FACTION_NAMES = {
    'Grineer': 'Гринир', 'Corpus': 'Корпус', 'Infested': 'Заражённые',
    'Infestation': 'Заражённые', 'Orokin': 'Орокин', 'Corrupted': 'Осквернённые', 
    'Crossfire': 'Перестрелка'
};

const PLANET_NAMES = {
    'Earth': 'Земля', 'Venus': 'Венера', 'Mercury': 'Меркурий', 'Mars': 'Марс',
    'Phobos': 'Фобос', 'Deimos': 'Деймос', 'Ceres': 'Церера', 'Jupiter': 'Юпитер',
    'Europa': 'Европа', 'Saturn': 'Сатурн', 'Uranus': 'Уран', 'Neptune': 'Нептун',
    'Pluto': 'Плутон', 'Sedna': 'Седна', 'Eris': 'Эрида', 'Void': 'Бездна',
    'Lua': 'Луа', 'Kuva Fortress': 'Крепость Кувы', 'Zariman': 'Зариман',
    'Derelict': 'Покинутый корабль'
};

const BOSS_NAMES = {
    'Corrupted Vor': 'Осквернённый Вор', 'Vor': 'Вор', 'Lech Kril': 'Лек Крил',
    'Vay Hek': 'Вэй Хек', 'Tyl Regor': 'Тил Регор', 'Sargas Ruk': 'Саргас Рук',
    'Kela De Thaym': 'Кела Де Тейм', 'Alad V': 'Алад V', 'Mutalist Alad V': 'Муталист Алад V',
    'Ambulas': 'Амбулас', 'Raptor': 'Раптор', 'Hyena Pack': 'Стая гиен',
    'Jackal': 'Шакал', 'Phorid': 'Форид', 'Lephantis': 'Лефантис',
    'Ropalolyst': 'Ропалолист', 'Exploiter Orb': 'Эксплоитер', 'Profit-Taker': 'Грабитель',
    'Eidolon Teralyst': 'Терралист', 'Eidolon Gantulyst': 'Гантулист', 
    'Eidolon Hydrolyst': 'Гидролист', 'Archon Amar': 'Архонт Амар',
    'Archon Boreal': 'Архонт Бореал', 'Archon Nira': 'Архонт Нира'
};

const MODIFIER_NAMES = {
    'Radiation hazard': 'Радиационная опасность',
    'Augmented enemy armor': 'Усиленная броня врагов',
    'Augmented Enemy Armor': 'Усиленная броня врагов',
    'Elemental buffs (Corrosive)': 'Элементальный бафф (Коррозия)',
    'Elemental buffs (Radiation)': 'Элементальный бафф (Радиация)',
    'Elemental buffs (Magnetic)': 'Элементальный бафф (Магнит)',
    'Elemental buffs (Viral)': 'Элементальный бафф (Вирус)',
    'Elemental buffs (Gas)': 'Элементальный бафф (Газ)',
    'Elemental buffs (Blast)': 'Элементальный бафф (Взрыв)',
    'Energy Reduction': 'Снижение энергии',
    'Eximus Stronghold': 'Оплот Экзимусов',
    'Physical Enhancement': 'Физическое усиление',
    'Enemy Elemental Enhancement': 'Элементальное усиление врагов',
    'Weapon restriction (Rifle Only)': 'Ограничение: только винтовки',
    'Weapon restriction (Shotgun Only)': 'Ограничение: только дробовики',
    'Weapon restriction (Secondary Only)': 'Ограничение: только пистолеты',
    'Weapon restriction (Melee Only)': 'Ограничение: только ближний бой',
    'Weapon restriction (Bow Only)': 'Ограничение: только луки',
    'Weapon restriction (Sniper Only)': 'Ограничение: только снайперки'
};

const REWARD_NAMES = {
    'Fieldron': 'Филдрон', 'Detonite Injector': 'Инжектор детонита',
    'Mutagen Mass': 'Масса мутагена', 'Mutalist Alad V Nav Coordinate': 'Координаты Муталист Алада V',
    'Orokin Catalyst Blueprint': 'Чертёж катализатора Орокин',
    'Orokin Reactor Blueprint': 'Чертёж реактора Орокин',
    'Forma Blueprint': 'Чертёж Формы', 'Exilus Adapter': 'Адаптер Эксилус',
    // Оружие Вандал/Призрак
    'Wraith Twin Vipers': 'Парные Гадюки Призрак',
    'Latron Wraith': 'Латрон Призрак', 'Latron Wraith Barrel': 'Латрон Призрак: Ствол',
    'Latron Wraith Stock': 'Латрон Призрак: Приклад', 'Latron Wraith Receiver': 'Латрон Призрак: Ресивер',
    'Latron Wraith Blueprint': 'Латрон Призрак: Чертёж',
    'Strun Wraith': 'Струн Призрак', 'Strun Wraith Barrel': 'Струн Призрак: Ствол',
    'Strun Wraith Stock': 'Струн Призрак: Приклад', 'Strun Wraith Receiver': 'Струн Призрак: Ресивер',
    'Strun Wraith Blueprint': 'Струн Призрак: Чертёж',
    'Karak Wraith': 'Карак Призрак', 'Karak Wraith Barrel': 'Карак Призрак: Ствол',
    'Karak Wraith Stock': 'Карак Призрак: Приклад', 'Karak Wraith Receiver': 'Карак Призрак: Ресивер',
    'Karak Wraith Blueprint': 'Карак Призрак: Чертёж',
    'Snipetron Vandal': 'Снайптрон Вандал', 'Snipetron Vandal Barrel': 'Снайптрон Вандал: Ствол',
    'Snipetron Vandal Stock': 'Снайптрон Вандал: Приклад', 'Snipetron Vandal Receiver': 'Снайптрон Вандал: Ресивер',
    'Snipetron Vandal Blueprint': 'Снайптрон Вандал: Чертёж',
    'Dera Vandal': 'Дера Вандал', 'Dera Vandal Barrel': 'Дера Вандал: Ствол',
    'Dera Vandal Stock': 'Дера Вандал: Приклад', 'Dera Vandal Receiver': 'Дера Вандал: Ресивер',
    'Dera Vandal Blueprint': 'Дера Вандал: Чертёж',
    'Sheev': 'Шив', 'Sheev Blade': 'Шив: Лезвие', 'Sheev Heatsink': 'Шив: Радиатор',
    'Sheev Hilt': 'Шив: Рукоять', 'Sheev Blueprint': 'Шив: Чертёж',
    'Twin Vipers Wraith': 'Парные Гадюки Призрак', 'Twin Vipers Wraith Barrel': 'Парные Гадюки Призрак: Ствол',
    'Twin Vipers Wraith Receiver': 'Парные Гадюки Призрак: Ресивер', 
    'Twin Vipers Wraith Blueprint': 'Парные Гадюки Призрак: Чертёж'
};

function translatePlanet(location) {
    // location формат: "Planet/Node" например "Earth/Mantle"
    const parts = location.split('/');
    if (parts.length === 2) {
        const planet = PLANET_NAMES[parts[0]] || parts[0];
        return `${planet}/${parts[1]}`;
    }
    return location;
}

function translatePlanetOnly(location) {
    const parts = location.split('/');
    return PLANET_NAMES[parts[0]] || parts[0];
}

function translateBoss(boss) {
    return BOSS_NAMES[boss] || boss;
}

function translateModifier(mod) {
    return MODIFIER_NAMES[mod] || mod;
}

function translateReward(reward) {
    return REWARD_NAMES[reward] || reward;
}

function translateMission(type) {
    return MISSION_TYPES[type] || type;
}

function translateFaction(faction) {
    return FACTION_NAMES[faction] || faction;
}

function translateTier(tier) {
    return TIER_NAMES[tier] || tier;
}

function formatTimeLeft(endTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTimestamp - now;
    
    if (diff <= 0) return 'Завершено';
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
}

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

// База модов
const modsDB = require('./mods_database.json');

// Логи загрузки
console.log('✓ Загружено оружия:');
console.log(`  Primary: ${Object.keys(weaponsPrimary).length}`);
console.log(`  Secondary: ${Object.keys(weaponsSecondary).length}`);
console.log(`  Melee: ${Object.keys(weaponsMelee).length}`);
console.log(`✓ Загружено варфреймов Дувири: ${Object.keys(warframesDuviri).length}`);
console.log(`✓ Загружено модов: ${Object.keys(modsDB).length}`);

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

// Меню команд
bot.telegram.setChatMenuButton({
    menu_button: {
        type: 'commands'
    }
}).catch(err => console.log('Не удалось установить меню:', err));

// Регистрация команд
bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Главное меню' },
    { command: 'time', description: '🌍 Циклы миров' },
    { command: 'fissures', description: '☢️ Разломы Бездны' },
    { command: 'sortie', description: '📋 Вылазки' },
    { command: 'baro', description: '🚑 Баро Ки\'Тиир' },
    { command: 'invasions', description: '⚔️ Вторжения' },
    { command: 'syndicates', description: '📜 Фракции' },
    { command: 'search', description: '🔍 Поиск варфрейма' },
    { command: 'mod', description: '🔧 Информация о моде' },
    { command: 'chain_frame', description: '⛓️‍💥 Цепь Дувири (варфреймы)' },
    { command: 'chain_guns', description: '🔫 Цепь Дувири (оружие)' },
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
            message += `⏳ *Статус:* Будет доступен на ${weaponWeek} неделе (сейчас ${currentWeek} из 8)\n`;
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
    // Правильные способности для Гельминта (проверено по вики)
    "Ash": { ability: "Сюрикен", slot: 1 },
    "Atlas": { ability: "Окаменение", slot: 3 },
    "Banshee": { ability: "Тишина", slot: 2 },
    "Baruuk": { ability: "Усыпление", slot: 2 },
    "Caliban": { ability: "Ликвидатор", slot: 2 },
    "Chroma": { ability: "Элементальный Оберег", slot: 2 },
    "Citrine": { ability: "Раскалывающий Взрыв", slot: 2 },
    "Dagath": { ability: "Зловещие Косы", slot: 2 },
    "Ember": { ability: "Огненный Шквал", slot: 3 },
    "Equinox": { ability: "Покой и Провокация", slot: 2 },
    "Excalibur": { ability: "Ослепляющий Свет", slot: 2 },
    "Frost": { ability: "Ледяная Волна", slot: 2 },
    "Gara": { ability: "Спектрошторм", slot: 3 },
    "Garuda": { ability: "Кровавый Алтарь", slot: 2 },
    "Gauss": { ability: "Термальный Подрыв", slot: 3 },
    "Grendel": { ability: "Насыщение", slot: 2 },
    "Gyre": { ability: "Кольцо Катерсис", slot: 2 },
    "Harrow": { ability: "Осуждение", slot: 1 },
    "Hildryn": { ability: "Грабёж", slot: 2 },
    "Hydroid": { ability: "Шторм Темпестарии", slot: 1 },
    "Inaros": { ability: "Иссушение", slot: 1 },
    "Ivara": { ability: "Колчан", slot: 1 },
    "Khora": { ability: "Захват", slot: 2 },
    "Kullervo": { ability: "Возмездие", slot: 2 },
    "Lavos": { ability: "Ядовитые Змеи", slot: 1 },
    "Limbo": { ability: "Изгнание", slot: 1 },
    "Loki": { ability: "Обманка", slot: 1 },
    "Mag": { ability: "Притягивание", slot: 1 },
    "Mesa": { ability: "Тир", slot: 2 },
    "Mirage": { ability: "Затмение", slot: 3 },
    "Nekros": { ability: "Устрашение", slot: 2 },
    "Nezha": { ability: "Огненный Путь", slot: 1 },
    "Nidus": { ability: "Личинка", slot: 2 },
    "Nova": { ability: "Нуль-Звезда", slot: 1 },
    "Nyx": { ability: "Контроль Разума", slot: 1 },
    "Oberon": { ability: "Кара", slot: 1 },
    "Octavia": { ability: "Резонатор", slot: 3 },
    "Protea": { ability: "Раздатчик", slot: 3 },
    "Qorvex": { ability: "Хитиновая Стена", slot: 2 },
    "Revenant": { ability: "Жатва", slot: 3 },
    "Rhino": { ability: "Рёв", slot: 3 },
    "Saryn": { ability: "Линька", slot: 2 },
    "Sevagoth": { ability: "Уныние", slot: 3 },
    "Styanax": { ability: "Метательное Копьё", slot: 1 },
    "Titania": { ability: "Чары", slot: 1 },
    "Trinity": { ability: "Источник Жизни", slot: 1 },
    "Valkyr": { ability: "Боевой Клич", slot: 2 },
    "Vauban": { ability: "Тесла Нервос", slot: 1 },
    "Volt": { ability: "Шок", slot: 1 },
    "Voruna": { ability: "Волчья Стая", slot: 1 },
    "Wisp": { ability: "Прорыв", slot: 3 },
    "Wukong": { ability: "Неповиновение", slot: 3 },
    "Xaku": { ability: "Шёпот Ксаты", slot: 1 },
    "Yareli": { ability: "Водный Заслон", slot: 2 },
    "Zephyr": { ability: "Воздушный Рывок", slot: 1 },
	"Temple": { ability: "Пиротехника", slot: 1 },
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
// ЦИКЛЫ МИРОВ - ДАННЫЕ ИЗ API + FALLBACK
// ========================================================================

// Константы из API tenno.tools (fallback если API недоступен)
const CYCLE_DEFAULTS = {
    cetus: { start: 1509371722, length: 8998.8748, dayStart: 2249.7187, dayEnd: 8248.9686 },
    fortuna: { start: 1542131224, length: 1600, dayStart: 800, dayEnd: 1200 },
    earth: { start: 1509371722, length: 8998.8748, dayStart: 2249.7187, dayEnd: 8248.9686 }
};

// Кэш данных о циклах из API
let cyclesDataCache = null;
let cyclesDataCacheTime = 0;

// Рассчитать статус цикла по данным API
function calculateCycleFromAPI(cycleData) {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - cycleData.start;
    const posInCycle = ((elapsed % cycleData.length) + cycleData.length) % cycleData.length;
    
    // "День" = между dayStart и dayEnd
    const isDay = posInCycle >= cycleData.dayStart && posInCycle < cycleData.dayEnd;
    
    let timeLeftSec;
    if (isDay) {
        timeLeftSec = cycleData.dayEnd - posInCycle;
    } else if (posInCycle < cycleData.dayStart) {
        timeLeftSec = cycleData.dayStart - posInCycle;
    } else {
        timeLeftSec = (cycleData.length - posInCycle) + cycleData.dayStart;
    }
    
    return { isDay, timeLeftSec };
}

function formatCycleTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function getCycleStatus(locationKey) {
    // ЦЕТУС
    if (locationKey === 'Равнины Эйдолона' || locationKey === 'Цетус') {
        const data = CYCLE_DEFAULTS.cetus;
        const { isDay, timeLeftSec } = calculateCycleFromAPI(data);
        return {
            phase: isDay ? 'День' : 'Ночь',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isDay
        };
    }
    
    // ФОРТУНА (day в API = Тепло)
    if (locationKey === 'Фортуна') {
        const data = CYCLE_DEFAULTS.fortuna;
        const { isDay, timeLeftSec } = calculateCycleFromAPI(data);
        return {
            phase: isDay ? 'Тепло' : 'Холод',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isDay
        };
    }
    
    // ДЕЙМОС (100 мин Фэз + 50 мин Воум = 150 мин цикл)
    // Откалибровано 07.12.2025
    if (locationKey === 'Камбионский Дрейф' || locationKey === 'Деймос') {
        const DEIMOS_START = 1765103388;
        const DEIMOS_LENGTH = 9000; // 150 минут в секундах
        const DEIMOS_FASS_END = 6000; // 100 минут Фэз
        
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - DEIMOS_START;
        const pos = ((elapsed % DEIMOS_LENGTH) + DEIMOS_LENGTH) % DEIMOS_LENGTH;
        const isFass = pos < DEIMOS_FASS_END;
        
        const timeLeftSec = isFass ? (DEIMOS_FASS_END - pos) : (DEIMOS_LENGTH - pos);
        
        return {
            phase: isFass ? 'Фэз' : 'Воум',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isFass
        };
    }
    
    // ЗАРУМАН (90 мин каждая фаза)
    if (locationKey === 'Заруман') {
        const ZARIMAN_START = 1650456000;
        const ZARIMAN_LENGTH = 10800; // 3 часа
        const ZARIMAN_CORPUS_END = 5400; // 1.5 часа
        
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - ZARIMAN_START;
        const pos = ((elapsed % ZARIMAN_LENGTH) + ZARIMAN_LENGTH) % ZARIMAN_LENGTH;
        const isCorpus = pos < ZARIMAN_CORPUS_END;
        
        const timeLeftSec = isCorpus ? (ZARIMAN_CORPUS_END - pos) : (ZARIMAN_LENGTH - pos);
        
        return {
            phase: isCorpus ? 'Корпус' : 'Гринир',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isCorpus
        };
    }
    
    // ЗЕМЛЯ
    if (locationKey === 'Земля') {
        const data = CYCLE_DEFAULTS.earth;
        const { isDay, timeLeftSec } = calculateCycleFromAPI(data);
        return {
            phase: isDay ? 'День' : 'Ночь',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isDay
        };
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
            const emoji = earth.isDay ? '🌕' : '🌑';
            return `🌍 *Земля*\n\n${emoji} ${earth.state}\n⏳ До смены: ${earth.timeLeft}`;
        } else if (targetLocation === 'Цетус') {
            const cetus = getCycleStatus('Равнины Эйдолона');
            const emoji = cetus.phase === 'День' ? '🌕' : '🌑';
            return `🌍 *Цетус*\n\n${emoji} ${cetus.phase}\n⏳ До смены: ${cetus.timeLeft}`;
        } else if (targetLocation === 'Фортуна') {
            const fortuna = getCycleStatus('Фортуна');
            const emoji = fortuna.phase === 'Тепло' ? '🔥' : '🧊';
            return `🌍 *Фортуна*\n\n${emoji} ${fortuna.phase}\n⏳ До смены: ${fortuna.timeLeft}`;
        } else if (targetLocation === 'Деймос') {
            const deimos = getCycleStatus('Камбионский Дрейф');
            const emoji = deimos.phase === 'Фэз' ? '🦠' : '🥒';
            return `🌍 *Деймос*\n\n${emoji} ${deimos.phase}\n⏳ До смены: ${deimos.timeLeft}`;
        }
    }
    
    // Показываем все циклы
    const earth = getEarthCycle();
    const cetus = getCycleStatus('Равнины Эйдолона');
    const fortuna = getCycleStatus('Фортуна');
    const deimos = getCycleStatus('Камбионский Дрейф');
    
    let message = `🌍 *ЦИКЛЫ*\n\n`;
    
    // Земля
    const earthEmoji = earth.isDay ? '🌕' : '🌑';
    message += `*Земля:* ${earthEmoji} ${earth.state}\n`;
    message += `⏳ До смены: ${earth.timeLeft}\n\n`;
    
    // Цетус (Равнины Эйдолона)
    const cetusEmoji = cetus.phase === 'День' ? '🌕' : '🌑';
    message += `*Цетус:* ${cetusEmoji} ${cetus.phase}\n`;
    message += `⏳ До смены: ${cetus.timeLeft}\n\n`;
    
    // Фортуна
    const fortunaEmoji = fortuna.phase === 'Тепло' ? '🔥' : '🧊';
    message += `*Фортуна:* ${fortunaEmoji} ${fortuna.phase}\n`;
    message += `⏳ До смены: ${fortuna.timeLeft}\n\n`;
    
    // Деймос
    const deimosEmoji = deimos.phase === 'Фэз' ? '🦠' : '🥒';
    message += `*Деймос:* ${deimosEmoji} ${deimos.phase}\n`;
    message += `⏳ До смены: ${deimos.timeLeft}`;
    
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
        message += `🧬 *Гельминт-способность:*\n`;
        message += `• ${info.helminth.ability}\n\n`;
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
        
        if (isCurrentWeek) {
            message += `✅ *Доступен СЕЙЧАС!*\n`;
        } else {
            message += `⏳ Будет доступен на ${info.duviri.week} неделе (сейчас ${currentWeek} из 11)\n`;
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
            Markup.button.callback('⛓️‍💥 Цепь (оружие)', 'cmd_chain_guns')
        ],
        [
            Markup.button.callback('⛓️‍💥 Цепь (варфреймы)', 'cmd_chain_frame'),
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
                '🚀 *Основное оружие*\n\n' +
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
                '🪓 *Ближнее оружие*\n\n' +
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
// КОМАНДА /fissures - РАЗЛОМЫ БЕЗДНЫ
// ========================================================================

bot.command(['fissures', 'fissure', 'разломы'], async (ctx) => {
    console.log('🔥 Команда /fissures вызвана');
    
    try {
        const ws = await getWorldstate();
        
        if (!ws || !ws.fissures || !ws.fissures.data) {
            return ctx.reply('❌ Не удалось получить данные о разломах.');
        }
        
        const fissures = ws.fissures.data;
        
        if (fissures.length === 0) {
            return ctx.reply('🔥 Нет активных разломов.');
        }
        
        // Группируем по тирам
        const byTier = {};
        fissures.forEach(f => {
            if (!f.hard) { // Обычные, не Steel Path
                const tier = f.tier || 'Unknown';
                if (!byTier[tier]) byTier[tier] = [];
                byTier[tier].push(f);
            }
        });
        
        let message = '☢️ *Разломы Бездны:*\n\n';
        
        const tierOrder = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia'];
        
        tierOrder.forEach(tier => {
            if (byTier[tier] && byTier[tier].length > 0) {
                message += `*${translateTier(tier)}:*\n`;
                byTier[tier].slice(0, 3).forEach(f => {
                    const mission = translateMission(f.missionType);
                    const location = translatePlanet(f.location);
                    const timeLeft = formatTimeLeft(f.end);
                    message += `• ${mission} — ${location}\n`;
                    message += `  ⏳ ${timeLeft}\n`;
                });
                message += '\n';
            }
        });
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /fissures:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /sortie - ВЫЛАЗКИ
// ========================================================================

bot.command(['sortie', 'вылазка', 'вылазки'], async (ctx) => {
    console.log('📋 Команда /sortie вызвана');
    
    try {
        const ws = await getWorldstate();
        
        if (!ws || !ws.sorties || !ws.sorties.data || ws.sorties.data.length === 0) {
            return ctx.reply('❌ Не удалось получить данные о вылазках.');
        }
        
        const sortie = ws.sorties.data[0];
        
        let message = '📋 *Вылазка дня*\n\n';
        message += `💀 Босс: *${translateBoss(sortie.bossName) || 'Неизвестен'}*\n`;
        message += `🔪 Фракция: ${translateFaction(sortie.faction)}\n`;
        message += `⏳ До конца: ${formatTimeLeft(sortie.end)}\n\n`;
        
        if (sortie.missions && sortie.missions.length > 0) {
            message += '*Миссии:*\n';
            sortie.missions.forEach((m, i) => {
                const mission = translateMission(m.missionType);
                const location = translatePlanet(m.location);
                message += `\n*${i + 1}. ${mission}*\n`;
                message += `📌 ${location}\n`;
                if (m.modifier) {
                    message += `🌀 ${translateModifier(m.modifier)}\n`;
                }
            });
        }
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /sortie:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /baro - БАРО КИ'ТИИР
// ========================================================================

bot.command(['baro', 'баро', 'торговец'], async (ctx) => {
    console.log('🚑 Команда /baro вызвана');
    
    try {
        const ws = await getWorldstate();
        
        if (!ws || !ws.voidtrader) {
            return ctx.reply('❌ Не удалось получить данные о Баро.');
        }
        
        const baro = ws.voidtrader.data;
        
        let message = '🚑 *Баро Ки\'Тиир*\n\n';
        
        if (baro.active) {
            message += `📌 Локация: *${baro.location}*\n`;
            message += `⏳ Улетит через: ${formatTimeLeft(baro.end)}\n\n`;
            
            if (baro.items && baro.items.length > 0) {
                message += `📦 *Товары (${baro.items.length}):*\n`;
                baro.items.slice(0, 15).forEach(item => {
                    message += `• ${item.name}`;
                    if (item.ducats) message += ` — ${item.ducats}🦆`;
                    if (item.credits) message += ` ${item.credits}💰`;
                    message += '\n';
                });
                if (baro.items.length > 15) {
                    message += `\n_...и ещё ${baro.items.length - 15} товаров_`;
                }
            }
        } else {
            message += `⏳ Прилетит через: *${formatTimeLeft(baro.start)}*\n`;
            message += `📌 Реле: ${baro.location || 'Неизвестно'}`;
        }
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /baro:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /invasions - ВТОРЖЕНИЯ
// ========================================================================

// Функция создания прогресс-бара для вторжений
function makeInvasionProgressBar(score, endScore) {
    const totalBlocks = 10;
    // score: отрицательный = побеждает defender, положительный = побеждает attacker
    // endScore — сколько нужно для победы
    // Показываем прогресс к победе каждой стороны
    
    // Нормализуем: -1 (defender победил) до +1 (attacker победил)
    const normalized = score / endScore; // от -1 до +1
    
    // Конвертируем в 0-10: 0 = defender победил, 10 = attacker победил, 5 = равенство
    const attackerBlocks = Math.round((normalized + 1) * 5);
    
    let bar = '';
    for (let i = 0; i < totalBlocks; i++) {
        bar += i < attackerBlocks ? '🟥' : '🟩';
    }
    return bar;
}

// Функция форматирования даты
function formatInvasionDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${mins}`;
}

// Функция оценки времени окончания вторжения
function estimateInvasionEnd(inv) {
    if (!inv.scoreHistory || inv.scoreHistory.length < 2) {
        return null;
    }
    
    // Берём последние точки для оценки скорости
    const history = inv.scoreHistory.filter(h => h[0] > 0); // убираем отрицательные таймстемпы
    if (history.length < 2) return null;
    
    const last = history[history.length - 1];
    const prev = history[Math.max(0, history.length - 10)]; // 10 точек назад для усреднения
    
    const timeDiff = last[0] - prev[0];
    const scoreDiff = last[1] - prev[1];
    
    if (timeDiff <= 0 || scoreDiff === 0) return null;
    
    const scorePerSec = scoreDiff / timeDiff;
    const currentScore = inv.score;
    const endScore = inv.endScore;
    
    // Определяем сколько осталось до победы одной из сторон
    let remainingScore;
    if (scorePerSec > 0) {
        // Attacker побеждает
        remainingScore = endScore - currentScore;
    } else {
        // Defender побеждает
        remainingScore = endScore + currentScore;
    }
    
    const remainingTime = Math.abs(remainingScore / scorePerSec);
    return Math.floor(Date.now() / 1000 + remainingTime);
}

// Функция получения типа миссии из location
function getInvasionMissionType(location) {
    // Можно добавить маппинг нод к типам миссий, пока используем API данные если есть
    return null;
}

bot.command(['invasions', 'invasion', 'вторжения'], async (ctx) => {
    console.log('⚔️ Команда /invasions вызвана');
    
    try {
        const ws = await getWorldstate();
        
        if (!ws || !ws.invasions || !ws.invasions.data) {
            return ctx.reply('❌ Не удалось получить данные о вторжениях.');
        }
        
        const invasions = ws.invasions.data.filter(i => {
            // Фильтруем завершённые (score достиг endScore)
            return Math.abs(i.score) < i.endScore;
        });
        
        if (invasions.length === 0) {
            return ctx.reply('⚔️ Нет активных вторжений.');
        }
        
        let message = '👾 *Вторжения:*\n\n';
        
        invasions.slice(0, 6).forEach(inv => {
            // Даты
            const startDate = formatInvasionDate(inv.start);
            const endEstimate = estimateInvasionEnd(inv);
            const endDate = endEstimate ? formatInvasionDate(endEstimate) : '??:??';
            
            message += `${startDate} ~ ${endDate}\n`;
            
            // Прогресс-бар
            const progressBar = makeInvasionProgressBar(inv.score, inv.endScore);
            message += `${progressBar}\n`;
            
            // Награды
            const rewards = [];
            if (inv.rewardsAttacker && inv.rewardsAttacker.items) {
                inv.rewardsAttacker.items.forEach(item => {
                    const name = translateReward(item.name);
                    rewards.push(item.count > 1 ? `${name} x${item.count}` : name);
                });
            }
            if (inv.rewardsDefender && inv.rewardsDefender.items) {
                inv.rewardsDefender.items.forEach(item => {
                    const name = translateReward(item.name);
                    rewards.push(item.count > 1 ? `${name} x${item.count}` : name);
                });
            }
            
            if (rewards.length > 0) {
                message += `${rewards.join(' / ')}\n`;
            }
            
            // Локация и прогресс
            const planet = translatePlanetOnly(inv.location);
            const progress = Math.abs(inv.score / inv.endScore * 100).toFixed(2);
            message += `${planet} (${progress}%)\n`;
            message += `─────────────────────────\n`;
        });
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /invasions:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// КОМАНДА /syndicates - СИНДИКАТЫ
// ========================================================================

// База данных синдикатов
const SYNDICATES_DB = {
    earth: {
        name: '🌍 Земля',
        location: 'Земля',
        syndicates: [
            {
                id: 'cetus_hub',
                name: '🌅 Цетус',
                isSubmenu: true,
                location: 'Равнины Эйдолона'
            },
            {
                id: 'kahl',
                name: 'Гарнизон Кахла',
                leader: 'Кахл-175',
                location: 'Лагерь Скитальца',
                ranks: ['Посторонний', 'Брат по оружию', 'Друг', 'Защитник', 'Семья'],
                rewards: ['Части Стинакса', 'Моды Архонтов', 'Косметика Гринир'],
                howToRank: 'Еженедельные миссии Кахла'
            }
        ]
    },
    cetus: {
        name: '🌅 Цетус',
        location: 'Равнины Эйдолона',
        parentLocation: 'earth',
        syndicates: [
            {
                id: 'ostron',
                name: 'Острон',
                leader: 'Конзу',
                ranks: ['Чужак', 'Гость', 'Знакомый', 'Друг', 'Родич'],
                rewards: ['Части Гаруды', 'Части Ревенанта', 'ЗО (оружие ближнего боя)', 'Удочки|Наживка'],
                howToRank: 'Задания на Равнинах Эйдолона, сдача рыбы и минералов'
            },
            {
                id: 'quills',
                name: 'Перья',
                leader: 'Онкко',
                ranks: ['Нейтрал', 'Мот', 'Наблюдатель', 'Медиум', 'Оператор'],
                rewards: ['АМПы (усилитель оператора)', 'Арканы Эйдолона', 'Фокус-линзы'],
                howToRank: 'Сдача осколков Эйдолонов (Терралист, Гантулист, Гидролист)'
            },
            {
                id: 'ostron_ops',
                name: 'Операционное Снабжение',
                leader: 'Накак',
                ranks: ['Нет рангов'],
                rewards: ['Декорации', 'Маски', 'Скины оружия', 'Косметика'],
                howToRank: 'Покупка за кредиты и ресурсы Цетуса'
            }
        ]
    },
    fortuna: {
        name: '🪐 Фортуна',
        location: 'Венера, Долина Сфер',
        syndicates: [
            {
                id: 'solaris',
                name: 'Объединение Солярис',
                leader: 'Юдико',
                ranks: ['Нейтрал', 'Чужеземец', 'Пройдоха', 'Исполнитель', 'Приятель', 'Товарищ'],
                rewards: ['Части Гарруды', 'Части Барука', 'Китганы (вторичка)', 'К-драйвы', 'Рыболовное снаряжение'],
                howToRank: 'Задания (баунти) в Долине Сфер, сдача рыбы, минералов и долговых обязательств'
            },
            {
                id: 'vox',
                name: 'Глас Солярис',
                leader: 'Уточка',
                ranks: ['Нейтрал', 'Оперативник', 'Агент', 'Длань', 'Инструмент', 'Тень'],
                rewards: ['Части Хильдрин', 'Части Баррука', 'моды', 'части усилителя для оператора'],
                howToRank: 'Охота на Сферы (Сфера Эксплуатации, Сфера Извлечения Прибыли)'
            },
            {
                id: 'ventkids',
                name: 'Дети Труб',
                leader: 'Роки',
                ranks: ['Нейтрал', 'Блестяшка', 'Ктоита', 'Свой Пацан', 'Крутой', 'Логический'],
                rewards: ['К-драйвы', 'Части К-драйвов', 'Моды для К-драйвов', 'Косметика'],
                howToRank: 'Гонки на К-драйвах, трюки в Долине Сфер'
            },
            {
                id: 'shadowdebt',
                name: 'Мракомор',
                leader: 'Мракомор',
                ranks: ['Нейтрал', 'ранг1', 'ранг2', 'ранг3', 'ранг4'],
                rewards: ['Части Nokko', 'Моды', 'Ресурсы'],
                howToRank: 'Заказы Мракомора (Сбор грибов на заказах)'
            }
        ]
    },
    deimos: {
        name: '🦠 Деймос',
        location: 'Камбионский Дрейф | Санктум Анатомика',
        syndicates: [
            {
                id: 'entrati',
                name: 'Энтрати',
                leader: 'Мать',
                ranks: ['Нейтрал', 'Незнакомец', 'Знакомый', 'Союзник', 'Друг', 'Семья'],
                rewards: ['Части Заку', 'Петы: Вульпафила/Презалит', 'Некрамех'],
                howToRank: 'Задания на Деймосе, Изоляционные хранилища'
            },
            {
                id: 'necraloid',
                name: 'НекраЛоид',
                leader: 'НекраЛоид',
                ranks: ['Нейтрал', 'Очищение: Агнезис', 'Очищение: Модус', 'Очищение: Одима'],
                rewards: ['Части Некрамехов', 'Части Оружия для Некрамеха', 'Декорации Некрамеха'],
                howToRank: 'Сдача матриц из Изоляционных хранилищ'
            },
            {
                id: 'cavia',
                name: 'Кавия',
                leader: 'Лоид (Санктум)',
                location: 'Санктум Анатомика',
                ranks: ['Нейтрал', 'Помощник', 'Исследователь', 'Коллега', 'Ученый', 'Просветлённый'],
                rewards: ['Части Корвекса'],
                howToRank: 'Архивы Энтрати, Заказы Санктум Анатомики'
            }
        ]
    },
	
	hex: {
        name: '🍕 Гекс',
        location: 'Хёльвания (1999)',
        syndicates: [
            {
                id: 'hex',
                name: 'Гекс',
                leader: 'Артур Найтингейл',
                ranks: ['Нейтрал', 'Остатки', 'Свежий Ломтик', '2-за-1', 'Горячий и Свежий', 'Пицца-Вечеринка'],
                rewards: ['Части Цита-09', 'Оружие Хёльвании', 'Моды', 'Мистики', 'Зараженное Оружие(Техноцит Кода)'],
                howToRank: 'Заказы в Хёльвании, продажа предметов с заданий'
            }
        ]
    },
    zariman: {
        name: '👩🏻‍🚀 Зариман',
        location: 'Зариман 10-0',
        syndicates: [
            {
                id: 'holdfasts',
                name: 'Неукротимые',
                leader: 'Куинн',
                ranks: ['Нейтрал', 'Падший', 'Хранитель', 'Страж', 'Серафим', 'Ангел'],
                rewards: ['Джайра (заказы у Квилла)', 'Воруна|Сарофанг|Перигаль(Йонда)', 'Мистики', 'Иннодем|Феларкс|Фенмор|Прадос|Эфемеры(Кавальеро)'],
                howToRank: 'Заказы на Заримане (Каскад, Потоп, Армагеддон), сдача перьев'
            }
        ]
    },
    relay: {
        name: '👨‍👨‍👧‍👧 Синдикаты',
        location: 'Станции в Солнечной системе',
        syndicates: [
            {
                id: 'steel_meridian',
                name: 'Стальной Меридиан',
                leader: 'Крессы Тал',
                ranks: ['Нейтрал', 'Беженец', 'Спаситель', 'Защитник', 'Генерал'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'arbiters',
                name: 'Арбитры Гексиса',
                leader: 'Арбитр',
                ranks: ['Нейтрал', 'Ученик', 'Максим', 'Арбитратор', 'Проводник'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'cephalon_suda',
                name: 'Цефалон Суда',
                leader: 'Суда',
                ranks: ['Нейтрал', 'Посетитель', 'Запрос', 'Гений', 'Судья'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'perrin',
                name: 'Последовательность Перрина',
                leader: 'Эрго Глас',
                ranks: ['Нейтрал', 'Стажёр', 'Аналитик', 'Эксперт', 'Партнёр'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'red_veil',
                name: 'Красная Вуаль',
                leader: 'Кантис',
                ranks: ['Нейтрал', 'Незнакомец', 'Освобождённый', 'Преданный', 'Фанатик'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'new_loka',
                name: 'Новая Лока',
                leader: 'Амарин',
                ranks: ['Нейтрал', 'Обновлённый', 'Пробуждённый', 'Титан', 'Предводитель'],
                rewards: ['Аугменты Варфреймов', 'Оружие синдиката', 'Арчвинг моды'],
                howToRank: 'Ношение сигила, задания синдиката, медальоны'
            },
            {
                id: 'simaris',
                name: 'Цефалон Симэрис',
                leader: 'Симэрис',
                ranks: ['Нет рангов'],
                rewards: ['Чертежи варфреймов', 'Оружие', 'Моды для сканера'],
                howToRank: 'Сканирование врагов, ежедневные задания синтеза'
            },
            {
                id: 'conclave',
                name: 'Конклав',
                leader: 'Тешин',
                location: 'Зал Конклава',
                ranks: ['Нейтрал', 'Путник', 'Охотник', 'Соискатель', 'Мастер', 'Великий Мастер'],
                rewards: ['PvP моды', 'Скины оружия', 'Сигилы', 'Косметика', 'Кува'],
                howToRank: 'PvP матчи (Аннигиляция, Командная Аннигиляция, Люнаро)'
            }
        ]
    },
    global: {
        name: '📻 Ночная Волна',
        location: 'Везде',
        syndicates: [
            {
                id: 'nightwave',
                name: 'Ночная Волна',
                leader: 'Ночная Нора',
                ranks: ['30 рангов наград'],
                rewards: ['Слоты', 'Ауры', 'Альтернативные шлемы', 'Нитаин', 'Косметика'],
                howToRank: 'Ежедневные и еженедельные задания Ночной Волны'
            }
        ]
    }
};

// Главное меню синдикатов
bot.command(['syndicates', 'syndicate', 'синдикаты', 'синдикат'], async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌍 Земля', 'synd_earth'), Markup.button.callback('🪐 Фортуна', 'synd_fortuna')],
        [Markup.button.callback('🦠 Деймос', 'synd_deimos'), Markup.button.callback('👩🏻‍🚀 Зариман', 'synd_zariman')],
        [Markup.button.callback('🍕 1999', 'synd_hex'), Markup.button.callback('👨‍👨‍👧‍👧 Синдикаты', 'synd_relay')],
        [Markup.button.callback('📻 Ночная Волна', 'synd_global')]
    ]);
    
    await ctx.reply('🏛 *Фракции*\n\nВыберите локацию:', { 
        parse_mode: 'Markdown',
        ...keyboard 
    });
});

// Кнопка "Назад" в главное меню (должна быть ПЕРЕД регуляркой synd_)
bot.action('synd_back', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌍 Земля', 'synd_earth'), Markup.button.callback('🪐 Фортуна', 'synd_fortuna')],
        [Markup.button.callback('🦠 Деймос', 'synd_deimos'), Markup.button.callback('👩🏻‍🚀 Зариман', 'synd_zariman')],
        [Markup.button.callback('🍕 1999', 'synd_hex'), Markup.button.callback('👨‍👨‍👧‍👧 Синдикаты', 'synd_relay')],
        [Markup.button.callback('📻 Ночная Волна', 'synd_global')]
    ]);
    
    await ctx.editMessageText('🏛 *Фракции*\n\nВыберите локацию:', { 
        parse_mode: 'Markdown',
        ...keyboard 
    });
    await ctx.answerCbQuery();
});

// Обработчик выбора локации
bot.action(/^synd_(\w+)$/, async (ctx) => {
    const locationId = ctx.match[1];
    const locationData = SYNDICATES_DB[locationId];
    
    if (!locationData) {
        return ctx.answerCbQuery('Локация не найдена');
    }
    
    // Если синдикат только один и это не подменю — сразу показываем информацию
    if (locationData.syndicates.length === 1 && !locationData.syndicates[0].isSubmenu) {
        const syndicate = locationData.syndicates[0];
        
        let message = `📜 *${syndicate.name}*\n\n`;
        message += `📌 Локация: ${locationData.location}${syndicate.location ? ` (${syndicate.location})` : ''}\n`;
        message += `👑 Лидер: ${syndicate.leader}\n\n`;
        
        message += `📊 *Ранги:*\n`;
        syndicate.ranks.forEach((rank, i) => {
            message += `${i + 1}. ${rank}\n`;
        });
        
        message += `\n🎁 *Что можно получить:*\n`;
        syndicate.rewards.forEach(reward => {
            message += `• ${reward}\n`;
        });
        
        message += `\n💡 *Как качать:* ${syndicate.howToRank}`;
        
        const backButton = locationData.parentLocation 
            ? `synd_${locationData.parentLocation}` 
            : 'synd_back';
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', backButton)]
        ]);
        
        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
        await ctx.answerCbQuery();
        return;
    }
    
    // Если синдикатов несколько — показываем список
    const buttons = locationData.syndicates.map(s => {
        const loc = s.location && !s.isSubmenu ? ` (${s.location})` : '';
        // Если это подменю — переходим в другую локацию, иначе показываем инфо
        const callbackData = s.isSubmenu ? `synd_${s.id.replace('_hub', '')}` : `syndinfo_${locationId}_${s.id}`;
        return [Markup.button.callback(`${s.name}${loc}`, callbackData)];
    });
    
    const backButton = locationData.parentLocation 
        ? `synd_${locationData.parentLocation}` 
        : 'synd_back';
    buttons.push([Markup.button.callback('◀️ Назад', backButton)]);
    
    const keyboard = Markup.inlineKeyboard(buttons);
    
    await ctx.editMessageText(
        `${locationData.name}\n📍 ${locationData.location}\n\nВыберите синдикат:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
    await ctx.answerCbQuery();
});

// Обработчик информации о синдикате
bot.action(/^syndinfo_(\w+)_(\w+)$/, async (ctx) => {
    const locationId = ctx.match[1];
    const syndicateId = ctx.match[2];
    const locationData = SYNDICATES_DB[locationId];
    
    if (!locationData) {
        return ctx.answerCbQuery('Локация не найдена');
    }
    
    const syndicate = locationData.syndicates.find(s => s.id === syndicateId);
    if (!syndicate) {
        return ctx.answerCbQuery('Синдикат не найден');
    }
    
    let message = `📜 *${syndicate.name}*\n\n`;
    message += `📌 Локация: ${locationData.location}${syndicate.location ? ` (${syndicate.location})` : ''}\n`;
    message += `👑 Лидер: ${syndicate.leader}\n\n`;
    
    message += `📊 *Ранги:*\n`;
    syndicate.ranks.forEach((rank, i) => {
        message += `${i + 1}. ${rank}\n`;
    });
    
    message += `\n🎁 *Что можно получить:*\n`;
    syndicate.rewards.forEach(reward => {
        message += `• ${reward}\n`;
    });
    
    message += `\n💡 *Как качать:* ${syndicate.howToRank}`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('◀️ Назад', `synd_${locationId}`)]
    ]);
    
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    await ctx.answerCbQuery();
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
// КОМАНДА: /mod - ПОИСК МОДОВ
// ========================================================================

bot.command('mod', async (ctx) => {
    let query = ctx.message.text.replace(/\/mod(@\w+)?/, '').trim();
    
    if (!query) {
        return ctx.reply(
            '🔧 *Поиск модов*\n\n' +
            'Использование: `/mod <название>`\n\n' +
            'Примеры:\n' +
            '`/mod Зазубрины`\n' +
            '`/mod Serration`\n' +
            '`/mod Адаптация`\n' +
            '`/mod Blind Rage`',
            { parse_mode: 'Markdown' }
        );
    }

    console.log(`✓ Поиск мода: '${query}' от ${ctx.from.first_name}`);
    
    // Ищем мод (поддержка русского и английского)
    const mod = searchMod(query);
    
    if (mod) {
        console.log(`✓ Найден мод: ${mod.name}`);
        const message = formatModInfo(mod);
        await ctx.replyWithMarkdown(message, { disable_web_page_preview: true });
    } else {
        console.log(`✗ Мод не найден: '${query}'`);
        await ctx.reply('❌ Мод не найден. Попробуйте другое название.');
    }
});

// Функция поиска мода
function searchMod(query) {
    const queryLower = query.toLowerCase();
    
    // Прямой поиск (case-insensitive)
    for (const [key, mod] of Object.entries(modsDB)) {
        if (key.toLowerCase() === queryLower) {
            return mod;
        }
    }
    
    // Поиск по началу названия
    for (const [key, mod] of Object.entries(modsDB)) {
        if (key.toLowerCase().startsWith(queryLower)) {
            return mod;
        }
    }
    
    // Поиск по вхождению
    for (const [key, mod] of Object.entries(modsDB)) {
        if (key.toLowerCase().includes(queryLower)) {
            return mod;
        }
    }
    
    return null;
}

// Функция форматирования информации о моде
function formatModInfo(mod) {
    // Определяем какое название показать первым (русское если есть)
    let mainName = mod.name;
    let secondName = '';
    
    if (mod.nameRu && mod.nameRu !== mod.name && !mod.nameRu.includes('|COLOR|')) {
        mainName = mod.nameRu;
        secondName = mod.name;
    }
    
    let message = `🔧 *${mainName}*`;
    if (secondName) {
        message += ` _(${secondName})_`;
    }
    message += '\n\n';
    
    // Характеристики (только ранг 0 и макс)
    if (mod.levelStats && mod.levelStats.length > 0) {
        message += `📊 *Характеристики:*\n`;
        
        const maxRank = mod.levelStats.length - 1;
        
        message += `Ранг 0: ${mod.levelStats[0].stats.join(', ')}\n`;
        message += `Ранг ${maxRank}: ${mod.levelStats[maxRank].stats.join(', ')}\n`;
    }
    
    // Дроп-локации
    if (mod.drops && mod.drops.length > 0) {
        message += `\n📌 *Где найти:*\n`;
        
        // Сортируем по шансу дропа
        const sortedDrops = [...mod.drops].sort((a, b) => b.chance - a.chance);
        const topDrops = sortedDrops.slice(0, 5);
        
        topDrops.forEach(drop => {
            const chance = (drop.chance * 100).toFixed(2);
            message += `• ${drop.location}: ${chance}%\n`;
        });
        
        if (mod.drops.length > 5) {
            message += `_...и ещё ${mod.drops.length - 5} локаций_\n`;
        }
    } else {
        // Если дропов нет
        message += `\n📌 *Где найти:*\n`;
        message += `Нет информации\n`;
    }
    
    return message;
}

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
        [Markup.button.callback('🚀 Основное', 'weapon_primary')],
        [Markup.button.callback('🔫 Вторичное', 'weapon_secondary')],
        [Markup.button.callback('🪓 Ближнее', 'weapon_melee')]
    ]);
    
    ctx.reply('🔫 Выберите тип оружия:', keyboard);
});

bot.action('weapon_primary', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        '🚀 *Основное оружие*\n\n' +
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
        '🪓 *Ближнее оружие*\n\n' +
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
            const message = `⏳ *${displayName}*\n\n` +
                          `Через ${threshold} минут наступит: *${nextPhase}*`;
            sendToSubscribers(message);
            saveState();
        }
    });
}

// ========================================================================
// INLINE MODE - ПОИСК МОДОВ И ВАРФРЕЙМОВ
// ========================================================================

bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toLowerCase();
    
    // Не отвечаем на пустые/короткие запросы - окно не появится
    if (!query || query.length < 2) {
        return;
    }
    
    console.log(`🔍 Inline запрос: "${query}" от ${ctx.from.first_name}`);
    
    const results = [];
    
    // Алиасы команд (теперь API работает!)
    const commandAliases = {
        'циклы': 'cycles', 'цикл': 'cycles', 'cycles': 'cycles',
        'цетус': 'cycles', 'долина': 'cycles', 'ночь': 'cycles', 'день': 'cycles',
        'камбион': 'cycles', 'заруман': 'cycles', 'time': 'cycles',
        'тепло': 'cycles', 'холод': 'cycles', 'фасс': 'cycles', 'вом': 'cycles',
        
        'разломы': 'fissures', 'разлом': 'fissures', 'fissures': 'fissures',
        'реликвии': 'fissures', 'лит': 'fissures', 'мезо': 'fissures',
        'нео': 'fissures', 'акси': 'fissures',
        
        'вылазка': 'sortie', 'вылазки': 'sortie', 'sortie': 'sortie',
        
        'баро': 'baro', 'baro': 'baro', 'торговец': 'baro',
        
        'вторжения': 'invasions', 'invasions': 'invasions'
    };
    
    // Проверяем, совпадает ли запрос с командой
    const matchedCommand = commandAliases[query];
    if (matchedCommand) {
        const commandInfo = await getCommandPreview(matchedCommand);
        if (commandInfo) {
            results.push({
                type: 'article',
                id: `cmd_${matchedCommand}`,
                title: commandInfo.title,
                description: commandInfo.description,
                input_message_content: {
                    message_text: commandInfo.message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                }
            });
        }
    }
    
    // Поиск модов
    const foundMods = searchModsInline(query, 25);
    foundMods.forEach((mod, index) => {
        const title = mod.nameRu !== mod.name ? `${mod.nameRu} (${mod.name})` : mod.name;
        const description = getModShortDescription(mod);
        const messageText = formatModInfo(mod);
        
        results.push({
            type: 'article',
            id: `mod_${index}_${mod.name.replace(/\s/g, '_')}`,
            title: `🔧 ${title}`,
            description: description,
            input_message_content: {
                message_text: messageText,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }
        });
    });
    
    // Поиск варфреймов
    const foundWarframes = searchWarframesInline(query, 10);
    foundWarframes.forEach((wf, index) => {
        const messageText = formatWarframeInfoInline(wf);
        const abilitiesPreview = wf.abilities ? wf.abilities.slice(0, 2).join(', ') + '...' : '';
        const displayName = wf.nameRu ? `${wf.nameRu} (${wf.name})` : wf.name;
        
        results.push({
            type: 'article',
            id: `wf_${index}_${wf.name.replace(/\s/g, '_')}`,
            title: `🤖 ${displayName}`,
            description: abilitiesPreview,
            input_message_content: {
                message_text: messageText,
                parse_mode: 'Markdown'
            }
        });
    });
    
    try {
        await ctx.answerInlineQuery(results.slice(0, 50), {
            cache_time: 300, // Кешировать 5 минут
            is_personal: false
        });
    } catch (error) {
        console.error('❌ Ошибка inline:', error.message);
    }
});

// Функция получения превью команды для inline
async function getCommandPreview(command) {
    try {
        switch (command) {
            case 'cycles': {
                // Используем математический расчёт
                const cetus = getCycleStatus('Цетус');
                const fortuna = getCycleStatus('Фортуна');
                const deimos = getCycleStatus('Деймос');
                const zariman = getCycleStatus('Заруман');
                
                let message = '🌍 *Циклы открытых миров:*\n\n';
                
                const cetusIcon = cetus.isPhase1 ? '☀️' : '🌙';
                message += `*Цетус:* ${cetusIcon} ${cetus.phase}\n`;
                message += `⏳ ${cetus.timeLeft}\n\n`;
                
                const fortunaIcon = fortuna.isPhase1 ? '🔥' : '🧊';
                message += `*Долина Сфер:* ${fortunaIcon} ${fortuna.phase}\n`;
                message += `⏳ ${fortuna.timeLeft}\n\n`;
                
                const deimosIcon = deimos.isPhase1 ? '☀️' : '🌙';
                message += `*Камбион:* ${deimosIcon} ${deimos.phase}\n`;
                message += `⏳ ${deimos.timeLeft}\n\n`;
                
                const zarimanIcon = zariman.isPhase1 ? '🔵' : '🔴';
                message += `*Заруман:* ${zarimanIcon} ${zariman.phase}\n`;
                message += `⏳ ${zariman.timeLeft}`;
                
                return {
                    title: '🌍 Циклы открытых миров',
                    description: `Цетус: ${cetus.phase}, Долина: ${fortuna.phase}`,
                    message: message
                };
            }
            
            case 'fissures': {
                const ws = await getWorldstate();
                if (!ws || !ws.fissures || !ws.fissures.data) return null;
                
                const fissures = ws.fissures.data.filter(f => !f.hard).slice(0, 6);
                
                let message = '☢️ *Разломы Бездны:*\n\n';
                fissures.forEach(f => {
                    const tier = translateTier(f.tier);
                    const mission = translateMission(f.missionType);
                    message += `*${tier}* — ${mission}\n`;
                    message += `📌 ${f.location}\n`;
                    message += `⏳ ${formatTimeLeft(f.end)}\n\n`;
                });
                
                return {
                    title: '☢️ Разломы Бездны',
                    description: `Активных: ${ws.fissures.data.length}`,
                    message: message
                };
            }
            
            case 'sortie': {
                const ws = await getWorldstate();
                if (!ws || !ws.sorties || !ws.sorties.data || ws.sorties.data.length === 0) return null;
                
                const sortie = ws.sorties.data[0];
                
                let message = '📋 *Вылазка дня*\n\n';
                message += `💀 Босс: *${sortie.bossName || 'Неизвестен'}*\n`;
                message += `🔪 Фракция: ${translateFaction(sortie.faction)}\n\n`;
                
                if (sortie.missions) {
                    sortie.missions.forEach((m, i) => {
                        message += `*${i + 1}. ${translateMission(m.missionType)}*\n`;
                        message += `📌 ${m.location}\n\n`;
                    });
                }
                
                return {
                    title: '📋 Вылазка',
                    description: `Босс: ${sortie.bossName || 'Неизвестен'}`,
                    message: message
                };
            }
            
            case 'baro': {
                const ws = await getWorldstate();
                if (!ws || !ws.voidtrader) return null;
                
                const baro = ws.voidtrader.data;
                
                let message = '🚑 *Баро Ки\'Тиир*\n\n';
                
                if (baro.active) {
                    message += `📌 Локация: *${baro.location}*\n`;
                    message += `⏳ Улетит через: ${formatTimeLeft(baro.end)}\n`;
                    message += `📦 Товаров: ${baro.items ? baro.items.length : 0}`;
                    
                    return {
                        title: '🚑 Баро Ки\'Тиир',
                        description: `Сейчас на ${baro.location}`,
                        message: message
                    };
                } else {
                    message += `⏳ Прилетит через: *${formatTimeLeft(baro.start)}*\n`;
                    message += `📌 Реле: ${baro.location || 'Неизвестно'}`;
                    
                    return {
                        title: '🚑 Баро Ки\'Тиир',
                        description: `Прилетит через ${formatTimeLeft(baro.start)}`,
                        message: message
                    };
                }
            }
            
            case 'invasions': {
                const ws = await getWorldstate();
                if (!ws || !ws.invasions || !ws.invasions.data) return null;
                
                const invasions = ws.invasions.data.filter(i => !i.completed).slice(0, 5);
                
                let message = '⚔️ *Вторжения:*\n\n';
                invasions.forEach(inv => {
                    message += `📌 *${inv.location}*\n`;
                    message += `${translateFaction(inv.attackingFaction)} vs ${translateFaction(inv.defendingFaction)}\n`;
                    message += `📊 ${Math.abs(inv.progress || 0).toFixed(1)}%\n\n`;
                });
                
                return {
                    title: '⚔️ Вторжения',
                    description: `Активных: ${invasions.length}`,
                    message: message
                };
            }
            
            default:
                return null;
        }
    } catch (error) {
        console.error(`Ошибка получения ${command}:`, error.message);
        return null;
    }
}

// Функция поиска модов для inline (возвращает массив)
function searchModsInline(query, limit = 25) {
    const queryLower = query.toLowerCase();
    const results = [];
    const seen = new Set();
    
    // Сначала точные совпадения
    for (const [key, mod] of Object.entries(modsDB)) {
        if (seen.has(mod.name)) continue;
        if (key.toLowerCase() === queryLower || mod.name.toLowerCase() === queryLower) {
            results.push(mod);
            seen.add(mod.name);
        }
    }
    
    // Потом по началу названия
    for (const [key, mod] of Object.entries(modsDB)) {
        if (seen.has(mod.name)) continue;
        if (key.toLowerCase().startsWith(queryLower) || 
            mod.name.toLowerCase().startsWith(queryLower) ||
            (mod.nameRu && mod.nameRu.toLowerCase().startsWith(queryLower))) {
            results.push(mod);
            seen.add(mod.name);
        }
        if (results.length >= limit) break;
    }
    
    // Потом по вхождению
    if (results.length < limit) {
        for (const [key, mod] of Object.entries(modsDB)) {
            if (seen.has(mod.name)) continue;
            if (key.toLowerCase().includes(queryLower) || 
                mod.name.toLowerCase().includes(queryLower) ||
                (mod.nameRu && mod.nameRu.toLowerCase().includes(queryLower))) {
                results.push(mod);
                seen.add(mod.name);
            }
            if (results.length >= limit) break;
        }
    }
    
    return results;
}

// Функция поиска варфреймов для inline
function searchWarframesInline(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const results = [];
    const seen = new Set();
    
    // Сначала ищем по алиасам (русские названия)
    for (const [englishName, aliases] of Object.entries(nameAliasesDB)) {
        if (seen.has(englishName)) continue;
        
        // Проверяем алиасы
        const matchedAlias = aliases.find(alias => 
            alias.toLowerCase().includes(queryLower) || 
            alias.toLowerCase().startsWith(queryLower)
        );
        
        if (matchedAlias && abilitiesDB[englishName]) {
            results.push({ 
                name: englishName,
                nameRu: aliases[0], // Первый алиас - основное русское название
                abilities: abilitiesDB[englishName]
            });
            seen.add(englishName);
        }
        if (results.length >= limit) break;
    }
    
    // Потом ищем по английским названиям
    for (const [name, abilities] of Object.entries(abilitiesDB)) {
        if (seen.has(name)) continue;
        
        if (name.toLowerCase().includes(queryLower)) {
            const aliases = nameAliasesDB[name];
            results.push({ 
                name: name,
                nameRu: aliases ? aliases[0] : null,
                abilities: abilities 
            });
            seen.add(name);
        }
        if (results.length >= limit) break;
    }
    
    return results;
}

// Получить информацию о варфрейме из базы
function getWarframeInfoFromDB(wfData) {
    if (!wfData) return null;
    
    return {
        title: wfData.name,
        abilities: wfData.abilities || []
    };
}

// Форматирование информации о варфрейме для inline
function formatWarframeInfoInline(wfData) {
    let title = wfData.name;
    if (wfData.nameRu) {
        title = `${wfData.nameRu} (${wfData.name})`;
    }
    
    let message = `🤖 *${title}*\n\n`;
    message += `⚡ *Способности:*\n`;
    
    if (wfData.abilities && wfData.abilities.length > 0) {
        wfData.abilities.forEach((ability, index) => {
            message += `${index + 1}. ${ability}\n`;
        });
    }
    
    return message;
}

// Краткое описание мода для inline
function getModShortDescription(mod) {
    let desc = mod.typeRu || mod.type || '';
    
    if (mod.levelStats && mod.levelStats.length > 0) {
        const maxStats = mod.levelStats[mod.levelStats.length - 1].stats;
        if (maxStats && maxStats[0]) {
            desc += ` • ${maxStats[0]}`;
        }
    }
    
    return desc.substring(0, 100);
}

// ========================================================================
// ЗАПУСК БОТА
// ========================================================================

console.log('='.repeat(60));
console.log('🤖 WARFRAME BOT V3 FINAL (LOCAL + INLINE)');
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
