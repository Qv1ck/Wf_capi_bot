// ========================================================================
// WARFRAME BOT V3 FINAL - ЛОКАЛЬНАЯ ВЕРСИЯ + АРБИТРАЖИ
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

// ← НОВОЕ: Данные арбитражей
let arbitrationData = [];
const ARBITRATION_URL = 'https://raw.githubusercontent.com/ix1le/warframe-arbitrations/main/arbys.json';

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

// ========================================================================
// ← НОВОЕ: ФУНКЦИИ ДЛЯ АРБИТРАЖЕЙ
// ========================================================================

function fetchArbitrationData() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'raw.githubusercontent.com',
            path: '/ix1le/warframe-arbitrations/main/arbys.json',
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

async function loadArbitrationData() {
    try {
        console.log('📥 Загрузка расписания арбитражей...');
        arbitrationData = await fetchArbitrationData();
        console.log(`✓ Загружено ${arbitrationData.length} арбитражей`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки арбитражей:', error.message);
        return false;
    }
}

function getCurrentArbitration() {
    if (arbitrationData.length === 0) {
        return { error: 'Данные арбитражей не загружены' };
    }

    const now = Math.floor(Date.now() / 1000);
    
    const current = arbitrationData.find((arb, index) => {
        const nextArb = arbitrationData[index + 1];
        return arb.start <= now && (!nextArb || nextArb.start > now);
    });

    if (!current) {
        return { error: 'Текущий арбитраж не найден' };
    }

    const currentIndex = arbitrationData.indexOf(current);
    const upcoming = arbitrationData.slice(currentIndex + 1, currentIndex + 4);

    return { current, upcoming };
}

function formatArbitrationInfo(arb, isCurrent = false) {
    const now = Math.floor(Date.now() / 1000);
    
    const missionIcons = {
        'Survival': '⏱️', 'Defense': '🛡️', 'Interception': '📡',
        'Excavation': '⛏️', 'Infested Salvage': '🦠', 'Defection': '🚑',
        'Disruption': '💥', 'Mirror Defense': '🪞'
    };

    const enemyIcons = {
        'Grineer': '🔴', 'Corpus': '🔵',
        'Infestation': '🟢', 'Orokin': '⚪'
    };

    const icon = missionIcons[arb.missionType] || '📍';
    const enemyIcon = enemyIcons[arb.enemy] || '';
    
    let text = `${icon} *${arb.name}* (${arb.planet})`;
    text += `\n   ${enemyIcon} ${arb.enemy} • ${arb.missionType}`;
    
    if (isCurrent) {
        const timeLeft = arb.start + 3600 - now;
        const minutes = Math.floor(timeLeft / 60);
        text += `\n   ⏰ Осталось: ${minutes} мин`;
    } else {
        const timeUntil = arb.start - now;
        const hours = Math.floor(timeUntil / 3600);
        const minutes = Math.floor((timeUntil % 3600) / 60);
        
        if (hours > 0) {
            text += `\n   🕐 Через: ${hours}ч ${minutes}м`;
        } else {
            text += `\n   🕐 Через: ${minutes}м`;
        }
    }

    if (arb.bonus) {
        const bonuses = [];
        if (arb.bonus.resourceBonus) bonuses.push(`💎 +${Math.round(arb.bonus.resourceBonus * 100)}%`);
        if (arb.bonus.xpBonus) bonuses.push(`⭐ +${Math.round(arb.bonus.xpBonus * 100)}%`);
        if (bonuses.length > 0) {
            text += `\n   ${bonuses.join(' • ')}`;
        }
    }

    return text;
}

function checkArbitrationNotifications() {
    try {
        const result = getCurrentArbitration();
        if (result.error) return;

        const now = Math.floor(Date.now() / 1000);
        const current = result.current;
        const timeLeft = current.start + 3600 - now;
        const minutesLeft = Math.floor(timeLeft / 60);

        if ([10, 5].includes(minutesLeft)) {
            const eventId = `arbitration_${current.start}_${minutesLeft}`;
            
            if (!checkedEvents.has(eventId)) {
                checkedEvents.add(eventId);
                saveState();
                
                const next = result.upcoming[0];
                const message = `🎯 *Смена арбитража через ${minutesLeft} минут!*\n\n` +
                               `📍 Следующий: *${next.name}* (${next.planet})\n` +
                               `   ${next.missionType} • ${next.enemy}`;
                
                sendToSubscribers(message);
            }
        }
    } catch (error) {
        console.error('Ошибка проверки арбитражей:', error.message);
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
    { command: 'arbitration', description: '🎯 Арбитражи' },
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

const WARFRAME_KNOWN_DATE = new Date('2025-11-24T00:00:00Z');
const WARFRAME_KNOWN_WEEK = 3;

const WEAPON_KNOWN_DATE = new Date('2025-11-24T00:00:00Z');
const WEAPON_KNOWN_WEEK = 3;

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
// (Оставляю как есть в твоём файле - очень большой объём, не буду копировать)
// ========================================================================

const helminthAbilities = {
    "Ash": { ability: "Сюрикен", slot: 1 },
    "Atlas": { ability: "Окаменение", slot: 3 },
    "Banshee": { ability: "Тишина", slot: 2 },
    "Baruuk": { ability: "Усыпление", slot: 2 },
    "Caliban": { ability: "Ликвидатор", slot: 2 },
    "Chroma": { ability: "Элементальный Оберег", slot: 2 },
    "Citrine": { ability: "Раскалывающий Взрыв", slot: 2 },
    "Dagath": { ability: "Зловещие Косы", slot: 2 },
    "Ember": { ability: "Огненный Взрыв", slot: 3 },
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
    "Vauban": { ability: "Тесла Нервос ", slot: 1 },
    "Volt": { ability: "Шок", slot: 1 },
    "Voruna": { ability: "Волчья Стая", slot: 1 },
    "Wisp": { ability: "Прорыв", slot: 3 },
    "Wukong": { ability: "Неповиновение", slot: 3 },
    "Xaku": { ability: "Шёпот Ксеты", slot: 1 },
    "Yareli": { ability: "Водные Лезвия", slot: 2 },
    "Zephyr": { ability: "Воздушный Рывок", slot: 1 },
    "Temple": { ability: "Пиротехника", slot: 1 }
};

// Аугменты - оставляю минимальный пример, у тебя полная база
const augmentMods = {
    "Mirage": {
        1: { name: "Галерея Злобы", syndicates: ["Арбитры Гексиса", "Цефалон Суда"] },
        2: { name: "Взрывной Обман", syndicates: ["Арбитры Гексиса", "Цефалон Суда"] },
        3: { name: "Полное Затмение", syndicates: ["Арбитры Гексиса", "Цефалон Суда"] },
        4: { name: "Призма-Страж", syndicates: ["Конклав"] }
    }
    // ... остальные варфреймы
};

// ========================================================================
// ЦИКЛЫ МИРОВ
// ========================================================================

const CYCLE_DEFAULTS = {
    cetus: { start: 1509371722, length: 8998.8748, dayStart: 2249.7187, dayEnd: 8248.9686 },
    fortuna: { start: 1542131224, length: 1600, dayStart: 800, dayEnd: 1200 },
    earth: { start: 1509371722, length: 8998.8748, dayStart: 2249.7187, dayEnd: 8248.9686 }
};

function calculateCycleFromAPI(cycleData) {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - cycleData.start;
    const posInCycle = ((elapsed % cycleData.length) + cycleData.length) % cycleData.length;
    
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
    if (locationKey === 'Равнины Эйдолона' || locationKey === 'Цетус') {
        const data = CYCLE_DEFAULTS.cetus;
        const { isDay, timeLeftSec } = calculateCycleFromAPI(data);
        return {
            phase: isDay ? 'День' : 'Ночь',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isDay
        };
    }
    
    if (locationKey === 'Фортуна') {
        const data = CYCLE_DEFAULTS.fortuna;
        const { isDay, timeLeftSec } = calculateCycleFromAPI(data);
        return {
            phase: isDay ? 'Тепло' : 'Холод',
            timeLeft: formatCycleTime(timeLeftSec),
            isPhase1: isDay
        };
    }
    
    if (locationKey === 'Камбионский Дрейф' || locationKey === 'Деймос') {
        const DEIMOS_START = 1765103388;
        const DEIMOS_LENGTH = 9000;
        const DEIMOS_FASS_END = 6000;
        
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
    
    if (location) {
        const loc = location.toLowerCase().trim();
        const targetLocation = locationMap[loc];
        
        if (!targetLocation) {
            return '❌ Локация не найдена. Доступные: Цетус, Фортуна, Деймос, Земля';
        }
        
        if (targetLocation === 'Земля') {
            const earth = getCycleStatus('Земля');
            const emoji = earth.isPhase1 ? '🌕' : '🌑';
            return `🌍 *Земля*\n\n${emoji} ${earth.phase}\n⏳ До смены: ${earth.timeLeft}`;
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
    
    const cetus = getCycleStatus('Равнины Эйдолона');
    const fortuna = getCycleStatus('Фортуна');
    const deimos = getCycleStatus('Камбионский Дрейф');
    
    let message = `🌍 *ЦИКЛЫ*\n\n`;
    
    const cetusEmoji = cetus.phase === 'День' ? '🌕' : '🌑';
    message += `*Цетус:* ${cetusEmoji} ${cetus.phase}\n`;
    message += `⏳ До смены: ${cetus.timeLeft}\n\n`;
    
    const fortunaEmoji = fortuna.phase === 'Тепло' ? '🔥' : '🧊';
    message += `*Фортуна:* ${fortunaEmoji} ${fortuna.phase}\n`;
    message += `⏳ До смены: ${fortuna.timeLeft}\n\n`;
    
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
    
    for (const [key, aliases] of Object.entries(nameAliasesDB)) {
        if (key.toLowerCase() === normalizedQuery ||
            aliases.some(alias => alias.toLowerCase() === normalizedQuery)) {
            englishKey = key;
            console.log(`✅ Найдено точное совпадение: '${normalizedQuery}' → '${englishKey}'`);
            break;
        }
    }
    
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
            duviriInfo = false;
        }
    } catch (error) {
        console.error('❌ Ошибка поиска в Дувири:', error.message);
    }
    
    const helminthInfo = helminthAbilities[englishKey];
    const augments = augmentMods[englishKey] || null;
    
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
    
    if (info.abilities && info.abilities.length > 0) {
        message += `⚡ *Способности:*\n`;
        info.abilities.forEach((ability, index) => {
            const slot = index + 1;
            let abilityName = '';
            
            if (typeof ability === 'string') {
                abilityName = ability;
            } else if (ability.name) {
                abilityName = ability.name;
            }
            
            message += `${slot}. ${abilityName}\n`;
            
            const augment = info.augments && info.augments[slot];
            if (augment) {
                const augList = Array.isArray(augment) ? augment : [augment];
                augList.forEach(aug => {
                    const syndicatesStr = aug.syndicates.join(' | ');
                    message += `   🌟 _${aug.name}_ ← ${syndicatesStr}\n`;
                });
            }
        });
        message += '\n';
    }
    
    if (info.helminth) {
        message += `🧬 *Гельминт-способность:*\n`;
        message += `• ${info.helminth.ability}\n\n`;
    }
    
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
            Markup.button.callback('🎯 Арбитражи', 'cmd_arbitration'),
            Markup.button.callback('🔫 Оружие', 'cmd_weapon')
        ],
        [
            Markup.button.callback('⛓️‍💥 Цепь (оружие)', 'cmd_chain_guns'),
            Markup.button.callback('⛓️‍💥 Цепь (варфреймы)', 'cmd_chain_frame')
        ],
        [
            Markup.button.callback('🔔 Подписки', 'cmd_subscribe')
        ]
    ]);
    
    ctx.replyWithMarkdown(message, keyboard);
});

