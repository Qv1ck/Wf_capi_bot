// ========================================================================
// 1. ИМПОРТЫ И КОНФИГУРАЦИЯ (CONST-БЛОК)
// ========================================================================

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const abilitiesDB = require('./warframe_abilities_ru.json');
const dropLocationsDB = require('./warframe_drop_locations_ru.json');
const cyclesDB = require('./warframe_cycles_ru.json');
const syndicateBountiesDB = require('./warframe_syndicate_bounties_ru.json');
const nameAliasesDB = require('./warframe_name_aliases_ru.json');
const { 
    getFormattedSortie, 
    getFormattedBaro, 
    getFormattedInvasions, 
    getFormattedCycles 
} = require('./warframe_parser_v3');
const weaponsPrimary = require('./weapons_primary.json');
const weaponsSecondary = require('./weapons_secondary.json');
const weaponsMelee = require('./weapons_melee.json');
console.log('✓ Загружено оружия:');
console.log(`  Primary: ${Object.keys(weaponsPrimary).length}`);
console.log(`  Secondary: ${Object.keys(weaponsSecondary).length}`);
console.log(`  Melee: ${Object.keys(weaponsMelee).length}`);

// Проверка токена
if (!process.env.BOT_TOKEN) {
    console.error('❌ Токен бота не найден!');
    process.exit(1);
}

// ========================================================================
// 2. ИНИЦИАЛИЗАЦИЯ БОТА И СОСТОЯНИЯ
// ========================================================================

const bot = new Telegraf(process.env.BOT_TOKEN);
const STATE_FILE = 'bot_state.json';
bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Главное меню' }
]).catch(err => console.log('Не удалось зарегистрировать команды:', err));

let state = loadState();
const subscribers = new Set(state.subscribers || []);
const checkedEvents = new Set(state.checkedEvents || []);
let checkIntervals = [];

//_____________
//ФУНКЦИИ
//_____________

// ========================================================================
// РАБОТА С ФАЙЛАМИ
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
// ФУНКЦИЯ РАСЧЁТА НЕДЕЛИ ДУВИРИ
// ========================================================================

/**
 * Рассчитывает текущую неделю цикла Дувири
 * Цикл: 6 недель, начало - 26 апреля 2023 (Update 33: Duviri Paradox)
 */
function getCurrentDuviriWeek() {
    const startDate = new Date('2023-04-26T00:00:00Z'); // Начало Дувири
    const now = new Date();
    
    const diffTime = now - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    // Цикл 6 недель (недели 1-6)
    const currentWeek = (diffWeeks % 6) + 1;
    
    return currentWeek;
}

/**
 * Возвращает список оружия для указанной недели
 */
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
// ФУНКЦИЯ ПОИСКА ОРУЖИЯ
// ========================================================================

/**
 * Поиск оружия в базе данных
 * @param {string} query - Название оружия
 * @param {object} weaponsDB - База данных оружия
 * @param {string} type - Тип оружия (для вывода)
 */
function searchWeapon(query, weaponsDB, type) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Ищем оружие
    for (const [key, weapon] of Object.entries(weaponsDB)) {
        if (weapon.name.toLowerCase().includes(normalizedQuery) ||
            weapon.variants.some(v => v.toLowerCase().includes(normalizedQuery))) {
            
            return formatWeaponInfo(weapon, type);
        }
    }
    
    return null;
}

/**
 * Форматирование информации об оружии
 */
function formatWeaponInfo(weapon, type) {
    const currentWeek = getCurrentDuviriWeek();
    
    let message = `🔫 *${type}*\n\n`;
    
    // Название и варианты
    message += `*Найдено:* ${weapon.variants.join(' | ')}\n\n`;
    
    // Инкарнон
    if (weapon.incarnon.available) {
        const weaponWeek = weapon.incarnon.week;
        const isCurrentWeek = weaponWeek === currentWeek;
        
        message += `⚡ *Инкарнон:* Доступен\n`;
        message += `📅 *Неделя:* ${weaponWeek}\n`;
        
        if (isCurrentWeek) {
            message += `✅ *Статус:* Доступен сейчас! (${currentWeek}-я неделя)\n`;
        } else {
            message += `⏰ *Статус:* Будет доступен на ${weaponWeek}-й неделе (сейчас ${currentWeek}-я)\n`;
        }
        
        // Список оружия этой недели
        const weekWeapons = getWeekWeapons(weaponWeek);
        message += `\n*Оружие ${weaponWeek}-й недели:*\n`;
        message += weekWeapons.join(', ');
    } else {
        message += `❌ *Инкарнон:* Недоступен`;
    }
    
    return message;
}

