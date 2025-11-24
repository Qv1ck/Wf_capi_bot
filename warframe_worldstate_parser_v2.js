/**
 * ========================================================================
 * ПАРСЕР ДЛЯ ОФИЦИАЛЬНОГО WARFRAME API (БЕЗ ЗАВИСИМОСТЕЙ)
 * ========================================================================
 * 
 * Работает с официальным worldState.php от Digital Extremes
 * Использует только встроенный модуль https Node.js
 * Добавляет русские переводы
 * 
 * API: https://content.warframe.com/dynamic/worldState.php
 */

const https = require('https');

// ========================================================================
// КОНФИГУРАЦИЯ
// ========================================================================

const API_URL = 'https://content.warframe.com/dynamic/worldState.php';
const CACHE_TIME = 2 * 60 * 1000; // Кэш на 2 минуты

// Кэш данных
let cachedData = null;
let cacheTimestamp = 0;

// ========================================================================
// СЛОВАРИ ДЛЯ ПЕРЕВОДА
// ========================================================================

const SORTIE_BOSSES = {
    'SORTIE_BOSS_ALAD_V': 'Алад V',
    'SORTIE_BOSS_AMBULAS': 'Амбулас',
    'SORTIE_BOSS_CORRUPT_VOR': 'Развращённый Вор',
    'SORTIE_BOSS_HYENA': 'Гиена',
    'SORTIE_BOSS_JACKAL': 'Шакал',
    'SORTIE_BOSS_KELA': 'Кела де Тайм',
    'SORTIE_BOSS_KRIL': 'Лех Криль',
    'SORTIE_BOSS_LEPHANTIS': 'Лефантис',
    'SORTIE_BOSS_NEF': 'Неф Анио',
    'SORTIE_BOSS_PHORID': 'Форид',
    'SORTIE_BOSS_RUK': 'Сарджас Рук',
    'SORTIE_BOSS_TYL_REGOR': 'Тил Регор',
    'SORTIE_BOSS_VOR': 'Капитан Вор',
    'SORTIE_BOSS_RAPTOR': 'Раптор',
    'SORTIE_BOSS_VEY_HEK': 'Вей Хек'
};

const MISSION_TYPES = {
    'MT_MOBILE_DEFENSE': 'Мобильная оборона',
    'MT_TERRITORY': 'Интерцепция',
    'MT_INTEL': 'Шпионаж',
    'MT_SURVIVAL': 'Выживание',
    'MT_EXTERMINATION': 'Истребление',
    'MT_RESCUE': 'Спасение',
    'MT_SABOTAGE': 'Саботаж',
    'MT_CAPTURE': 'Захват',
    'MT_ASSASSINATION': 'Убийство',
    'MT_DEFENSE': 'Оборона',
    'MT_EXCAVATE': 'Раскопки',
    'MT_RETRIEVAL': 'Перехват',
    'MT_ASSAULT': 'Штурм'
};

const SORTIE_MODIFIERS = {
    'SORTIE_MODIFIER_ARMOR': 'Увеличенная броня',
    'SORTIE_MODIFIER_HAZARD_COLD': 'Экзотермический лик',
    'SORTIE_MODIFIER_HAZARD_FOG': 'Плотный туман',
    'SORTIE_MODIFIER_HAZARD_MAGNETIC': 'Магнитные аномалии',
    'SORTIE_MODIFIER_HAZARD_RADIATION': 'Радиационные бури',
    'SORTIE_MODIFIER_SHIELDS': 'Усиленные щиты',
    'SORTIE_MODIFIER_FIRE': 'Огненная опасность',
    'SORTIE_MODIFIER_HAZARD_FIRE': 'Огненная опасность',
    'SORTIE_MODIFIER_LOW_ENERGY': 'Истощение энергии',
    'SORTIE_MODIFIER_MELEE_ONLY': 'Только ближний бой',
    'SORTIE_MODIFIER_SECONDARY_ONLY': 'Только вторичное оружие',
    'SORTIE_MODIFIER_SNIPER_ONLY': 'Только снайперское',
    'SORTIE_MODIFIER_BOW_ONLY': 'Только луки',
    'SORTIE_MODIFIER_EXIMUS': 'Усиленные враги'
};

