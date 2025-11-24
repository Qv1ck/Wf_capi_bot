/**
 * ========================================================================
 * МОДУЛЬ ДЛЯ РАБОТЫ С WARFRAME API
 * ========================================================================
 * 
 * API: https://api.warframestat.us
 * Документация: https://docs.warframestat.us
 * 
 * Этот модуль заменяет статичные JSON-файлы живыми данными из API
 * Поддерживает русский язык (параметр language=ru)
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * • Получение актуальных данных о событиях
 * • Информация о циклах день/ночь (Cetus, Vallis, Cambion)
 * • Данные о Baro Ki'Teer и его товарах
 * • Текущая сортировка и вторжения
 * • Разломы Бездны
 * • И многое другое!
 */

const axios = require('axios');

// ========================================================================
// КОНФИГУРАЦИЯ
// ========================================================================

const API_CONFIG = {
    baseURL: 'https://api.warframestat.us',
    platform: 'pc', // pc, ps4, xb1, swi
    language: 'ru', // ru, en, de, es, fr, it, ko, pl, pt, zh, uk
    timeout: 10000 // 10 секунд
};

// ========================================================================
// ОСНОВНОЙ КЛАСС API
// ========================================================================

class WarframeAPI {
    constructor(platform = 'pc', language = 'ru') {
        this.platform = platform;
        this.language = language;
        this.baseURL = `${API_CONFIG.baseURL}/${platform}`;
    }

    /**
     * Универсальный метод для запросов к API
     */
    async _request(endpoint) {
        try {
            const url = `${this.baseURL}/${endpoint}`;
            const response = await axios.get(url, {
                params: { language: this.language },
                timeout: API_CONFIG.timeout
            });
            return response.data;
        } catch (error) {
            console.error(`❌ Ошибка API (${endpoint}):`, error.message);
            return null;
        }
    }

    // ====================================================================
    // МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ
    // ====================================================================

    /**
     * Получить ВСЕ данные одним запросом
     */
    async getAllData() {
        return await this._request('');
    }

    // --- ЦИКЛЫ ---

    /**
     * Получить цикл день/ночь на Равнинах Эйдолона (Cetus)
     * Возвращает: { id, expiry, isDay, state, timeLeft, shortString }
     */
    async getCetusCycle() {
        return await this._request('cetusCycle');
    }

    /**
     * Получить цикл тепло/холод на Фортуне (Orb Vallis)
     * Возвращает: { id, expiry, isWarm, state, timeLeft, shortString }
     */
    async getVallisCycle() {
        return await this._request('vallisCycle');
    }

    /**
     * Получить цикл на Камбионском Дрейфе
     * Возвращает: { id, expiry, state, active, timeLeft, shortString }
     */
    async getCambionCycle() {
        return await this._request('cambionCycle');
    }

    /**
     * Получить цикл день/ночь на Земле
     */
    async getEarthCycle() {
        return await this._request('earthCycle');
    }

    /**
     * Получить цикл на Зариман
     */
    async getZarimanCycle() {
        return await this._request('zarimanCycle');
    }

    // --- СОБЫТИЯ И МИССИИ ---

    /**
     * Получить информацию о текущей Сортировке
     * Возвращает: { id, activation, expiry, boss, faction, variants[], ... }
     */
    async getSortie() {
        return await this._request('sortie');
    }

    /**
     * Получить информацию об Арбитраже
     * Возвращает: { activation, expiry, node, enemy, type, archwing, sharkwing }
     */
    async getArbitration() {
        return await this._request('arbitration');
    }

    /**
     * Получить информацию об Охоте на Архонта
     * Возвращает: { id, activation, expiry, boss, missions[], ... }
     */
    async getArchonHunt() {
        return await this._request('archonHunt');
    }

    /**
     * Получить информацию о Стальном пути
     * Возвращает: { currentReward, rotation, remaining, ... }
     */
    async getSteelPath() {
        return await this._request('steelPath');
    }