// ========================================================================
// КОМАНДЫ БОТА
// ========================================================================

// Основное оружие
bot.command(['основное', 'primary', 'оружие'], async (ctx) => {
    console.log('🔫 Команда /основное вызвана!');
    
    try {
        let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        console.log(`📝 Запрос: "${query}"`);
        
        if (!query) {
            console.log('⚠️ Запрос пустой, показываю подсказку');
            return ctx.reply(
                'Использование: /основное <название>\n\n' +
                'Примеры:\n' +
                '/основное Болтор\n' +
                '/основное Сома\n' +
                '/основное Брэйтон'
            );
        }
        
        console.log(`🔍 Ищу оружие: ${query}`);
        
        const result = searchWeapon(query, weaponsPrimary, 'Основное оружие');
        
        if (result) {
            console.log('✅ Найдено!');
            await ctx.replyWithMarkdown(result);
        } else {
            console.log('❌ Не найдено');
            await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
        }
    } catch (error) {
        console.error('❌ ОШИБКА в команде /основное:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});


// Вторичное оружие
bot.command(['вторичное', 'secondary', 'писталет'], async (ctx) => {
    let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    
    if (!query) {
        return ctx.reply(
            'Использование: /вторичное <название>\n\n' +
            'Примеры:\n' +
            '/вторичное Лекс\n' +
            '/вторичное Атомос\n' +
            '/вторичное Васто'
        );
    }
    
    console.log(`✓ Поиск вторичного оружия: '${query}'`);
    
    const result = searchWeapon(query, weaponsSecondary, 'Вторичное оружие');
    
    if (result) {
        await ctx.replyWithMarkdown(result);
    } else {
        await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
    }
});

// Ближнее оружие
bot.command(['ближнее', 'melee', 'мили'], async (ctx) => {
    let query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    
    if (!query) {
        return ctx.reply(
            'Использование: /ближнее <название>\n\n' +
            'Примеры:\n' +
            '/ближнее Скана\n' +
            '/ближнее Никана\n' +
            '/ближнее Грам'
        );
    }
    
    console.log(`✓ Поиск ближнего оружия: '${query}'`);
    
    const result = searchWeapon(query, weaponsMelee, 'Ближнее оружие');
    
    if (result) {
        await ctx.replyWithMarkdown(result);
    } else {
        await ctx.reply(`❌ Оружие "${query}" не найдено.\n\nПроверьте название и попробуйте снова.`);
    }
});

// Команда для просмотра текущей недели Дувири
bot.command(['дувири', 'duviri', 'неделя'], async (ctx) => {
    const currentWeek = getCurrentDuviriWeek();
    const weekWeapons = getWeekWeapons(currentWeek);
    
    let message = `🌀 *ДУВИРИЙСКАЯ ЦЕПЬ*\n\n`;
    message += `📅 *Текущая неделя:* ${currentWeek} из 6\n\n`;
    message += `⚡ *Доступные Инкарноны:*\n`;
    message += weekWeapons.join('\n');
    
    await ctx.replyWithMarkdown(message);
});


// ========================================================================
// 4. КОМАНДЫ БОТА
// ========================================================================

// ----- 4.1 КОМАНДА /start (с кнопками) -----

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
            Markup.button.callback('🔍 Поиск', 'cmd_search'),
            Markup.button.callback('📊 Статус', 'cmd_status')
        ],
        [
            Markup.button.callback('🔔 Подписки', 'cmd_subscribe')
        ]
    ]);
    
    ctx.replyWithMarkdown(message, keyboard);
});

// ----- 4.2 КОМАНДЫ С API (АКТУАЛЬНЫЕ ДАННЫЕ) -----