// ========================================================================
// ФУНКЦИЯ ДЛЯ HTTP ЗАПРОСОВ
// ========================================================================

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error('Ошибка парсинга JSON'));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// ========================================================================
// ОСНОВНОЙ КЛАСС
// ========================================================================

class WarframeWorldState {
    constructor() {
        this.data = null;
    }

    /**
     * Получить данные worldState с кэшированием
     */
    async fetchWorldState() {
        const now = Date.now();
        
        // Используем кэш если данные свежие
        if (cachedData && (now - cacheTimestamp) < CACHE_TIME) {
            this.data = cachedData;
            return this.data;
        }

        try {
            this.data = await fetchJSON(API_URL);
            
            // Обновляем кэш
            cachedData = this.data;
            cacheTimestamp = now;
            
            return this.data;
        } catch (error) {
            console.error('Ошибка получения worldState:', error.message);
            
            // Если есть старый кэш - используем его
            if (cachedData) {
                this.data = cachedData;
                return this.data;
            }
            
            return null;
        }
    }

    /**
     * Получить сортировку
     */
    async getSortie() {
        await this.fetchWorldState();
        
        if (!this.data || !this.data.Sorties || this.data.Sorties.length === 0) {
            return null;
        }

        const sortie = this.data.Sorties[0];
        
        // Парсим время
        const activation = new Date(parseInt(sortie.Activation.$date.$numberLong));
        const expiry = new Date(parseInt(sortie.Expiry.$date.$numberLong));
        
        // Переводим босса
        const boss = SORTIE_BOSSES[sortie.Boss] || sortie.Boss.replace('SORTIE_BOSS_', '');
        
        // Определяем фракцию
        let faction = 'Неизвестно';
        const bossName = sortie.Boss.toUpperCase();
        if (['KRIL', 'RUK', 'HEK', 'REGOR', 'VOR'].some(b => bossName.includes(b)) && !bossName.includes('CORRUPT')) {
            faction = 'Гринир';
        } else if (['ALAD', 'AMBULAS', 'NEF', 'JACKAL'].some(b => bossName.includes(b))) {
            faction = 'Корпус';
        } else if (['PHORID', 'LEPHANTIS'].some(b => bossName.includes(b))) {
            faction = 'Заражённые';
        } else if (bossName.includes('CORRUPT')) {
            faction = 'Развращённые';
        }

        // Парсим миссии
        const missions = sortie.Variants.map((variant, index) => {
            return {
                number: index + 1,
                missionType: MISSION_TYPES[variant.missionType] || variant.missionType.replace('MT_', ''),
                modifier: SORTIE_MODIFIERS[variant.modifierType] || variant.modifierType.replace('SORTIE_MODIFIER_', ''),
                node: variant.node
            };
        });

        return {
            boss,
            faction,
            activation,
            expiry,
            missions
        };
    }

    /**
     * Получить циклы Cetus (Равнины Эйдолона)
     */
    getCetusCycle() {
        // Цикл Cetus: 100 минут день, 50 минут ночь
        const now = Date.now();
        const cycleLength = 150 * 60 * 1000; // 150 минут
        const dayLength = 100 * 60 * 1000;   // 100 минут день
        
        const timeSinceEpoch = now - 1560950400000; // Начальная точка
        const timeInCycle = timeSinceEpoch % cycleLength;
        
        const isDay = timeInCycle < dayLength;
        const timeLeft = isDay 
            ? dayLength - timeInCycle 
            : cycleLength - timeInCycle;
        
        return {
            isDay,
            state: isDay ? 'day' : 'night',
            timeLeft: this.formatTime(timeLeft),
            expiry: new Date(now + timeLeft)
        };
    }