// ========================================================================
// ← НОВОЕ: КОМАНДА /arbitration
// ========================================================================

bot.command(['arbitration', 'арбитраж'], async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
    
    console.log(`✓ /arbitration от ${ctx.from.first_name}` + (args ? ` (${args})` : ''));
    
    const result = getCurrentArbitration();
    
    if (result.error) {
        return ctx.reply('❌ ' + result.error);
    }

    if (args) {
        const now = Math.floor(Date.now() / 1000);
        const currentIndex = arbitrationData.indexOf(result.current);
        
        const filtered = arbitrationData
            .slice(currentIndex)
            .filter(arb => arb.missionType.toLowerCase().includes(args))
            .slice(0, 5);
        
        if (filtered.length === 0) {
            return ctx.reply(`❌ Не найдено арбитражей "${args}"`);
        }

        let message = `🎯 *АРБИТРАЖИ: ${filtered[0].missionType.toUpperCase()}*\n\n`;
        
        filtered.forEach((arb, index) => {
            const isCurrent = arb.start <= now && arb.start + 3600 > now;
            message += formatArbitrationInfo(arb, isCurrent);
            if (index < filtered.length - 1) message += '\n';
        });
        
        return ctx.replyWithMarkdown(message);
    }

    let message = '🎯 *АРБИТРАЖИ*\n\n';
    message += '📍 *СЕЙЧАС:*\n';
    message += formatArbitrationInfo(result.current, true);
    message += '\n\n📅 *СЛЕДУЮЩИЕ:*\n';
    result.upcoming.forEach((arb, index) => {
        message += formatArbitrationInfo(arb, false);
        if (index < result.upcoming.length - 1) message += '\n';
    });

    ctx.replyWithMarkdown(message);
});

