// ========================================================================
// 1. ИМПОРТЫ - Подключение библиотек и загрузка данных из JSON-файлов
// ========================================================================
// Эти файлы загружаются ОДИН РАЗ при запуске бота и хранятся в памяти
//
// ЛОГИКА РАБОТЫ БОТА:
// • В ЛИЧНЫХ СООБЩЕНИЯХ - бот реагирует на любой текст
// • В ГРУППАХ - бот реагирует только на упоминания через @ или команды /
//   Примеры в группе:
//   ✅ @bot_username Excalibur
//   ✅ /search Excalibur
//   ✅ /status
//   ❌ Excalibur (просто текст - игнорируется)

// ========================================================================
// ПРИМЕЧАНИЯ
// ========================================================================

/**
 * ДОСТУПНЫЕ КОМАНДЫ:
 * 
 * /start                  - Главное меню с кнопками
 * /sortie или /вылазка    - Текущая вылазка
 * /baro или /баро         - Baro Ki'Teer
 * /invasions или /вторжения - Вторжения
 * /time или /цикл         - Все циклы
 * /time Цетус             - Только Равнины Эйдолона
 * /time Фортуна           - Только Orb Vallis
 * /time Деймос            - Только Камбионский Дрейф
 * /time Земля             - Только Земля
 * 
 * КНОПКИ В /start:
 * - Вызывают те же функции что и команды
 * - Работают через callback_query
 * - Более удобны для пользователей
 */


// require('dotenv').config(); // Загружает переменные окружения (токен бота) из файла .env
const { Telegraf } = require('telegraf'); // Библиотека для работы с Telegram Bot API
const fs = require('fs'); // Модуль Node.js для работы с файловой системой

// Загрузка баз данных из JSON-файлов
const abilitiesDB = require('./warframe_abilities_ru.json'); // Способности варфреймов
const dropLocationsDB = require('./warframe_drop_locations_ru.json'); // Где добывать детали
const cyclesDB = require('./warframe_cycles_ru.json'); // Циклы день/ночь, тепло/холод
const syndicateBountiesDB = require('./warframe_syndicate_bounties_ru.json'); // ← НОВОЕ: ротации миссий синдикатов
const nameAliasesDB = require('./warframe_name_aliases_ru.json'); // ← НОВОЕ: русские названия варфреймов

// Проверка наличия токена бота
if (!process.env.BOT_TOKEN) {
    console.error('❌ Токен бота не найден!');
    process.exit(1); // Останавливаем программу, если токена нет
}

// ========================================================================
// 2. ИНИЦИАЛИЗАЦИЯ - Создание бота и основных переменных
// ========================================================================

const bot = new Telegraf(process.env.BOT_TOKEN); // Создаём объект бота
const STATE_FILE = 'bot_state.json'; // Имя файла для сохранения состояния

// Загружаем сохранённое состояние бота (подписчики и проверенные события)
let state = loadState();

// Set - это особый тип данных, который хранит уникальные значения (без повторов)
const subscribers = new Set(state.subscribers || []); // ID чатов, подписанных на уведомления
const checkedEvents = new Set(state.checkedEvents || []); // События, о которых уже отправили уведомление
let checkIntervals = []; // Массив для хранения ID таймеров (чтобы потом их остановить)
const { 
    getFormattedSortie, 
    getFormattedBaro, 
    getFormattedInvasions, 
    getFormattedCycles 
} = require('./warframe_parser_v3');
const { Markup } = require('telegraf');

// ========================================================================
// 3. ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ - Сохранение и загрузка состояния
// ========================================================================

/**
 * saveState() - Сохраняет текущее состояние бота в файл
 * Вызывается:
 * - При изменении подписчиков (subscribe/unsubscribe)
 * - При отправке уведомлений (чтобы не повторить)
 * - Каждые 5 минут автоматически
 * - При остановке бота (Ctrl+C)
 */
function saveState() {
    try {
        const state = {
            subscribers: Array.from(subscribers), // Преобразуем Set в массив для сохранения
            checkedEvents: Array.from(checkedEvents),
            lastSave: new Date().toISOString() // Время последнего сохранения
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); // Записываем в файл красиво отформатированный JSON
        console.log(`✓ Состояние сохранено: ${subscribers.size} подписчиков, ${checkedEvents.size} событий`);
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error.message);
    }
}

/**
 * loadState() - Загружает состояние бота из файла
 * Вызывается ОДИН РАЗ при запуске бота
 */
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) { // Проверяем, существует ли файл
            const data = fs.readFileSync(STATE_FILE, 'utf8'); // Читаем файл как текст
            const state = JSON.parse(data); // Превращаем JSON-строку в объект JavaScript
            console.log(`✓ Состояние загружено: ${state.subscribers?.length || 0} подписчиков, ${state.checkedEvents?.length || 0} событий`);
            return state;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки состояния:', error.message);
    }
    return { subscribers: [], checkedEvents: [] }; // Если файла нет - возвращаем пустое состояние
}

