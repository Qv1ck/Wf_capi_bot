// ========================================================================
// WARFRAME BOT V3 FINAL - ПОЛНАЯ ВЕРСИЯ (FIXED SEARCH)
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

// API парсер
const { 
    getFormattedSortie, 
    getFormattedBaro, 
    getFormattedInvasions, 
    getFormattedCycles 
} = require('./warframe_parser_v3');

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
    { command: 'duviri', description: '🌀 Неделя Дувири (оружие)' },
    { command: 'warframes', description: '🤖 Варфреймы Дувири' },
    { command: 'status', description: '📊 Статус' },
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

function getCurrentDuviriWeek() {
    const startDate = new Date('2023-04-26T00:00:00Z');
    const now = new Date();
    
    const diffTime = now - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    const currentWeek = (diffWeeks % 6) + 1;
    
    return currentWeek;
}

function getCurrentDuviriWarframeWeek() {
    const startDate = new Date('2023-04-26T00:00:00Z');
    const now = new Date();
    
    const diffTime = now - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    const currentWeek = (diffWeeks % 11) + 1;
    
    return currentWeek;
}

function getWeekWeapons(week) {
    const weeklyRotation = {
        1: ['Брэйтон', 'Лато', 'Скана', 'Парис', 'Кунай'],
        2: ['Бо', 'Латрон', 'Фурис', 'Фуракс', 'Стран'],
        3: ['Лекс', 'Магистр', 'Болтор', 'Бронко', 'Керамический кинжал'],
        4: ['Торид', 'Двойные Токсоцисты', 'Двойные Ихоры', 'Митра', 'Атомос'],
        5: ['Ак и Брант', 'Сома', 'Васто', 'Нами Соло', 'Берстон'],
        6: ['Зайлок', 'Сибирь', 'Страх', 'Отчаяние', 'Ненависть']
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
            message += `✅ *Статус:* Доступен сейчас! (${currentWeek}-я из 6-ти)\n`;
        } else {
            message += `⏰ *Статус:* Будет доступен на ${weaponWeek} неделе (сейчас ${currentWeek} из 6)\n`;
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
// ФУНКЦИЯ ПОИСКА ВАРФРЕЙМОВ (ИСПРАВЛЕНА!)
// ========================================================================

async function searchLocalDB(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    console.log(`🔍 Ищу варфрейма: '${normalizedQuery}'`);
    
    // Шаг 1: Проверяем алиасы (русский → английский) с ЧАСТИЧНЫМ совпадением
    let englishKey = null;
    let bestMatch = null;
    
    // Сначала пробуем точное совпадение
    for (const [key, aliases] of Object.entries(nameAliasesDB)) {
        if (key.toLowerCase() === normalizedQuery ||
            aliases.some(alias => alias.toLowerCase() === normalizedQuery)) {
            englishKey = key;
            console.log(`✅ Найдено точное совпадение: '${normalizedQuery}' → '${englishKey}'`);
            break;
        }
    }
    
    // Если не нашли точное - ищем частичное
    if (!englishKey) {
        for (const [key, aliases] of Object.entries(nameAliasesDB)) {
            // Проверяем, содержится ли query в ключе или алиасах
            if (key.toLowerCase().includes(normalizedQuery) ||
                aliases.some(alias => alias.toLowerCase().includes(normalizedQuery))) {
                
                // Берём первое найденное
                if (!bestMatch) {
                    bestMatch = key;
                }
                
                // Но если найдено совпадение с начала - приоритет ему
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
    
    // Если не нашли в алиасах - пробуем напрямую английское имя
    if (!englishKey) {
        englishKey = normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1);
        console.log(`📝 Пробую английский ключ: '${englishKey}'`);
    }
    
    // Шаг 2: Ищем в базе английских способностей (для структуры)
    if (!abilitiesDB[englishKey]) {
        console.log(`❌ Варфрейм '${englishKey}' не найден в базе`);
        return null;
    }
    
    console.log(`✅ НАЙДЕНО: ${englishKey}`);
    
    // Шаг 3: Получаем русское имя и способности
    const russianData = warframe_abilities_ru[englishKey];
    const englishAbilities = abilitiesDB[englishKey];
    
    // Формируем массив способностей
    let abilities = [];
    if (Array.isArray(russianData)) {
        // Старый формат: просто массив
        abilities = russianData.map(name => ({ name, description: "" }));
    } else if (russianData && russianData.abilities) {
        // Новый формат: объект с abilities
        abilities = russianData.abilities;
    } else {
        // Фолбэк на английские
        abilities = englishAbilities.map(name => ({ name, description: "" }));
    }
    
    // Русское имя
    const displayName = russianData?.name || 
                       Object.keys(nameAliasesDB).find(k => k === englishKey) ||
                       englishKey;
    
    // Шаг 4: Поиск в Дувири
    let duviriInfo = null;
    try {
        for (const [key, warframe] of Object.entries(warframesDuviri)) {
            if (key.toLowerCase() === englishKey.toLowerCase()) {
                duviriInfo = warframe;
                console.log(`✅ Найден в Дувири: неделя ${warframe.week}`);
                break;
            }
        }
    } catch (error) {
        console.error('❌ Ошибка поиска в Дувири:', error.message);
    }
    
    return {
        title: displayName,
        abilities: abilities,
        dropLocations: dropLocationsDB[englishKey],
        duviri: duviriInfo
    };
}

// ========================================================================
// ФОРМАТИРОВАНИЕ ИНФОРМАЦИИ О ВАРФРЕЙМЕ
// ========================================================================

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
    
    // Места фарма
    if (info.dropLocations && info.dropLocations.length > 0) {
        message += `📍 *Где фармить:*\n`;
        info.dropLocations.forEach(loc => {
            message += `• ${loc}\n`;
        });
        message += '\n';
    }
    
    // Дувири
    if (info.duviri) {
        const currentWeek = getCurrentDuviriWarframeWeek();
        const isCurrentWeek = info.duviri.week === currentWeek;
        
        message += `🌀 *Дувири:*\n`;
        message += `📅 Неделя: ${info.duviri.week} из 11\n`;
        message += `💉 Гельминт: ${info.duviri.helminth}\n`;
        
        if (isCurrentWeek) {
            message += `✅ *Доступен СЕЙЧАС!*\n`;
        } else {
            message += `⏰ Будет доступен на ${info.duviri.week} неделе (сейчас ${currentWeek} из 11)\n`;
        }
    }
    
    return message;
}

function getLocationStatus(locationName, now) {
    const location = cyclesDB[locationName];
    if (!location) return `❌ Локация "${locationName}" не найдена`;
    
    const currentTime = now.getTime();
    
    // Для Равнин Эйдолона
    if (locationName === 'Равнины Эйдолона') {
        const cycleDuration = location.cycle_minutes * 60 * 1000; // 150 минут в мс
        const dayDuration = location.day_duration * 60 * 1000;    // 100 минут в мс
        
        // Время с начала цикла (произвольная точка отсчёта)
        const timeInCycle = (currentTime % cycleDuration);
        const isDay = timeInCycle < dayDuration;
        const timeUntilChange = isDay ? dayDuration - timeInCycle : cycleDuration - timeInCycle;
        const minutesUntilChange = Math.floor(timeUntilChange / 60000);
        
        const currentPhase = isDay ? 'День' : 'Ночь';
        const emoji = isDay ? '☀️' : '🌙';
        
        return `*${locationName}:* ${emoji} ${currentPhase}\n` +
               `⏰ До смены: ${minutesUntilChange}м`;
    }
    
    // Для Фортуны
    if (locationName === 'Фортуна') {
        const cycleDuration = location.cycle_minutes * 60 * 1000; // 270 минут в мс
        const warmDuration = location.warm_duration * 60 * 1000;  // 200 минут в мс
        
        const timeInCycle = (currentTime % cycleDuration);
        const isWarm = timeInCycle < warmDuration;
        const timeUntilChange = isWarm ? warmDuration - timeInCycle : cycleDuration - timeInCycle;
        const minutesUntilChange = Math.floor(timeUntilChange / 60000);
        
        const currentPhase = isWarm ? 'Тепло' : 'Холод';
        const emoji = isWarm ? '☀️' : '❄️';
        
        return `*${locationName}:* ${emoji} ${currentPhase}\n` +
               `⏰ До смены: ${minutesUntilChange}м`;
    }
    
    // Для Камбионского Дрейфа
    if (locationName === 'Деймос') {
        const cycleDuration = location.cycle_minutes * 60 * 1000;  // 180 минут в мс
        const activeDuration = location.active_duration * 60 * 1000; // 120 минут в мс
        
        const timeInCycle = (currentTime % cycleDuration);
        const isActive = timeInCycle < activeDuration;
        const timeUntilChange = isActive ? activeDuration - timeInCycle : cycleDuration - timeInCycle;
        const minutesUntilChange = Math.floor(timeUntilChange / 60000);
        
        const currentPhase = isActive ? 'Фэз' : 'Воум';
        const emoji = isActive ? '🔥' : '💤';
        
        return `*${locationName}:* ${emoji} ${currentPhase}\n` +
               `⏰ До смены: ${minutesUntilChange}м`;
    }
    
    return `❌ Неизвестная локация: ${locationName}`;
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
            Markup.button.callback('📋 Вылазка', 'cmd_sortie'),
            Markup.button.callback('💎 Baro', 'cmd_baro')
        ],
        [
            Markup.button.callback('⚔️ Вторжения', 'cmd_invasions'),
            Markup.button.callback('🌍 Циклы', 'cmd_cycles')
        ],
        [
            Markup.button.callback('🔍 Варфрейм', 'cmd_search'),
            Markup.button.callback('🔫 Оружие', 'cmd_weapon')
        ],
        [
            Markup.button.callback('🌀 Дувири', 'cmd_duviri'),
            Markup.button.callback('🤖 Варфреймы', 'cmd_warframes')
        ],
        [
            Markup.button.callback('📊 Статус', 'cmd_status'),
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

bot.command('duviri', async (ctx) => {
    console.log('🌀 Команда /duviri вызвана');
    
    try {
        const currentWeek = getCurrentDuviriWeek();
        const weekWeapons = getWeekWeapons(currentWeek);
        
        let message = `🌀 *ДУВИРИЙСКАЯ ЦЕПЬ (ОРУЖИЕ)*\n\n`;
        message += `📅 *Текущая неделя:* ${currentWeek} из 6\n\n`;
        message += `⚡ *Доступные Инкарноны:*\n`;
        message += weekWeapons.join('\n');
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /duviri:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

bot.command('warframes', async (ctx) => {
    console.log('🤖 Команда /warframes вызвана');
    
    try {
        const currentWeek = getCurrentDuviriWarframeWeek();
        
        const weekFrames = [];
        for (const [key, warframe] of Object.entries(warframesDuviri)) {
            if (warframe.week === currentWeek) {
                weekFrames.push(`• *${warframe.name}* - ${warframe.helminth}`);
            }
        }
        
        let message = `🤖 *ВАРФРЕЙМЫ ДУВИРИ*\n\n`;
        message += `📅 *Текущая неделя:* ${currentWeek} из 11\n\n`;
        message += `⚡ *Доступные варфреймы:*\n`;
        message += weekFrames.join('\n');
        
        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('❌ Ошибка /warframes:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// ========================================================================
// CALLBACK КНОПКИ
// ========================================================================

bot.action('cmd_sortie', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
        const loading = await ctx.reply('⏳ Получаю данные о вылазке...');
        const info = await getFormattedSortie();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /sortie:', error);
        await ctx.reply('❌ Не удалось получить данные о вылазке');
    }
});

bot.action('cmd_baro', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
        const loading = await ctx.reply('⏳ Получаю данные о Baro...');
        const info = await getFormattedBaro();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /baro:', error);
        await ctx.reply('❌ Не удалось получить данные о Baro');
    }
});

bot.action('cmd_invasions', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
        const loading = await ctx.reply('⏳ Получаю данные о вторжениях...');
        const info = await getFormattedInvasions();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /invasions:', error);
        await ctx.reply('❌ Не удалось получить данные о вторжениях');
    }
});

bot.action('cmd_cycles', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
        const loading = await ctx.reply('⏳ Получаю данные о циклах...');
        const info = await getFormattedCycles();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /cycles:', error);
        await ctx.reply('❌ Не удалось получить данные о циклах');
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

bot.action('cmd_duviri', async (ctx) => {
    await ctx.answerCbQuery();
    
    const currentWeek = getCurrentDuviriWeek();
    const weekWeapons = getWeekWeapons(currentWeek);
    
    let message = `🌀 *ДУВИРИЙСКАЯ ЦЕПЬ (ОРУЖИЕ)*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 6\n\n`;
    message += `⚡ *Доступные Инкарноны:*\n`;
    message += weekWeapons.join('\n');
    
    await ctx.replyWithMarkdown(message);
});

bot.action('cmd_warframes', async (ctx) => {
    await ctx.answerCbQuery();
    
    const currentWeek = getCurrentDuviriWarframeWeek();
    
    const weekFrames = [];
    for (const [key, warframe] of Object.entries(warframesDuviri)) {
        if (warframe.week === currentWeek) {
            weekFrames.push(`• *${warframe.name}* - ${warframe.helminth}`);
        }
    }
    
    let message = `🤖 *ВАРФРЕЙМЫ ДУВИРИ*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 11\n\n`;
    message += `⚡ *Доступные варфреймы:*\n`;
    message += weekFrames.join('\n');
    
    await ctx.replyWithMarkdown(message);
});

bot.action('cmd_status', async (ctx) => {
    await ctx.answerCbQuery();
    const now = new Date();
    const message = `🕒 *Текущее время: ${now.toUTCString()}*\n\n` +
                    `${getLocationStatus('Равнины Эйдолона', now)}\n\n` +
                    `${getLocationStatus('Фортуна', now)}\n\n` +
                    `${getLocationStatus('Деймос', now)}\n\n` +
                    `📊 *Подписчиков:* ${subscribers.size}`;
    ctx.replyWithMarkdown(message);
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
// КОМАНДЫ API
// ========================================================================

bot.command('sortie', async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о вылазке...');
        const info = await getFormattedSortie();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /sortie:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.command('baro', async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о Baro...');
        const info = await getFormattedBaro();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /baro:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.command('invasions', async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о вторжениях...');
        const info = await getFormattedInvasions();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /invasions:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.command(['time', 'cycles'], async (ctx) => {
    try {
        let location = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        const loading = await ctx.reply('⏳ Получаю данные о циклах...');
        const info = await getFormattedCycles(location || null);
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /time:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// ========================================================================
// КОМАНДЫ ВАРФРЕЙМОВ
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

bot.command('status', (ctx) => {
    const location = ctx.message.text.replace('/status', '').trim().toLowerCase();
    
    let message = '';
    const now = new Date();
    
    if (!location) {
        message = `🕒 *Текущее время: ${now.toUTCString()}*\n\n` +
                  `${getLocationStatus('Равнины Эйдолона', now)}\n\n` +
                  `${getLocationStatus('Фортуна', now)}\n\n` +
                  `${getLocationStatus('Камбионский Дрейф', now)}\n\n` +
                  `⏰ *Уведомления приходят за:* 10 и 5 минут до смены цикла` +
                  `\n\n📊 *Подписчиков:* ${subscribers.size}`;
    } else if (location === 'равнины эйдолона' || location === 'cetus') {
        message = getLocationStatus('Равнины Эйдолона', now);
    } else if (location === 'фортуна' || location === 'fortuna') {
        message = getLocationStatus('Фортуна', now);
    } else if (location === 'камбионский дрейф' || location === 'deimos') {
        message = getLocationStatus('Камбионский Дрейф', now);
    } else {
        message = '❌ Использование: /status [Равнины Эйдолона|фортуна|Камбионский Дрейф]';
    }
    
    ctx.replyWithMarkdown(message);
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
    
    ['Равнины Эйдолона', 'Фортуна', 'Камбионский Дрейф'].forEach(locationName => {
        checkSingleCycle(locationName, now);
    });
}

function checkSingleCycle(locationName, now) {
    const location = cyclesDB[locationName];
    if (!location) return;

    const currentTime = now.getTime();
    
    let cycleDuration, phase1Duration, currentPhase, nextPhase;
    
    if (locationName === 'Равнины Эйдолона') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.day_duration * 60 * 1000;
        const timeInCycle = (currentTime % cycleDuration);
        const isDay = timeInCycle < phase1Duration;
        currentPhase = isDay ? 'День' : 'Ночь';
        nextPhase = isDay ? 'Ночь' : 'День';
    } 
    else if (locationName === 'Фортуна') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.warm_duration * 60 * 1000;
        const timeInCycle = (currentTime % cycleDuration);
        const isWarm = timeInCycle < phase1Duration;
        currentPhase = isWarm ? 'Тепло' : 'Холод';
        nextPhase = isWarm ? 'Холод' : 'Тепло';
    }
    else if (locationName === 'Деймос') {
        cycleDuration = location.cycle_minutes * 60 * 1000;
        phase1Duration = location.active_duration * 60 * 1000;
        const timeInCycle = (currentTime % cycleDuration);
        const isActive = timeInCycle < phase1Duration;
        currentPhase = isActive ? 'Фэз' : 'Воум';
        nextPhase = isActive ? 'Воум' : 'Фэз';
    } else {
        return;
    }
    
    const timeInCycle = (currentTime % cycleDuration);
    const timeUntilChange = timeInCycle < phase1Duration 
        ? phase1Duration - timeInCycle 
        : cycleDuration - timeInCycle;
    
    const minutesUntilChange = Math.floor(timeUntilChange / 60000);
    
    // Уведомления за 10 и 5 минут
    [10, 5].forEach(threshold => {
        const eventKey = `${locationName}_${threshold}_${Math.floor(currentTime / (60000 * threshold))}`;
        
        if (minutesUntilChange === threshold && !checkedEvents.has(eventKey)) {
            checkedEvents.add(eventKey);
            const message = `⏰ *${locationName}*\n\n` +
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
console.log('🤖 WARFRAME BOT V3 FINAL (FIXED SEARCH)');
console.log('='.repeat(60));
console.log('✓ Бот инициализирован');
console.log('✓ Парсер worldState подключён');
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