    /**
     * Получить список активных вторжений
     * Возвращает: массив вторжений
     */
    async getInvasions() {
        return await this._request('invasions');
    }

    /**
     * Получить список активных разломов Бездны
     * Возвращает: массив разломов
     */
    async getFissures() {
        return await this._request('fissures');
    }

    /**
     * Получить список алертов
     * Возвращает: массив алертов
     */
    async getAlerts() {
        return await this._request('alerts');
    }

    // --- ТОРГОВЛЯ ---

    /**
     * Получить информацию о Baro Ki'Teer (Пустотный торговец)
     * Возвращает: { id, activation, expiry, character, location, inventory[], active }
     */
    async getVoidTrader() {
        return await this._request('voidTrader');
    }

    /**
     * Получить сделки Darvo (Daily Deals)
     * Возвращает: массив текущих скидок
     */
    async getDailyDeals() {
        return await this._request('dailyDeals');
    }

    // --- СИНДИКАТЫ ---

    /**
     * Получить миссии синдикатов
     * Возвращает: массив миссий синдикатов
     */
    async getSyndicateMissions() {
        return await this._request('syndicateMissions');
    }

    /**
     * Получить информацию о Ночной Волне
     * Возвращает: { id, activation, expiry, season, phase, activeChallenges[], ... }
     */
    async getNightwave() {
        return await this._request('nightwave');
    }

    // --- ДОПОЛНИТЕЛЬНО ---

    /**
     * Получить цель Симариса для сканирования
     * Возвращает: { target, isTargetActive, asString }
     */
    async getSimaris() {
        return await this._request('simaris');
    }

    /**
     * Получить новости
     * Возвращает: массив новостей
     */
    async getNews() {
        return await this._request('news');
    }

    /**
     * Получить список событий
     * Возвращает: массив событий
     */
    async getEvents() {
        return await this._request('events');
    }

    /**
     * Получить прогресс строительства (Razorback, etc)
     */
    async getConstructionProgress() {
        return await this._request('constructionProgress');
    }
}

// ========================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ФОРМАТИРОВАНИЯ
// ========================================================================

/**
 * Форматирование времени из ISO-строки
 * Возвращает объект: { hours, minutes, seconds, formatted }
 */
function parseTimeLeft(expiryISO) {
    try {
        const expiry = new Date(expiryISO);
        const now = new Date();
        const diff = expiry - now;

        if (diff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, formatted: 'Истекло' };
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let formatted = '';
        if (hours > 0) formatted += `${hours}ч `;
        if (minutes > 0) formatted += `${minutes}м `;
        if (hours === 0 && minutes === 0) formatted += `${seconds}с`;

        return { 
            hours, 
            minutes, 
            seconds, 
            formatted: formatted.trim(),
            totalMinutes: Math.floor(diff / (1000 * 60))
        };
    } catch (error) {
        return { hours: 0, minutes: 0, seconds: 0, formatted: 'Неизвестно' };
    }
}

/**
 * Форматирование кредитов с пробелами
 */