// Вылазка
bot.command(['sortie', 'вылазка', 'Вылазка'], async (ctx) => {
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

// Baro Ki'Teer
bot.command(['baro', 'Baro', 'баро', 'Баро'], async (ctx) => {
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

// Вторжения
bot.command(['invasions', 'вторжения', 'Вторжения'], async (ctx) => {
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

// Циклы (с параметрами)
bot.command(['time', 'цикл', 'циклы', 'время', 'cycles'], async (ctx) => {
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

// ----- 4.3 ЛОКАЛЬНЫЕ КОМАНДЫ -----

// Поиск варфрейма
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

// Статус (локальные расчёты циклов БЕЗ ротаций синдикатов)
bot.command('status', (ctx) => {
    const location = ctx.message.text.replace('/status', '').trim().toLowerCase();
    
    let message = '';
    const now = new Date();
    
    if (!location) {
        // Показываем статус ВСЕХ локаций
        message = `🕒 *Текущее время: ${now.toUTCString()}*\n\n` +
                  `${getLocationStatus('Равнины Эйдолона', now)}\n\n` +
                  `${getLocationStatus('Фортуна', now)}\n\n` +
                  `${getLocationStatus('Камбионский Дрейф', now)}\n\n` +
                  `⏰ *Уведомления приходят за:* 10 и 5 минут до смены цикла` +
                  `\n\n📊 *Статистика бота:* ${subscribers.size} подписчиков`;
    } else if (location === 'равнины эйдолона' || location === 'cetus') {
        message = getLocationStatus('Равнины Эйдолона', now);
    } else if (location === 'фортуна' || location === 'fortuna') {
        message = getLocationStatus('Фортуна', now);
    } else if (location === 'камбионский дрейф' || location === 'deimos') {
        message = getLocationStatus('Камбионский Дрейф', now);
    } else {
        message = '❌ Использование: /status [Равнины Эйдолона|фортуна|Камбионский Дрейф]\n\n' +
                 'Примеры:\n' +
                 '/status - статус всех локаций\n' +
                 '/status Равнины Эйдолона - статус Равнины Эйдолона';
    }
    
    ctx.replyWithMarkdown(message);
});

// ----- 4.4 ПОДПИСКИ -----

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
// 5. ОБРАБОТЧИКИ КНОПОК
// ========================================================================

// Вылазка
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

// Baro
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

// Вторжения
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

// Циклы
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

// Поиск - показываем подсказку
bot.action('cmd_search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔍 Используйте команду:\n/search <название варфрейма>\n\nНапример: /search Excalibur');
});

// Статус
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

// Подписки - меню
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

// Меню выбора циклов
bot.action('cycle_cetus', async (ctx) => {
    await ctx.answerCbQuery();
    const info = await getFormattedCycles('Цетус');
    ctx.replyWithMarkdown(info);
});

bot.action('cycle_vallis', async (ctx) => {
    await ctx.answerCbQuery();
    const info = await getFormattedCycles('Фортуна');
    ctx.replyWithMarkdown(info);
});

bot.action('cycle_cambion', async (ctx) => {
    await ctx.answerCbQuery();
    const info = await getFormattedCycles('Деймос');
    ctx.replyWithMarkdown(info);
});

bot.action('cycle_earth', async (ctx) => {
    await ctx.answerCbQuery();
    const info = await getFormattedCycles('Земля');
    ctx.replyWithMarkdown(info);
});

bot.action('cycle_all', async (ctx) => {
    await ctx.answerCbQuery();
    const info = await getFormattedCycles();
    ctx.replyWithMarkdown(info);
});

// ========================================================================
// 6. ФУНКЦИИ ПОИСКА И ФОРМАТИРОВАНИЯ
// ========================================================================

async function searchLocalDB(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Проверяем алиасы (русские названия)
    const englishName = nameAliasesDB[normalizedQuery];
    const searchName = englishName || normalizedQuery;
    
    // Ищем способности
    for (const [name, abilities] of Object.entries(abilitiesDB)) {
        if (name.toLowerCase().includes(searchName) || 
            abilities.name?.toLowerCase().includes(searchName)) {
            return {
                title: abilities.name || name,
                abilities: abilities.abilities,
                dropLocations: dropLocationsDB[name]
            };
        }
    }
    
    return null;
}

function formatWarframeInfo(info) {
    let message = `🔹 *${info.title}*\n\n`;
    
    // Способности
    message += `*Способности:*\n`;
    info.abilities.forEach((ability, index) => {
        message += `${index + 1}. *${ability.name}*\n`;
        message += `   ${ability.description}\n\n`;
    });
    
    // Где добывать
    if (info.dropLocations && info.dropLocations.length > 0) {
        message += `\n*Где добывать:*\n`;
        info.dropLocations.forEach((location, index) => {
            message += `${index + 1}. ${location.part}: ${location.location}\n`;
        });
    }
    
    return message;
}

// ========================================================================
// 7. ФУНКЦИИ РАСЧЁТА ЦИКЛОВ (ЛОКАЛЬНЫЕ)
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
// 8. СИСТЕМА ПРОВЕРКИ ЦИКЛОВ И УВЕДОМЛЕНИЙ
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
    
    // Проверяем каждую локацию
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
    
    // Уведомления за 10 и 5 минут
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
// 9. ЗАПУСК БОТА
// ========================================================================

console.log('='.repeat(60));
console.log('🤖 WARFRAME BOT v3');
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

// Запуск проверки циклов каждую минуту
checkIntervals.push(setInterval(checkCycles, 60000));

// Автосохранение каждые 5 минут
checkIntervals.push(setInterval(saveState, 5 * 60000));

// Graceful shutdown
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