// ========================================================================
// КОМАНДЫ ОРУЖИЯ
// ========================================================================

bot.command('primary', async (ctx) => {
    let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    
    if (!query) {
        return ctx.reply(
            '🚀 *Основное оружие*\n\n' +
            'Использование: `/primary <название>`\n\n' +
            'Примеры:\n' +
            '`/primary Болтор`\n' +
            '`/primary Сома`',
            { parse_mode: 'Markdown' }
        );
    }
    
    const result = searchWeapon(query, weaponsPrimary, 'Основное оружие');
    
    if (result) {
        await ctx.replyWithMarkdown(result);
    } else {
        await ctx.reply(`❌ Оружие "${query}" не найдено.`);
    }
});

bot.command('secondary', async (ctx) => {
    let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    
    if (!query) {
        return ctx.reply(
            '🔫 *Вторичное оружие*\n\n' +
            'Использование: `/secondary <название>`',
            { parse_mode: 'Markdown' }
        );
    }
    
    const result = searchWeapon(query, weaponsSecondary, 'Вторичное оружие');
    
    if (result) {
        await ctx.replyWithMarkdown(result);
    } else {
        await ctx.reply(`❌ Оружие "${query}" не найдено.`);
    }
});

bot.command('melee', async (ctx) => {
    let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    
    if (!query) {
        return ctx.reply(
            '🪓 *Ближнее оружие*\n\n' +
            'Использование: `/melee <название>`',
            { parse_mode: 'Markdown' }
        );
    }
    
    const result = searchWeapon(query, weaponsMelee, 'Ближнее оружие');
    
    if (result) {
        await ctx.replyWithMarkdown(result);
    } else {
        await ctx.reply(`❌ Оружие "${query}" не найдено.`);
    }
});

