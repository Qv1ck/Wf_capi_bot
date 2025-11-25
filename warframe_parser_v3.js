/**
 * ========================================================================
 * ПОЛНЫЙ ПАРСЕР ДЛЯ WARFRAME API v3
 * ========================================================================
 * 
 * Работает с официальным worldState.php от Digital Extremes
 * Без внешних зависимостей (только Node.js)
 * Русские переводы
 * 
 * Функции:
 * - Вылазка (Sortie)
 * - Циклы (Cetus, Vallis, Cambion, Earth)
 * - Баро Ki'Teer
 * - Вторжения
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

const FACTIONS = {
    'FC_GRINEER': 'Гринир',
    'FC_CORPUS': 'Корпус',
    'FC_INFESTED': 'Заражённые',
    'FC_CORRUPTED': 'Развращённые',
    'FC_OROKIN': 'Орокин'
};

// Реле (Relays)
const RELAYS = {
    'EarthHUB': 'Ларунда (Земля)',
    'VenusHUB': 'Веспер (Венера)',
    'MarsHUB': 'Олимп (Марс)',
    'SaturnHUB': 'Кракен (Сатурн)',
    'PlutoHUB': 'Плутон (Харон)',
    'ErisHUB': 'Киприя (Эрида)',
    'CeresHUB': 'Церера',
    'UranusHUB': 'Уран'
};

// Таблица перевода предметов
const ITEM_TRANSLATIONS = {
    // Ресурсы
    '/Lotus/Types/Items/Research/EnergyComponent': 'Энергетический компонент',
    '/Lotus/Types/Items/Research/ChemComponent': 'Химический компонент',
    '/Lotus/Types/Items/Research/MutaGen': 'Мутаген',
    '/Lotus/Types/Items/Research/Fieldron': 'Фиелдрон',
    '/Lotus/Types/Items/Research/Detonite': 'Детонит',
    '/Lotus/Types/Items/Research/BioComponent': 'Мутагенная масса',
    '/Lotus/Types/Items/Research/CryoniK': 'Криони',
    
    // Чертежи оружия
    '/Lotus/Types/Recipes/Weapons/GrineerCombatKnifeSortieBlueprint': 'Sheev (чертёж)',
    '/Lotus/Types/Recipes/Weapons/WeaponParts/SnipetronVandalReceiver': 'Снайпетрон Вандал (ствол)',
    '/Lotus/Types/Recipes/Weapons/WeaponParts/SnipetronVandalBarrel': 'Снайпетрон Вандал (затвор)',
    
    // Катализаторы и реакторы
    '/Lotus/Types/Boosters/AffinityBooster': 'Катализатор Орокин',
    '/Lotus/Types/Items/MiscItems/Reactors': 'Реактор Орокин',
    
    // Форма
    '/Lotus/Types/Items/MiscItems/Formas': 'Форма',
    '/Lotus/StoreItems/Types/Items/MiscItems/Forma': 'Форма'
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
     * Получить вылазку (Sortie)
     */
    async getSortie() {
        await this.fetchWorldState();
        
        if (!this.data || !this.data.Sorties || this.data.Sorties.length === 0) {
            return null;
        }

        const sortie = this.data.Sorties[0];
        
        const activation = new Date(parseInt(sortie.Activation.$date.$numberLong));
        const expiry = new Date(parseInt(sortie.Expiry.$date.$numberLong));
        
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
     * Получить Baro Ki'Teer
     */
    async getVoidTrader() {
        await this.fetchWorldState();
        
        if (!this.data || !this.data.VoidTraders || this.data.VoidTraders.length === 0) {
            return null;
        }

        const baro = this.data.VoidTraders[0];
        
        const activation = new Date(parseInt(baro.Activation.$date.$numberLong));
        const expiry = new Date(parseInt(baro.Expiry.$date.$numberLong));
        const now = new Date();
        
        const isActive = now >= activation && now < expiry;
        const location = RELAYS[baro.Node] || baro.Node;

        return {
            active: isActive,
            location,
            activation,
            expiry
        };
    }

    /**
     * Получить вторжения
     */
    async getInvasions() {
        await this.fetchWorldState();
        
        if (!this.data || !this.data.Invasions) {
            return null;
        }

        // Фильтруем только активные вторжения
        const activeInvasions = this.data.Invasions.filter(inv => !inv.Completed);

        return activeInvasions.map(invasion => {
            const attackerFaction = FACTIONS[invasion.Faction] || invasion.Faction;
            const defenderFaction = FACTIONS[invasion.DefenderFaction] || invasion.DefenderFaction;
            
            // Получаем награды
            const attackerReward = this.parseReward(invasion.AttackerReward);
            const defenderReward = this.parseReward(invasion.DefenderReward);
            
            // Прогресс
            const progress = (invasion.Count / invasion.Goal * 100).toFixed(1);
            
            return {
                node: invasion.Node,
                attackerFaction,
                defenderFaction,
                attackerReward,
                defenderReward,
                progress: parseFloat(progress)
            };
        });
    }

    /**
     * Парсинг наград
     */
    parseReward(reward) {
        if (!reward || !reward.countedItems || reward.countedItems.length === 0) {
            return 'Нет';
        }

        const item = reward.countedItems[0];
        const itemType = item.ItemType;
        const itemCount = item.ItemCount;

        // Пытаемся перевести
        let itemName = ITEM_TRANSLATIONS[itemType];
        
        if (!itemName) {
            // Извлекаем название из пути
            const parts = itemType.split('/');
            itemName = parts[parts.length - 1];
        }

        if (itemCount > 1) {
            return `${itemName} x${itemCount}`;
        }

        return itemName;
    }

    /**
     * Получить циклы Cetus (Равнины Эйдолона)
     */
    getCetusCycle() {
        const now = Date.now();
        const cycleLength = 150 * 60 * 1000; // 150 минут
        const dayLength = 100 * 60 * 1000;   // 100 минут день
        
        const timeSinceEpoch = now - 1560950400000;
        const timeInCycle = timeSinceEpoch % cycleLength;
        
        const isDay = timeInCycle < dayLength;
        const timeLeft = isDay 
            ? dayLength - timeInCycle 
            : cycleLength - timeInCycle;
        
        return {
            isDay,
            state: isDay ? 'День' : 'Ночь',
            timeLeft: this.formatTime(timeLeft),
            expiry: new Date(now + timeLeft)
        };
    }

    /**
     * Получить циклы Vallis (Orb Vallis - Фортуна)
     */
    getVallisCycle() {
        const now = Date.now();
        // Исправленный расчёт: 6м 40с тепло, 20м холод
        const warmMinutes = 6 + (40 / 60); // 6.666... минут
        const coldMinutes = 20;
        const cycleLength = (warmMinutes + coldMinutes) * 60 * 1000; // Полный цикл
        const warmLength = warmMinutes * 60 * 1000; // 6м 40с в миллисекундах
        
        const timeSinceEpoch = now - 1543334400000;
        const timeInCycle = timeSinceEpoch % cycleLength;
        
        const isWarm = timeInCycle < warmLength;
        const timeLeft = isWarm 
            ? warmLength - timeInCycle 
            : cycleLength - timeInCycle;
        
        return {
            isWarm,
            state: isWarm ? 'Тепло' : 'Холод',
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

        const stateName = cycle.Active === 'fass' ? 'Фасс' : 'Воум';

        return {
            active: cycle.Active,
            state: stateName,
            timeLeft: this.formatTime(timeLeft),
            expiry
        };
    }

    /**
     * Получить цикл Земли
     */
    getEarthCycle() {
        const now = Date.now();
        const cycleLength = 4 * 60 * 60 * 1000; // 4 часа
        const dayLength = 2 * 60 * 60 * 1000;   // 2 часа день
        
        const timeSinceEpoch = now;
        const timeInCycle = timeSinceEpoch % cycleLength;
        
        const isDay = timeInCycle < dayLength;
        const timeLeft = isDay 
            ? dayLength - timeInCycle 
            : cycleLength - timeInCycle;
        
        return {
            isDay,
            state: isDay ? 'День' : 'Ночь',
            timeLeft: this.formatTime(timeLeft),
            expiry: new Date(now + timeLeft)
        };
    }

    /**
     * Форматирование времени
     */
    formatTime(milliseconds) {
        if (milliseconds < 0) return 'Истекло';
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let result = '';
        if (days > 0) result += `${days}д `;
        if (hours > 0) result += `${hours}ч `;
        if (minutes > 0 || days > 0 || hours > 0) result += `${minutes}м`;
        if (days === 0 && hours === 0 && minutes === 0) result += `${seconds}с`;

        return result.trim();
    }
}

// ========================================================================
// ФУНКЦИИ ДЛЯ TELEGRAM БОТА
// ========================================================================

/**
 * Получить отформатированную информацию о вылазке
 */
async function getFormattedSortie() {
    const ws = new WarframeWorldState();
    const sortie = await ws.getSortie();
    
    if (!sortie) {
        return '❌ Не удалось получить данные о вылазке';
    }

    const timeLeft = ws.formatTime(sortie.expiry - new Date());
    
    let message = `📋 *ВЫЛАЗКА*\n\n`;
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
 * Получить отформатированную информацию о Baro Ki'Teer
 */
async function getFormattedBaro() {
    const ws = new WarframeWorldState();
    const baro = await ws.getVoidTrader();
    
    if (!baro) {
        return '❌ Не удалось получить данные о Baro Ki\'Teer';
    }

    let message = `💎 *BARO KI'TEER*\n\n`;

    if (baro.active) {
        const timeLeft = ws.formatTime(baro.expiry - new Date());
        message += `✅ Присутствует\n`;
        message += `📍 ${baro.location}\n`;
        message += `⏰ Улетит через: ${timeLeft}`;
    } else {
        const timeLeft = ws.formatTime(baro.activation - new Date());
        message += `🚀 На подлёте\n`;
        message += `⏰ Прибудет через: ${timeLeft}`;
    }

    return message;
}

/**
 * Получить отформатированную информацию о вторжениях
 */
async function getFormattedInvasions() {
    const ws = new WarframeWorldState();
    const invasions = await ws.getInvasions();
    
    if (!invasions || invasions.length === 0) {
        return '❌ Нет активных вторжений';
    }

    let message = `⚔️ *ВТОРЖЕНИЯ*\n\n`;

    invasions.forEach((invasion, index) => {
        message += `${index + 1}. *${invasion.node}*\n`;
        message += `   ${invasion.attackerFaction} vs ${invasion.defenderFaction}\n`;
        message += `   🔴 ${invasion.attackerReward}\n`;
        message += `   🔵 ${invasion.defenderReward}\n`;
        message += `   📊 ${invasion.progress}%\n\n`;
    });

    return message.trim();
}

/**
 * Получить отформатированную информацию о циклах
 */
async function getFormattedCycles(location = null) {
    const ws = new WarframeWorldState();
    
    // Если указана конкретная локация
    if (location) {
        const loc = location.toLowerCase();
        
        if (loc.includes('цетус') || loc.includes('эйдолон') || loc.includes('равнин')) {
            const cetus = ws.getCetusCycle();
            const emoji = cetus.isDay ? '☀️' : '🌙';
            return `🌍 *Равнины Эйдолона*\n\n${emoji} ${cetus.state}\n⏰ До смены: ${cetus.timeLeft}`;
        }
        
        if (loc.includes('фортун') || loc.includes('vallis') || loc.includes('вен')) {
            const vallis = ws.getVallisCycle();
            const emoji = vallis.isWarm ? '🔥' : '❄️';
            return `🌍 *Orb Vallis (Фортуна)*\n\n${emoji} ${vallis.state}\n⏰ До смены: ${vallis.timeLeft}`;
        }
        
        if (loc.includes('деймос') || loc.includes('дейм') || loc.includes('камбион')) {
            const cambion = await ws.getCambionCycle();
            if (!cambion) return '❌ Не удалось получить данные о Камбионском Дрейфе';
            const emoji = cambion.active === 'fass' ? '🔴' : '🔵';
            return `🌍 *Камбионский Дрейф*\n\n${emoji} ${cambion.state}\n⏰ До смены: ${cambion.timeLeft}`;
        }
        
        if (loc.includes('земл')) {
            const earth = ws.getEarthCycle();
            const emoji = earth.isDay ? '☀️' : '🌙';
            return `🌍 *Земля*\n\n${emoji} ${earth.state}\n⏰ До смены: ${earth.timeLeft}`;
        }
        
        return '❌ Локация не найдена. Доступные: Цетус, Фортуна, Деймос, Земля';
    }
    
    // Показываем все циклы
    const cetus = ws.getCetusCycle();
    const vallis = ws.getVallisCycle();
    const cambion = await ws.getCambionCycle();
    const earth = ws.getEarthCycle();

    let message = `🌍 *ЦИКЛЫ*\n\n`;

    // Равнины Эйдолона
    const cetusEmoji = cetus.isDay ? '☀️' : '🌙';
    message += `*Равнины Эйдолона:* ${cetusEmoji} ${cetus.state}\n`;
    message += `⏰ До смены: ${cetus.timeLeft}\n\n`;

    // Orb Vallis
    const vallisEmoji = vallis.isWarm ? '🔥' : '❄️';
    message += `*Orb Vallis (Фортуна):* ${vallisEmoji} ${vallis.state}\n`;
    message += `⏰ До смены: ${vallis.timeLeft}\n\n`;

    // Cambion Drift
    if (cambion) {
        const cambionEmoji = cambion.active === 'fass' ? '🔴' : '🔵';
        message += `*Камбионский Дрейф:* ${cambionEmoji} ${cambion.state}\n`;
        message += `⏰ До смены: ${cambion.timeLeft}\n\n`;
    }

    // Земля
    const earthEmoji = earth.isDay ? '☀️' : '🌙';
    message += `*Земля:* ${earthEmoji} ${earth.state}\n`;
    message += `⏰ До смены: ${earth.timeLeft}`;

    return message;
}

// ========================================================================
// ЭКСПОРТ
// ========================================================================

module.exports = {
    WarframeWorldState,
    getFormattedSortie,
    getFormattedBaro,
    getFormattedInvasions,
    getFormattedCycles
};

// ========================================================================
// ТЕСТ (если запустить файл напрямую)
// ========================================================================

if (require.main === module) {
    (async () => {
        console.log('🧪 Тестирование парсера worldState...\n');
        
        console.log('='.repeat(50));
        console.log(await getFormattedBaro());
        console.log('\n' + '='.repeat(50));
        console.log(await getFormattedInvasions());
        console.log('\n' + '='.repeat(50));
        console.log(await getFormattedCycles());
        console.log('='.repeat(50));
    })();
}
