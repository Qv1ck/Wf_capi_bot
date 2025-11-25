// ========================================================================
// WARFRAME BOT V3 FINAL - ПОЛНАЯ ВЕРСИЯ
// ========================================================================

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// Локальные базы данных
const abilitiesDB = require('./warframe_abilities_ru.json');
const dropLocationsDB = require('./warframe_drop_locations_ru.json');
const cyclesDB = require('./warframe_cycles_ru.json');
const syndicateBountiesDB = require('./warframe_syndicate_bounties_ru.json');
const nameAliasesDB = require('./warframe_name_aliases_ru.json');

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
// ФУНКЦИИ ДЛЯ ВАРФРЕЙМОВ
// ========================================================================

async function searchLocalDB(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    console.log(`🔍 Ищу варфрейма: '${normalizedQuery}'`);
    
    // Проверяем алиасы
    const englishName = nameAliasesDB[normalizedQuery];
    const searchName = englishName || normalizedQuery;
    
    console.log(`📝 Поисковое имя: '${searchName}'`);
    
    for (const [name, abilities] of Object.entries(abilitiesDB)) {
        const frameName = abilities.name || name;
        
        if (name.toLowerCase().includes(searchName) || 
            frameName.toLowerCase().includes(searchName)) {
            
            console.log(`✅ НАЙДЕНО: ${frameName}`);
            
            // Поиск варфрейма в Дувири
            let duviriInfo = null;
            try {
                for (const [key, warframe] of Object.entries(warframesDuviri)) {
                    if (warframe.name.toLowerCase() === frameName.toLowerCase()) {
                        duviriInfo = warframe;
                        console.log(`✅ Найден в Дувири: неделя ${warframe.week}`);
                        break;
                    }
                }
            } catch (error) {
                console.error('❌ Ошибка поиска в Дувири:', error.message);
            }
            
            return {
                title: frameName,
                abilities: abilities.abilities,
                dropLocations: dropLocationsDB[name],
                duviri: duviriInfo
            };
        }
    }
    
    console.log(`❌ Не найдено: '${normalizedQuery}'`);
    return null;
}

function formatWarframeInfo(info) {
    let message = `🤖 *${info.title}*\n\n`;
    
    message += `⚡ *Способности:*\n`;
    info.abilities.forEach((ability, index) => {
        message += `${index + 1}. *${ability.name}*\n`;
    });
    
    if (info.dropLocations && info.dropLocations.length > 0) {
        message += `\n🎯 *Где добыть:*\n`;
        info.dropLocations.forEach((location) => {
            const icon = location.part.includes('Чертеж') ? '📜' :
                        location.part.includes('Нейроптика') ? '🔸' :
                        location.part.includes('Каркас') ? '🔲' : '📘';
            message += `${icon} ${location.part}: ${location.location}\n`;
        });
    }
    
    // Информация о Дувири
    if (info.duviri) {
        const currentWeek = getCurrentDuviriWarframeWeek();
        const isCurrentWeek = info.duviri.week === currentWeek;
        
        message += `\n🌀 *Цепь Дувири:* Доступен\n`;
        message += `📅 *Неделя:* ${info.duviri.week} (сейчас ${currentWeek}-я из 11-ти)\n`;
        message += `🧬 *Helminth:* ${info.duviri.helminth}`;
        
        if (isCurrentWeek) {
            message += `\n✅ *Доступен прямо сейчас!*`;
        }
    }
    
    return message;
}

// ========================================================================
// ФУНКЦИИ ДЛЯ ЦИКЛОВ
// ========================================================================

function getLocationStatus(locationName, now) {
    const location = cyclesDB[locationName];
    if (!location) {
        return `❌ Локация "${locationName}" не найдена`;
    }

    const currentTime = now.getTime();
    const cycle = location.cycles[0];
    const startTime = new Date(cycle.start).getTime();
    const cycleDuration = cycle.duration * 60 * 1000;
    
    const timeSinceStart = currentTime - startTime;
    const timeInCycle = timeSinceStart % cycleDuration;
    const phase1Duration = cycle.phase1_duration * 60 * 1000;
    
    const isPhase1 = timeInCycle < phase1Duration;
    const timeUntilChange = isPhase1 
        ? phase1Duration - timeInCycle 
        : cycleDuration - timeInCycle;
    
    const minutesUntilChange = Math.floor(timeUntilChange / 60000);
    
    const currentPhase = isPhase1 ? cycle.phase1 : cycle.phase2;
    const emoji = isPhase1 ? '☀️' : '🌙';
    
    return `*${locationName}:* ${emoji} ${currentPhase}\n` +
           `⏰ До смены: ${minutesUntilChange}м`;
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
// КОМАНДЫ API
// ========================================================================

bot.command(['sortie', 'вылазка'], async (ctx) => {
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

bot.command(['baro', 'баро'], async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Проверяю Baro Ki\'Teer...');
        const info = await getFormattedBaro();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка /baro:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.command(['invasions', 'вторжения'], async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю список вторжений...');
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
// ОБРАБОТЧИКИ КНОПОК
// ========================================================================

bot.action('cmd_sortie', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Получаю данные о вылазке...');
    try {
        const info = await getFormattedSortie();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.action('cmd_baro', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Проверяю Baro Ki\'Teer...');
    try {
        const info = await getFormattedBaro();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.action('cmd_invasions', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Получаю список вторжений...');
    try {
        const info = await getFormattedInvasions();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.action('cmd_cycles', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Получаю данные о циклах...');
    try {
        const info = await getFormattedCycles();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        await ctx.reply('❌ Не удалось получить данные');
    }
});

bot.action('cmd_search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔍 Используйте команду:\n/search <название варфрейма>\n\nНапример: /search Excalibur');
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
                    `${getLocationStatus('Камбионский Дрейф', now)}\n\n` +
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
    const cycle = location.cycles[0];
    const startTime = new Date(cycle.start).getTime();
    const cycleDuration = cycle.duration * 60 * 1000;
    
    const timeSinceStart = currentTime - startTime;
    const timeInCycle = timeSinceStart % cycleDuration;
    const phase1Duration = cycle.phase1_duration * 60 * 1000;
    
    const isPhase1 = timeInCycle < phase1Duration;
    const timeUntilChange = isPhase1 
        ? phase1Duration - timeInCycle 
        : cycleDuration - timeInCycle;
    
    const minutesUntilChange = Math.floor(timeUntilChange / 60000);
    
    [10, 5].forEach(threshold => {
        const eventKey = `${locationName}_${threshold}_${Math.floor(currentTime / (60000 * threshold))}`;
        
        if (minutesUntilChange === threshold && !checkedEvents.has(eventKey)) {
            checkedEvents.add(eventKey);
            const nextPhase = isPhase1 ? cycle.phase2 : cycle.phase1;
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
console.log('🤖 WARFRAME BOT V3 FINAL');
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