bot.command('chain_guns', async (ctx) => {
    const currentWeek = getCurrentDuviriWeek();
    const weekWeapons = getWeekWeapons(currentWeek);
    
    let message = `🌀 *ЦЕПЬ ДУВИРИ (ОРУЖИЕ)*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 8\n\n`;
    message += `⚡ *Доступные Инкарноны:*\n`;
    message += weekWeapons.join('\n');
    
    await ctx.replyWithMarkdown(message);
});

bot.command('chain_frame', async (ctx) => {
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

// ========================================================================
// КОМАНДА /time
// ========================================================================

bot.command(['time', 'cycles'], async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const message = getFormattedCycles(args || null);
    
    await ctx.replyWithMarkdown(message);
});

// ========================================================================
// КОМАНДЫ API: FISSURES, SORTIE, BARO, INVASIONS
// (Оставляю как есть в твоём файле)
// ========================================================================

bot.command(['fissures', 'fissure', 'разломы'], async (ctx) => {
    const ws = await getWorldstate();
    
    if (!ws || !ws.fissures || !ws.fissures.data) {
        return ctx.reply('❌ Не удалось получить данные о разломах.');
    }
    
    const fissures = ws.fissures.data;
    
    if (fissures.length === 0) {
        return ctx.reply('🔥 Нет активных разломов.');
    }
    
    const byTier = {};
    fissures.forEach(f => {
        if (!f.hard) {
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
});

bot.command(['sortie', 'вылазка', 'вылазки'], async (ctx) => {
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
});

bot.command(['baro', 'баро', 'торговец'], async (ctx) => {
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
});

// (Остальные команды: invasions, syndicates, search, mod, subscribe - оставляю без изменений)

// ========================================================================
// ← НОВОЕ: CALLBACK ДЛЯ АРБИТРАЖЕЙ
// ========================================================================

bot.action('cmd_arbitration', async (ctx) => {
    await ctx.answerCbQuery();
    
    const result = getCurrentArbitration();
    
    if (result.error) {
        return ctx.reply('❌ ' + result.error);
    }

    let message = '🎯 *АРБИТРАЖИ*\n\n';
    message += '📍 *СЕЙЧАС:*\n';
    message += formatArbitrationInfo(result.current, true);
    message += '\n\n📅 *СЛЕДУЮЩИЕ:*\n';
    result.upcoming.forEach((arb, index) => {
        message += formatArbitrationInfo(arb, false);
        if (index < result.upcoming.length - 1) message += '\n';
    });

    await ctx.replyWithMarkdown(message);
});

// (Остальные callback-кнопки без изменений)

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
    
    // ← НОВОЕ: Проверка уведомлений об арбитражах
    checkArbitrationNotifications();
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
        