    /**
     * Получить циклы Vallis (Orb Vallis - Фортуна)
     */
    getVallisCycle() {
        // Цикл Vallis: 6:40 тепло, 20:00 холод
        const now = Date.now();
        const cycleLength = (6 * 60 + 40 + 20 * 60) * 1000; // 26:40
        const warmLength = (6 * 60 + 40) * 1000; // 6:40 тепло
        
        const timeSinceEpoch = now - 1543334400000; // Начальная точка
        const timeInCycle = timeSinceEpoch % cycleLength;
        
        const isWarm = timeInCycle < warmLength;
        const timeLeft = isWarm 
            ? warmLength - timeInCycle 
            : cycleLength - timeInCycle;
        
        return {
            isWarm,
            state: isWarm ? 'warm' : 'cold',
            timeLeft: this.formatTime(timeLeft),
            expiry: new Date(now + timeLeft)
        };
    }

    /**
     * Получить циклы Cambion (Камбионский Дрейф)
     */
    async getCambionCycle() {
        await this.fetchWorldState();
        
        if (!this.data || !this.data.CambionCycle) {
            return null;
        }

        const cycle = this.data.CambionCycle;
        const expiry = new Date(parseInt(cycle.Expiry.$date.$numberLong));
        const now = new Date();
        const timeLeft = expiry - now;

        return {
            active: cycle.Active, // "fass" или "vome"
            state: cycle.Active,
            timeLeft: this.formatTime(timeLeft),
            expiry
        };
    }

    /**
     * Форматирование времени
     */
    formatTime(milliseconds) {
        if (milliseconds < 0) return 'Истекло';
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}ч ${minutes}м`;
        } else {
            return `${minutes}м`;
        }
    }
}

// ========================================================================
// ФУНКЦИИ ДЛЯ TELEGRAM БОТА
// ========================================================================

/**
 * Получить отформатированную информацию о сортировке
 */
async function getFormattedSortie() {
    const ws = new WarframeWorldState();
    const sortie = await ws.getSortie();
    
    if (!sortie) {
        return '❌ Не удалось получить данные о сортировке';
    }

    const timeLeft = ws.formatTime(sortie.expiry - new Date());
    
    let message = `📋 *СОРТИРОВКА*\n\n`;
    message += `👹 Босс: *${sortie.boss}*\n`;
    message += `🎯 Фракция: ${sortie.faction}\n`;
    message += `⏰ Истекает через: ${timeLeft}\n\n`;
    message += `*Миссии:*\n`;
    
    sortie.missions.forEach(mission => {
        message += `${mission.number}. ${mission.missionType}\n`;
        message += `   ⚡ ${mission.modifier}\n`;
    });

    return message;
}

/**
 * Получить отформатированную информацию о циклах
 */
async function getFormattedCycles() {
    const ws = new WarframeWorldState();
    
    const cetus = ws.getCetusCycle();
    const vallis = ws.getVallisCycle();
    const cambion = await ws.getCambionCycle();

    let message = `🌍 *ЦИКЛЫ*\n\n`;

    // Равнины Эйдолона
    const cetusState = cetus.isDay ? '☀️ День' : '🌙 Ночь';
    message += `*Равнины Эйдолона:* ${cetusState}\n`;
    message += `⏰ До смены: ${cetus.timeLeft}\n\n`;

    // Orb Vallis
    const vallisState = vallis.isWarm ? '🔥 Тепло' : '❄️ Холод';
    message += `*Orb Vallis (Фортуна):* ${vallisState}\n`;
    message += `⏰ До смены: ${vallis.timeLeft}\n\n`;

    // Cambion Drift
    if (cambion) {
        const cambionState = cambion.active === 'fass' ? '🔴 Фасс' : '🔵 Воум';
        message += `*Cambion Drift:* ${cambionState}\n`;
        message += `⏰ До смены: ${cambion.timeLeft}\n`;
    }

    return message;
}

// ========================================================================
// ЭКСПОРТ
// ========================================================================

module.exports = {
    WarframeWorldState,
    getFormattedSortie,
    getFormattedCycles
};

// ========================================================================
// ТЕСТ (если запустить файл напрямую)
// ========================================================================

if (require.main === module) {
    (async () => {
        console.log('🧪 Тестирование парсера worldState...\n');
        
        console.log('='.repeat(50));
        console.log(await getFormattedSortie());
        console.log('\n' + '='.repeat(50));
        console.log(await getFormattedCycles());
        console.log('='.repeat(50));
    })();
}