// ========================================================================
// 4. КОМАНДЫ БОТА - Обработка сообщений от пользователей
// ========================================================================

/**
 * /start с кнопками - Приветственное сообщение и список команд
 * ctx (context) - объект, содержащий всю информацию о сообщении:
 * - ctx.from.first_name - имя отправителя
 * - ctx.chat.id - уникальный ID чата
 * - ctx.reply() - отправить ответ
 */
bot.start((ctx) => {
    const message = 
        `🤖 *Warf_bot*\n\n` +
        `Still sane, exile?\n\n` +
        `Выберите команду ниже или введите вручную:`;
    
    // Создаём кнопки
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
            Markup.button.callback('🔍 Поиск варфрейма', 'cmd_search'),
            Markup.button.callback('📊 Статус', 'cmd_status')
        ],
        [
            Markup.button.callback('🔔 Подписки', 'cmd_subscribe')
        ]
    ]);
    
    ctx.replyWithMarkdown(message, keyboard);
});

// ========================================================================
// ОБРАБОТЧИКИ КНОПОК
// ========================================================================

// Вылазка
bot.action('cmd_sortie', async (ctx) => {
    await ctx.answerCbQuery(); // Убирает "часики" на кнопке
    await ctx.reply('⏳ Получаю данные о вылазке...');
    
    try {
        const info = await getFormattedSortie();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// Baro Ki'Teer
bot.action('cmd_baro', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Проверяю Baro Ki\'Teer...');
    
    try {
        const info = await getFormattedBaro();
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка:', error);
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
        console.error('Ошибка:', error);
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
        console.error('Ошибка:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// Поиск - показываем подсказку
bot.action('cmd_search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔍 Используйте команду:\n/search <название варфрейма>\n\nНапример: /search Excalibur');
});

// Статус - вызываем вашу существующую команду
bot.action('cmd_status', async (ctx) => {
    await ctx.answerCbQuery();
    // Здесь вызовите вашу существующую функцию статуса
    // Например:
    ctx.reply('📊 Статус:\n\n' + getCurrentStatus());
});

// Подписки - показываем меню
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

bot.command(['sortie', 'вылазка', 'Вылазка'], async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о вылазке...');
        const info = await getFormattedSortie();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// Baro Ki'Teer - оба варианта написания
bot.command(['baro', 'Baro', 'баро', 'Баро'], async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Проверяю Baro Ki\'Teer...');
        const info = await getFormattedBaro();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка:', error);
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
        console.error('Ошибка:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// Циклы/Время - с параметрами
bot.command(['time', 'цикл', 'циклы', 'время'], async (ctx) => {
    try {
        // Получаем текст после команды
        let location = ctx.message.text.split(' ').slice(1).join(' ').trim();
        
        const loading = await ctx.reply('⏳ Получаю данные о циклах...');
        const info = await getFormattedCycles(location || null);
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// ========================================================================
// ДОПОЛНИТЕЛЬНО: МЕНЮ ЦИКЛОВ С КНОПКАМИ
// ========================================================================

// Команда /time без параметров показывает меню
bot.command(['time_menu', 'цикл_меню'], async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌾 Равнины Эйдолона', 'cycle_cetus')],
        [Markup.button.callback('❄️ Orb Vallis (Фортуна)', 'cycle_vallis')],
        [Markup.button.callback('🦠 Камбионский Дрейф', 'cycle_cambion')],
        [Markup.button.callback('🌍 Земля', 'cycle_earth')],
        [Markup.button.callback('🌐 Все циклы', 'cycle_all')]
    ]);
    
    ctx.reply('🌍 Выберите локацию:', keyboard);
});

// Обработчики для отдельных локаций
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

/**
 * /search <название> - Поиск информации о варфрейме
 * Пример: /search Excalibur
 * В группах: /search@bot_username Excalibur
 */
bot.command('search', async (ctx) => {
    // Получаем текст после команды: "/search Excalibur" → "Excalibur"
    // Также убираем возможное упоминание бота: "/search@bot_username Excalibur" → "Excalibur"
    let query = ctx.message.text.replace(/\/search(@\w+)?/, '').trim();
    
    if (!query) {
        return ctx.reply('Использование: /search <название варфрейма>');
    }

    console.log(`✓ Поиск: '${query}' от ${ctx.from.first_name}`);
    
    // Ищем в локальной базе данных
    const info = await searchLocalDB(query);
    
    if (info) {
        console.log(`✓ Найдено: ${info.title}`);
        await ctx.replyWithMarkdown(formatWarframeInfo(info));
    } else {
        console.log(`✗ Не найдено: '${query}'`);
        await ctx.reply('❌ Ничего не найдено. Попробуй другой запрос.');
    }
});

/**
 * /subscribe - Подписка на автоматические уведомления
 * Добавляет ID чата в множество subscribers
 */
bot.command('subscribe', (ctx) => {
    const chatId = ctx.chat.id;
    if (!subscribers.has(chatId)) { // Проверяем, нет ли уже в списке
        subscribers.add(chatId); // Добавляем в множество
        saveState(); // Сохраняем изменения в файл
        console.log(`✓ Новый подписчик: ${ctx.from.first_name} (ID: ${chatId}), всего: ${subscribers.size}`);
        ctx.reply('✅ Вы подписаны на уведомления о событиях');
    } else {
        console.log(`ℹ️ Попытка повторной подписки: ${ctx.from.first_name} (ID: ${chatId})`);
        ctx.reply('ℹ️ Вы уже подписаны на уведомления.');
    }
});

/**
 * /unsubscribe - Отписка от уведомлений
 */
bot.command('unsubscribe', (ctx) => {
    const chatId = ctx.chat.id;
    if (subscribers.has(chatId)) {
        subscribers.delete(chatId); // Удаляем из множества
        saveState();
        console.log(`✓ Отписался: ${ctx.from.first_name} (ID: ${chatId}), осталось: ${subscribers.size}`);
        ctx.reply('❌ Вы отписаны от уведомлений.');
    } else {
        console.log(`ℹ️ Попытка отписки неподписанного: ${ctx.from.first_name} (ID: ${chatId})`);
        ctx.reply('ℹ️ Вы не подписаны на уведомления.');
    }
});

/**
 * /status [локация] - Показывает текущее состояние циклов
 * Примеры:
 * /status - все локации
 * /status Равнины Эйдолона - только Равнины
 * /status энтрати - только Энтрати
 */
bot.command('status', (ctx) => {
    const location = ctx.message.text.replace('/status', '').trim().toLowerCase();
    
    let message = '';
    const now = new Date(); // Текущее время
    
    if (!location) {
        // Показываем статус ВСЕХ локаций
        message = `🕒 *Текущее время: ${now.toUTCString()}*\n\n` +
                  `${getLocationStatus('Равнины Эйдолона', now)}\n\n` +
                  `${getLocationStatus('Фортуна', now)}\n\n` +
                  `${getLocationStatus('Камбионский Дрейф', now)}\n\n` +
                  `${getSyndicateStatus('Энтрати', now)}\n\n` + // ← НОВАЯ СТРОКА
                  `${getSyndicateStatus('Острон', now)}\n\n` + // ← НОВАЯ СТРОКА
                  `${getSyndicateStatus('Глас Солярис', now)}\n\n` + // ← НОВАЯ СТРОКА
                  `⏰ *Уведомления приходят за:* 10 и 5 минут до смены цикла` +
                  `\n\n📊 *Статистика бота:* ${subscribers.size} подписчиков`;
    } else if (location === 'равнины эйдолона' || location === 'cetus') {
        message = getLocationStatus('Равнины Эйдолона', now);
    } else if (location === 'фортуна' || location === 'fortuna') {
        message = getLocationStatus('Фортуна', now);
    } else if (location === 'камбионский дрейф' || location === 'deimos') {
        message = getLocationStatus('Камбионский Дрейф', now);
    } else if (location === 'энтрати' || location === 'entrati') { // ← НОВЫЙ БЛОК
        message = getSyndicateStatus('Энтрати', now);
    } else if (location === 'острон' || location === 'ostron') { // ← НОВЫЙ БЛОК
        message = getSyndicateStatus('Острон', now);
    } else if (location === 'глас солярис' || location === 'solaris') { // ← НОВЫЙ БЛОК
        message = getSyndicateStatus('Глас Солярис', now);
    } else {
        message = '❌ Использование: /status [Равнины Эйдолона|фортуна|Камбионский Дрейф|энтрати|острон|глас солярис]\n\n' +
                 'Примеры:\n' +
                 '/status - статус всех локаций\n' +
                 '/status Равнины Эйдолона - статус Равнины Эйдолона\n' +
                 '/status энтрати - статус ротаций Энтрати';
    }
    
    ctx.replyWithMarkdown(message);
});

// ===== НОВЫЕ КОМАНДЫ С АКТУАЛЬНЫМИ ДАННЫМИ =====

// Команда: /sortie - Текущая сортировка
bot.command('sortie', async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о сортировке...');
        const info = await getFormattedSortie();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка в /sortie:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

// Команда: /cycles - Циклы день/ночь
bot.command('cycles', async (ctx) => {
    try {
        const loading = await ctx.reply('⏳ Получаю данные о циклах...');
        const info = await getFormattedCycles();
        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
        await ctx.replyWithMarkdown(info);
    } catch (error) {
        console.error('Ошибка в /cycles:', error);
        await ctx.reply('❌ Не удалось получить данные');
    }
});

/**
 * Обработчик текстовых сообщений (без команды)
 * Если пользователь просто пишет "Excalibur" без /search
 * 
 * НОВАЯ ЛОГИКА:
 * - В личных сообщениях (chat.type === 'private') - работает всегда
 * - В группах (chat.type === 'group' или 'supergroup') - только если бота упомянули через @
 * 
 * ВАЖНО: Для работы упоминаний в группах нужно отключить Privacy Mode в @BotFather:
 * 1. @BotFather → /mybots → выбрать бота → Bot Settings → Group Privacy → Turn off
 * 2. Удалить бота из группы и добавить заново
 */
bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return; // Игнорируем команды (они обрабатываются выше)

    // Определяем тип чата
    const chatType = ctx.chat.type; // 'private', 'group', 'supergroup'
    const isPrivateChat = chatType === 'private';
    
    // Логируем для отладки
    console.log(`📨 Сообщение: "${query}" | Тип чата: ${chatType} | От: ${ctx.from.first_name}`);
    
    // В группах проверяем, упомянут ли бот
    if (!isPrivateChat) {
        const botUsername = ctx.botInfo.username; // Получаем username бота
        const isMentioned = query.includes(`@${botUsername}`); // Проверяем упоминание
        
        console.log(`🔍 Бот @${botUsername} упомянут: ${isMentioned}`);
        
        // Если в группе и бота не упомянули - игнорируем сообщение
        if (!isMentioned) {
            console.log(`⏭️ Игнорирую сообщение в группе (нет упоминания)`);
            return;
        }
        
        // Убираем упоминание бота из запроса
        // "@wf_capibaras_bot Excalibur" → "Excalibur"
        const cleanQuery = query.replace(`@${botUsername}`, '').trim();
        
        console.log(`✓ Поиск в группе: '${cleanQuery}' от ${ctx.from.first_name}`);
        
        const info = await searchLocalDB(cleanQuery);
        
        if (info) {
            console.log(`✓ Найдено: ${info.title}`);
            await ctx.replyWithMarkdown(formatWarframeInfo(info));
        } else {
            console.log(`✗ Не найдено: '${cleanQuery}'`);
            await ctx.reply('❌ Не нашёл информацию. Попробуй другой запрос.');
        }
    } else {
        // В личных сообщениях работаем как обычно
        console.log(`✓ Поиск в личке: '${query}' от ${ctx.from.first_name}`);
        
        const info = await searchLocalDB(query);
        
        if (info) {
            console.log(`✓ Найдено: ${info.title}`);
            await ctx.replyWithMarkdown(formatWarframeInfo(info));
        } else {
            console.log(`✗ Не найдено: '${query}'`);
            await ctx.reply('❌ Не нашёл информацию. Попробуй другой запрос.');
        }
    }
});

// ========================================================================
// 5. ФУНКЦИИ ПОИСКА - Работа с базами данных варфреймов
// ========================================================================

/**
 * searchLocalDB(query) - Ищет информацию о варфрейме в локальных JSON-файлах
 * 
 * Алгоритм:
 * 1. Убирает лишние пробелы из запроса
 * 2. Ищет в базе русских псевдонимов (нова → Nova, висп → Wisp)
 * 3. Ищет точное совпадение в базе способностей
 * 4. Если не нашёл - пробует поиск без учёта регистра
 * 5. Получает информацию о способностях и дропе
 * 6. Возвращает объект { title, abilities, dropInfo }
 */
async function searchLocalDB(query) {
    try {
        const normalizedQuery = query.trim(); // Убираем пробелы по краям
        let warframeName = null;
        
        // ШАГ 1: Проверяем русские псевдонимы
        // Например: "нова" → "Nova", "висп" → "Wisp"
        for (const [englishName, aliases] of Object.entries(nameAliasesDB)) {
            if (aliases.some(alias => alias.toLowerCase() === normalizedQuery.toLowerCase())) {
                warframeName = englishName;
                console.log(`🔄 Псевдоним найден: "${normalizedQuery}" → "${englishName}"`);
                break;
            }
        }
        
        // ШАГ 2: Если псевдоним не найден, ищем по английскому названию
        if (!warframeName) {
            const queryNoSpaces = normalizedQuery.replace(/\s+/g, ''); // Убираем все пробелы
            
            // Поиск точного совпадения
            if (abilitiesDB[queryNoSpaces]) {
                warframeName = queryNoSpaces;
            } else {
                // Поиск без учёта регистра
                for (const name of Object.keys(abilitiesDB)) {
                    if (name.toLowerCase() === queryNoSpaces.toLowerCase()) {
                        warframeName = name;
                        break;
                    }
                }
            }
        }
        
        if (!warframeName) {
            console.log(`❌ Варфрейм не найден: "${normalizedQuery}"`);
            return null; // Ничего не найдено
        }

        // Получаем данные из баз
        const abilities = abilitiesDB[warframeName] || ['Информация о способностях не найдена'];
        const dropInfo = dropLocationsDB[warframeName] || {
            "Основной Чертеж": "Информация о получении отсутствует",
            "Нейроптика": "Информация о получении отсутствует", 
            "Каркас": "Информация о получении отсутствует",
            "Системы": "Информация о получении отсутствует"
        };

        return { title: warframeName, abilities: abilities, dropInfo: dropInfo };

    } catch (error) {
        console.error('Ошибка поиска в локальной БД:', error.message);
        return null;
    }
}

// ========================================================================
// 6. СИСТЕМА УВЕДОМЛЕНИЙ - Проверка циклов и отправка сообщений
// ========================================================================

/**
 * sendToSubscribers(message) - Отправляет сообщение всем подписчикам
 * 
 * Процесс:
 * 1. Проходит по всем ID в множестве subscribers
 * 2. Пытается отправить каждому сообщение
 * 3. Если отправка не удалась (пользователь заблокировал бота) - удаляет из подписчиков
 */
function sendToSubscribers(message) {
    console.log(`📢 Отправка уведомления ${subscribers.size} подписчикам: ${message}`);
    subscribers.forEach(chatId => {
        try {
            bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            console.log(`✓ Уведомление отправлено ${chatId}`);
        } catch (error) {
            console.error(`Ошибка отправки уведомления ${chatId}:`, error.message);
            subscribers.delete(chatId); // Удаляем неактивного подписчика
            saveState();
        }
    });
}

/**
 * checkCycles() - ГЛАВНАЯ ФУНКЦИЯ ПРОВЕРКИ
 * Вызывается каждую минуту таймером setInterval
 * 
 * Проверяет все циклы и отправляет уведомления, если нужно
 */
function checkCycles() {
    try {
        const now = new Date(); // Текущее время UTC
        
        // Проверяем циклы день/ночь для открытых миров
        checkSingleCycle('Равнины Эйдолона', now);
        checkSingleCycle('Фортуна', now);
        checkSingleCycle('Камбионский Дрейф', now);
        
        // Проверяем ежедневные сбросы
        checkDailyReset('Вылазка', now);
        checkDailyReset('НочнаяВолна', now);
        
        // ← НОВАЯ ФУНКЦИЯ: Проверяем ротации миссий синдикатов
        checkSyndicateBounties();
        
    } catch (error) {
        console.error('Ошибка проверки циклов:', error.message);
    }
}

/**
 * checkSingleCycle(location, now) - Проверяет один цикл (например, Равнины Эйдолона)
 * 
 * Математика:
 * 1. Получаем текущую минуту в UTC (0-1439)
 * 2. Вычисляем положение в цикле через операцию остатка (%)
 *    Например: 895 минут % 150 минут цикла = 145 минута цикла
 * 3. Определяем текущую Фэзу (день/ночь) и время до смены
 * 4. Если осталось 10 или 5 минут - отправляем уведомление
 */
function checkSingleCycle(location, now) {
    const cycle = cyclesDB[location];
    if (!cycle) return;
    
    const totalMinutes = cycle.cycle_minutes; // Длина полного цикла
    const currentMinute = (now.getUTCHours() * 60 + now.getUTCMinutes()) % totalMinutes; // Текущая позиция в цикле
    
    let timeLeft, phaseName;
    
    // Определяем текущую Фэзу в зависимости от локации
    if (location === 'Равнины Эйдолона') {
        const isDay = currentMinute < cycle.day_duration;
        timeLeft = isDay ? cycle.day_duration - currentMinute : totalMinutes - currentMinute;
        phaseName = isDay ? 'день' : 'ночь';
    } else if (location === 'Фортуна') {
        const isWarm = currentMinute < cycle.warm_duration;
        timeLeft = isWarm ? cycle.warm_duration - currentMinute : totalMinutes - currentMinute;
        phaseName = isWarm ? 'тепло' : 'холод';
    } else if (location === 'Камбионский Дрейф') {
        const isActive = currentMinute < cycle.active_duration;
        timeLeft = isActive ? cycle.active_duration - currentMinute : totalMinutes - currentMinute;
        phaseName = isActive ? 'Воум' : 'Фэз';
    }
    
    // Проверяем, нужно ли отправить уведомление
    if (cycle.notifications.includes(timeLeft)) {
        const eventId = `${location}_${timeLeft}`; // Уникальный ID события
        if (!checkedEvents.has(eventId)) { // Проверяем, не отправляли ли уже
            checkedEvents.add(eventId); // Отмечаем как отправленное
            saveState();
            const message = getCycleMessage(location, phaseName, timeLeft);
            sendToSubscribers(message);
        }
    }
}

/**
 * checkDailyReset(location, now) - Проверяет ежедневные сбросы (Вылазка, Ночная Волна)
 */
function checkDailyReset(location, now) {
    const cycle = cyclesDB[location];
    if (!cycle) return;
    
    const resetTime = cycle.reset_time.split(':'); // "00:00" → ["00", "00"]
    const resetHour = parseInt(resetTime[0]);
    const resetMinute = parseInt(resetTime[1]);
    
    // Если сейчас точное время сброса - отправляем уведомление
    if (now.getUTCHours() === resetHour && now.getUTCMinutes() === resetMinute) {
        const message = `🎯 *${location}*: Новые задания доступны!`;
        sendToSubscribers(message);
    }
}

/**
 * ← НОВАЯ ФУНКЦИЯ: checkSyndicateBounties()
 * Проверяет ротации миссий для всех трёх синдикатов
 * 
 * Логика:
 * 1. Для каждого синдиката вычисляем время до следующей ротации
 * 2. Если осталось 10 или 5 минут - отправляем предупреждение
 * 3. Ротация происходит каждые 150 минут (2.5 часа)
 */
function checkSyndicateBounties() {
    try {
        const now = new Date();
        
        // Проверяем каждый синдикат
        ['Энтрати', 'Острон', 'Глас Солярис'].forEach(syndicate => {
            const data = syndicateBountiesDB[syndicate];
            if (!data) return; // Если данных нет - пропускаем
            
            // Вычисляем время до смены ротации
            const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes(); // Текущая минута UTC (0-1439)
            const cycleMinutes = data.cycle_minutes; // 150 минут
            const minutesInCycle = currentMinutes % cycleMinutes; // Позиция в цикле (0-149)
            const timeLeft = cycleMinutes - minutesInCycle; // Сколько осталось до смены
            
            // Проверяем, нужно ли отправить уведомление (10 или 5 минут)
            if (data.notifications.includes(timeLeft)) {
                const eventId = `${syndicate}_bounty_${timeLeft}`;
                if (!checkedEvents.has(eventId)) {
                    checkedEvents.add(eventId);
                    saveState();
                    
                    const message = `🎯 *${syndicate}*: Смена миссий через ${timeLeft} минут!`;
                    sendToSubscribers(message);
                }
            }
        });
    } catch (error) {
        console.error('Ошибка проверки ротаций синдикатов:', error.message);
    }
}

/**
 * getCycleMessage() - Формирует текст уведомления о смене цикла
 */
function getCycleMessage(location, phaseName, timeLeft) {
    const icons = { 
        'Равнины Эйдолона': '🌅', 
        'Фортуна': '🏔️', 
        'Камбионский Дрейф': '🪐' 
    };
    
    const transitions = {
        'Равнины Эйдолона': { 
            'день': 'ночи', 
            'ночь': 'дня' 
        },
        'Фортуна': { 
            'тепло': 'холода', 
            'холод': 'тепла' 
        },
        'Камбионский Дрейф': { 
            'Фэз': 'Воум', 
            'Воум': 'Фэз' 
        }
    };

    const icon = icons[location];
    const transition = transitions[location] ? transitions[location][phaseName] : 'смены';
    
    return `${icon} *${location}*: ${timeLeft} минут до ${transition}`;
}

/**
 * getCurrentStatus(location) - Получает текущий статус локации или всех локаций
 */
function getCurrentStatus(location) {
    const now = new Date();
    
    if (location === 'all') {
        return `🕒 *Текущее время: ${now.toUTCString()}*\n\n` +
               `${getLocationStatus('Равнины Эйдолона', now)}\n\n` +
               `${getLocationStatus('Фортуна', now)}\n\n` +
               `${getLocationStatus('Камбионский Дрейф', now)}\n\n` +
               `⏰ *Уведомления приходят за:* 10 и 5 минут до смены цикла` +
               `\n\n📊 *Статистика бота:* ${subscribers.size} подписчиков`;
    } else {
        return getLocationStatus(location, now);
    }
}

/**
 * getLocationStatus(location, now) - Получает статус открытого мира
 * 
 * Возвращает:
 * - Текущую Фэзу (день/ночь, тепло/холод, воум/Фэз)
 * - Время до следующей Фэзы
 */
function getLocationStatus(location, now) {
    const cycle = cyclesDB[location];
    if (!cycle) return `❌ ${location}: данные не найдены`;
    
    const totalMinutes = cycle.cycle_minutes;
    const currentMinute = (now.getUTCHours() * 60 + now.getUTCMinutes()) % totalMinutes;
    
    let currentPhase, timeLeft, nextPhase;
    
    if (location === 'Равнины Эйдолона') {
        const isDay = currentMinute < cycle.day_duration;
        currentPhase = isDay ? '🌞 День' : '🌙 Ночь';
        timeLeft = isDay ? cycle.day_duration - currentMinute : totalMinutes - currentMinute;
        nextPhase = isDay ? 'Ночи' : 'Дня';
    } else if (location === 'Фортуна') {
        const isWarm = currentMinute < cycle.warm_duration;
        currentPhase = isWarm ? '☀️ Тепло' : '❄️ Холод';
        timeLeft = isWarm ? cycle.warm_duration - currentMinute : totalMinutes - currentMinute;
        nextPhase = isWarm ? 'Холода' : 'Тепла';
    } else if (location === 'Камбионский Дрейф') {
        const isActive = currentMinute < cycle.active_duration;
        currentPhase = isActive ? '⚡ Фэз' : '💤 Воум';
        timeLeft = isActive ? cycle.active_duration - currentMinute : totalMinutes - currentMinute;
        nextPhase = isActive ? 'Воум' : 'Фэз';
    }
    
    const hours = Math.floor(timeLeft / 60);
    const minutes = timeLeft % 60;
    const timeText = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
    
    return `*${location}*\n` +
           `📊 ${currentPhase}\n` +
           `⏰ До ${nextPhase}: ${timeText}\n` +
           `🔔 Уведомления: 10, 5 минут`;
}

/**
 * ← НОВАЯ ФУНКЦИЯ: getSyndicateStatus(syndicate, now)
 * Получает статус ротации миссий синдиката
 * 
 * Возвращает:
 * - Время до следующей ротации
 * - Информацию об уведомлениях
 */
function getSyndicateStatus(syndicate, now) {
    const data = syndicateBountiesDB[syndicate];
    if (!data) return `❌ ${syndicate}: данные не найдены`;
    
    // Вычисляем время до следующей ротации
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const cycleMinutes = data.cycle_minutes; // 150 минут
    const minutesInCycle = currentMinutes % cycleMinutes; // Позиция в цикле
    const timeLeft = cycleMinutes - minutesInCycle; // Время до смены
    
    // Форматируем время
    const hours = Math.floor(timeLeft / 60);
    const minutes = timeLeft % 60;
    const timeText = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
    
    return `*${syndicate}*\n` +
           `🎯 Ротация миссий\n` +
           `⏰ До смены: ${timeText}\n` +
           `🔔 Уведомления: 10, 5 минут`;
}

// ========================================================================
// 7. ФОРМАТИРОВАНИЕ ИНФОРМАЦИИ - Красивый вывод данных
// ========================================================================

/**
 * formatWarframeInfo(info) - Форматирует информацию о варфрейме для отправки
 * 
 * Принимает объект:
 * {
 *   title: "Excalibur",
 *   abilities: ["Slash Dash", "Radial Blind", "Radial Javelin", "Exalted Blade"],
 *   dropInfo: { "Основной Чертеж": "Маркет", ... }
 * }
 * 
 * Возвращает красиво отформатированную строку с эмодзи
 */
function formatWarframeInfo(info) {
    if (!info) return '❌ Информация не найдена';

    let text = `🤖 *${info.title}*\n\n`;
    
    // Список способностей
    text += `⚡ *Способности:*\n`;
    info.abilities.forEach((ability, index) => {
        text += `${index + 1}. ${ability}\n`;
    });
    text += '\n';

    // Информация о дропе
    text += '🎯 *Где добыть:*\n';
    const componentIcons = {
        'Основной Чертеж': '📜', 
        'Нейроптики': '🔮', 
        'Каркас': '🦾', 
        'Системы': '🫀',
        'Нейрооптика': '👁️‍🗨️', 
        'Каркас': '🔲', 
        'Система': '📘'
    };

    for (const [component, source] of Object.entries(info.dropInfo)) {
        const icon = componentIcons[component] || '🔸';
        text += `${icon} *${component}*: ${source}\n`;
    }

    return text;
}

// ========================================================================
// 8. ЗАПУСК ПРОВЕРОК - Таймеры для автоматической работы
// ========================================================================

/**
 * setInterval() - Встроенная функция JavaScript для повторяющихся действий
 * 
 * Синтаксис: setInterval(функция, интервал_в_миллисекундах)
 * 
 * Пример:
 * setInterval(() => { console.log("Привет!") }, 1000);
 * Будет выводить "Привет!" каждую секунду (1000 мс = 1 сек)
 */

// Таймер 1: Проверка циклов каждую минуту
const interval1 = setInterval(() => {
    checkCycles(); // Вызываем главную функцию проверки
}, 60 * 1000); // 60 секунд × 1000 миллисекунд = 1 минута
checkIntervals.push(interval1); // Сохраняем ID таймера

// Первая проверка через 5 секунд после запуска (чтобы не ждать минуту)
setTimeout(() => {
    checkCycles();
}, 5000);

// Таймер 2: Автосохранение состояния каждые 5 минут
const saveInterval = setInterval(() => {
    saveState(); // Сохраняем подписчиков и проверенные события
}, 5 * 60 * 1000); // 5 минут
checkIntervals.push(saveInterval);

// ========================================================================
// 9. ЗАПУСК БОТА - Подключение к Telegram и обработка завершения
// ========================================================================

console.log('='.repeat(60));
console.log('🤖 WARFRAME BOT');
console.log('='.repeat(60));
console.log('✓ Бот инициализирован');
console.log('✓ Локальные базы данных загружены');
console.log('✓ Система циклов активирована');
console.log('✓ Система ротаций синдикатов активирована'); // ← НОВАЯ СТРОКА
console.log(`✓ Подписчики: ${subscribers.size}`);
console.log('='.repeat(60));
console.log('✓ 🚀 Бот запущен и готов к работе!');
console.log('='.repeat(60));
console.log('Нажмите Ctrl+C для остановки\n');

/**
 * bot.launch() - Запускает бота и подключает к Telegram API
 * После этого бот начинает получать и обрабатывать сообщения
 */
bot.launch().catch(err => {
    console.error('❌ Ошибка запуска:', err);
    process.exit(1); // Останавливаем программу при ошибке
});

/**
 * Graceful shutdown - Корректное завершение работы
 * 
 * SIGINT - сигнал при нажатии Ctrl+C
 * SIGTERM - сигнал от системы (например, при перезагрузке сервера)
 * 
 * process.once() - выполнить функцию ОДИН РАЗ при получении сигнала
 */

// Обработка Ctrl+C
process.once('SIGINT', () => {
    console.log('\n' + '='.repeat(60));
    console.log('✓ ℹ️  Бот остановлен пользователем');
    saveState(); // ВАЖНО: Сохраняем состояние перед выходом!
    checkIntervals.forEach(interval => clearInterval(interval)); // Останавливаем все таймеры
    console.log('✓ Все проверки остановлены');
    console.log('='.repeat(60));
    bot.stop('SIGINT'); // Отключаем бота от Telegram
});

// Обработка системного сигнала завершения
process.once('SIGTERM', () => {
    console.log('\n' + '='.repeat(60));
    console.log('✓ ℹ️  Бот остановлен системой');
    saveState(); // ВАЖНО: Сохраняем состояние перед выходом!
    checkIntervals.forEach(interval => clearInterval(interval)); // Останавливаем все таймеры
    console.log('✓ Все проверки остановлены');
    console.log('='.repeat(60));
    bot.stop('SIGTERM'); // Отключаем бота от Telegram
});

// ========================================================================
// КОНЕЦ ФАЙЛА
// ========================================================================

/**
 * ИТОГОВАЯ СХЕМА РАБОТЫ БОТА:
 * 
 * 1. ЗАПУСК (происходит один раз)
 *    - Загрузка JSON-файлов в память
 *    - Создание объекта бота
 *    - Загрузка сохранённого состояния
 *    - Регистрация команд (/start, /search, /status, ...)
 *    - Запуск таймеров (проверка циклов каждую минуту)
 *    - bot.launch() - подключение к Telegram
 * 
 * 2. РАБОТА (цикл)
 *    А) Обработка команд от пользователей:
 *       Пользователь → /status → bot.command('status') → getCurrentStatus() → ctx.reply()
 *    
 *    Б) Автоматические проверки (каждую минуту):
 *       setInterval → checkCycles() → {
 *         checkSingleCycle('Равнины Эйдолона')
 *         checkSingleCycle('Фортуна')
 *         checkSingleCycle('Камбионский Дрейф')
 *         checkSyndicateBounties() ← НОВОЕ
 *       } → если время пришло → sendToSubscribers()
 *    
 *    В) Автосохранение (каждые 5 минут):
 *       setInterval → saveState() → запись в bot_state.json
 * 
 * 3. ЗАВЕРШЕНИЕ (Ctrl+C или системный сигнал)
 *    - saveState() - сохранение данных
 *    - clearInterval() - остановка таймеров
 *    - bot.stop() - отключение от Telegram
 */