function formatCredits(credits) {
    return credits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Получить эмодзи для награды
 */
function getRewardEmoji(itemString) {
    const lower = itemString.toLowerCase();
    
    if (lower.includes('кредит') || lower.includes('credit')) return '💰';
    if (lower.includes('энд') || lower.includes('endo')) return '💎';
    if (lower.includes('форма') || lower.includes('forma')) return '🔷';
    if (lower.includes('катализатор') || lower.includes('catalyst')) return '🔵';
    if (lower.includes('реактор') || lower.includes('reactor')) return '🔴';
    if (lower.includes('экзилус') || lower.includes('exilus')) return '⭐';
    if (lower.includes('риссен') || lower.includes('riven')) return '🎲';
    if (lower.includes('оружие') || lower.includes('weapon')) return '⚔️';
    if (lower.includes('варфрейм') || lower.includes('warframe')) return '🤖';
    if (lower.includes('компонент') || lower.includes('component')) return '🔧';
    
    return '🎁';
}

// ========================================================================
// ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ДЛЯ TELEGRAM БОТА
// ========================================================================

/**
 * Пример: Получить и отформатировать информацию о сортировке
 */
async function getFormattedSortie() {
    const api = new WarframeAPI();
    const sortie = await api.getSortie();
    
    if (!sortie) {
        return '❌ Не удалось получить данные о сортировке';
    }

    const timeLeft = parseTimeLeft(sortie.expiry);
    
    let message = `📋 *СОРТИРОВКА*\n\n`;
    message += `👹 Босс: *${sortie.boss}*\n`;
    message += `🎯 Фракция: ${sortie.faction}\n`;
    message += `⏰ Истекает через: ${timeLeft.formatted}\n\n`;
    message += `*Миссии:*\n`;
    
    sortie.variants.forEach((mission, index) => {
        message += `${index + 1}. ${mission.missionType} - ${mission.node}\n`;
        message += `   ⚡ ${mission.modifier}\n`;
    });

    return message;
}

/**
 * Пример: Получить и отформатировать информацию о Baro Ki'Teer
 */
async function getFormattedBaro() {
    const api = new WarframeAPI();
    const baro = await api.getVoidTrader();
    
    if (!baro) {
        return '❌ Не удалось получить данные о Baro Ki\'Teer';
    }

    let message = `💎 *BARO KI'TEER*\n\n`;

    if (baro.active) {
        const timeLeft = parseTimeLeft(baro.expiry);
        message += `✅ Статус: *Присутствует*\n`;
        message += `📍 Локация: ${baro.location}\n`;
        message += `⏰ Уходит через: ${timeLeft.formatted}\n\n`;
        
        if (baro.inventory && baro.inventory.length > 0) {
            message += `*Товары (первые 5):*\n`;
            baro.inventory.slice(0, 5).forEach(item => {
                message += `${getRewardEmoji(item.item)} ${item.item}\n`;
                message += `   💰 ${formatCredits(item.credits)} кр + 💎 ${item.ducats} дук\n`;
            });
            
            if (baro.inventory.length > 5) {
                message += `\n_...и ещё ${baro.inventory.length - 5} товаров_\n`;
            }
        }
    } else {
        const timeLeft = parseTimeLeft(baro.activation);
        message += `❌ Статус: *Отсутствует*\n`;
        message += `⏰ Прибудет через: ${timeLeft.formatted}\n`;
    }

    return message;
}

/**
 * Пример: Получить информацию о циклах
 */
async function getFormattedCycles() {
    const api = new WarframeAPI();
    
    const [cetus, vallis, cambion] = await Promise.all([
        api.getCetusCycle(),
        api.getVallisCycle(),
        api.getCambionCycle()
    ]);

    let message = `🌍 *ЦИКЛЫ*\n\n`;

    // Равнины Эйдолона
    if (cetus) {
        const state = cetus.isDay ? '☀️ День' : '🌙 Ночь';
        const timeLeft = parseTimeLeft(cetus.expiry);
        message += `*Равнины Эйдолона:* ${state}\n`;
        message += `⏰ До смены: ${timeLeft.formatted}\n\n`;
    }

    // Orb Vallis
    if (vallis) {
        const state = vallis.isWarm ? '🔥 Тепло' : '❄️ Холод';
        const timeLeft = parseTimeLeft(vallis.expiry);
        message += `*Orb Vallis (Фортуна):* ${state}\n`;
        message += `⏰ До смены: ${timeLeft.formatted}\n\n`;
    }

    // Cambion Drift
    if (cambion) {
        const timeLeft = parseTimeLeft(cambion.expiry);
        message += `*Cambion Drift:* ${cambion.active}\n`;
        message += `⏰ До смены: ${timeLeft.formatted}\n`;
    }

    return message;
}

/**
 * Пример: Получить информацию о разломах
 */
async function getFormattedFissures(limit = 5) {
    const api = new WarframeAPI();
    const fissures = await api.getFissures();
    
    if (!fissures || fissures.length === 0) {
        return '❌ Нет активных разломов';
    }

    let message = `⚡ *РАЗЛОМЫ БЕЗДНЫ* (первые ${limit})\n\n`;

    fissures.slice(0, limit).forEach((fissure, index) => {
        const timeLeft = parseTimeLeft(fissure.expiry);
        message += `${index + 1}. *${fissure.tier}* - ${fissure.missionType}\n`;
        message += `   📍 ${fissure.node}\n`;
        message += `   ⏰ ${timeLeft.formatted}\n`;
        if (fissure.isStorm) message += `   ⚠️ Пустотный шторм\n`;
        if (fissure.isHard) message += `   💀 Стальной путь\n`;
        message += `\n`;
    });

    return message;
}

/**
 * Пример: Получить информацию о вторжениях
 */
async function getFormattedInvasions(limit = 3) {
    const api = new WarframeAPI();
    const invasions = await api.getInvasions();
    
    if (!invasions || invasions.length === 0) {
        return '❌ Нет активных вторжений';
    }

    // Фильтруем только активные
    const activeInvasions = invasions.filter(inv => !inv.completed);

    if (activeInvasions.length === 0) {
        return '❌ Нет активных вторжений';
    }

    let message = `⚔️ *ВТОРЖЕНИЯ*\n\n`;

    activeInvasions.slice(0, limit).forEach((invasion, index) => {
        message += `${index + 1}. *${invasion.node}*\n`;
        message += `   ${invasion.attackingFaction} vs ${invasion.defendingFaction}\n`;
        message += `   📊 Прогресс: ${invasion.completion.toFixed(1)}%\n`;
        
        const attackerReward = invasion.attackerReward?.asString || 'Нет';
        const defenderReward = invasion.defenderReward?.asString || 'Нет';
        
        message += `   🔴 Атакующие: ${attackerReward}\n`;
        message += `   🔵 Защитники: ${defenderReward}\n\n`;
    });

    return message;
}

/**
 * Пример: Получить информацию о Ночной Волне
 */
async function getFormattedNightwave() {
    const api = new WarframeAPI();
    const nightwave = await api.getNightwave();
    
    if (!nightwave) {
        return '❌ Не удалось получить данные о Ночной Волне';
    }

    let message = `🌙 *НОЧНАЯ ВОЛНА*\n\n`;
    message += `📺 Сезон: ${nightwave.season || 'Неизвестно'}\n`;
    message += `📊 Фаза: ${nightwave.phase || 'Неизвестно'}\n\n`;

    if (nightwave.activeChallenges && nightwave.activeChallenges.length > 0) {
        message += `*Активные задания (первые 3):*\n`;
        
        nightwave.activeChallenges.slice(0, 3).forEach((challenge, index) => {
            const isDaily = challenge.isDaily ? '📅 Ежедневное' : '📆 Еженедельное';
            message += `\n${index + 1}. ${challenge.title}\n`;
            message += `   ${isDaily}\n`;
            message += `   ${challenge.desc}\n`;
            message += `   ⭐ Награда: ${challenge.reputation} репутации\n`;
        });
    }

    return message;
}

// ========================================================================
// ЭКСПОРТ МОДУЛЯ
// ========================================================================

module.exports = {
    WarframeAPI,
    parseTimeLeft,
    formatCredits,
    getRewardEmoji,
    
    // Готовые функции для бота
    getFormattedSortie,
    getFormattedBaro,
    getFormattedCycles,
    getFormattedFissures,
    getFormattedInvasions,
    getFormattedNightwave
};

// ========================================================================
// ПРИМЕР ИСПОЛЬЗОВАНИЯ В КОНСОЛИ (для тестирования)
// ========================================================================

if (require.main === module) {
    (async () => {
        console.log('🧪 Тестирование Warframe API...\n');
        
        console.log(await getFormattedSortie());
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log(await getFormattedBaro());
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log(await getFormattedCycles());
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log(await getFormattedFissures());
    })();
}
