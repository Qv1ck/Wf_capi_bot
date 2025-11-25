// ========================================================================
// ИЗМЕНЕНИЯ ДЛЯ js_bot.js - V3 FINAL UPDATE
// ========================================================================

// =====================
// 1. НОВЫЕ ИМПОРТЫ
// =====================

// ДОБАВИТЬ после строки:
// const weaponsMelee = require('./weapons_melee.json');

const warframesDuviri = require('./warframes_duviri.json');

console.log('✓ Загружено оружия:');
console.log(`  Primary: ${Object.keys(weaponsPrimary).length}`);
console.log(`  Secondary: ${Object.keys(weaponsSecondary).length}`);
console.log(`  Melee: ${Object.keys(weaponsMelee).length}`);
console.log(`✓ Загружено варфреймов Дувири: ${Object.keys(warframesDuviri).length}`);

// =====================
// 2. НОВАЯ ФУНКЦИЯ РАСЧЁТА НЕДЕЛИ ВАРФРЕЙМОВ
// =====================

// ДОБАВИТЬ после функции getCurrentDuviriWeek():

/**
 * Рассчитывает текущую неделю цикла Дувири для варфреймов
 * Цикл: 11 недель, начало - 26 апреля 2023
 */
function getCurrentDuviriWarframeWeek() {
    const startDate = new Date('2023-04-26T00:00:00Z');
    const now = new Date();
    
    const diffTime = now - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    const currentWeek = (diffWeeks % 11) + 1;
    
    return currentWeek;
}

// =====================
// 3. ОБНОВЛЕННАЯ ФУНКЦИЯ formatWeaponInfo
// =====================

// ЗАМЕНИТЬ существующую функцию formatWeaponInfo на:

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
            message += `⏰ *Статус:* Будет доступен на ${weaponWeek}-й неделе (сейчас ${currentWeek}-я из 6-ти)\n`;
        }
        
        // ИЗМЕНЕНИЕ: Показываем оружие ТЕКУЩЕЙ недели
        const currentWeekWeapons = getWeekWeapons(currentWeek);
        message += `\n*Оружие текущей (${currentWeek}-й) недели:*\n`;
        message += currentWeekWeapons.join(', ');
    } else {
        message += `❌ *Инкарнон:* Недоступен`;
    }
    
    return message;
}

// =====================
// 4. ОБНОВЛЕННАЯ ФУНКЦИЯ searchLocalDB
// =====================

// ЗАМЕНИТЬ существующую функцию searchLocalDB на:

async function searchLocalDB(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    const englishName = nameAliasesDB[normalizedQuery];
    const searchName = englishName || normalizedQuery;
    
    for (const [name, abilities] of Object.entries(abilitiesDB)) {
        if (name.toLowerCase().includes(searchName) || 
            abilities.name?.toLowerCase().includes(searchName)) {
            
            // НОВОЕ: Поиск варфрейма в Дувири
            let duviriInfo = null;
            for (const [key, warframe] of Object.entries(warframesDuviri)) {
                if (warframe.name.toLowerCase() === abilities.name.toLowerCase()) {
                    duviriInfo = warframe;
                    break;
                }
            }
            
            return {
                title: abilities.name || name,
                abilities: abilities.abilities,
                dropLocations: dropLocationsDB[name],
                duviri: duviriInfo  // НОВОЕ поле
            };
        }
    }
    
    return null;
}

// =====================
// 5. ОБНОВЛЕННАЯ ФУНКЦИЯ formatWarframeInfo
// =====================

// ЗАМЕНИТЬ существующую функцию formatWarframeInfo на:

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
    
    // НОВОЕ: Информация о Дувири
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

// =====================
// 6. НОВАЯ КОМАНДА /warframes (показать все варфреймы недели)
// =====================

// ДОБАВИТЬ после команды /duviri:

bot.command('warframes', async (ctx) => {
    console.log('🤖 Команда /warframes вызвана');
    
    try {
        const currentWeek = getCurrentDuviriWarframeWeek();
        
        // Собираем варфреймы текущей недели
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

// =====================
// 7. ОБНОВИТЬ setMyCommands
// =====================

// ЗАМЕНИТЬ существующий setMyCommands на:

bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Главное меню' },
    { command: 'time', description: '🌍 Циклы' },
    { command: 'search', description: '🔍 Поиск варфрейма' },
    { command: 'primary', description: '🔫 Основное оружие' },
    { command: 'secondary', description: '🔫 Вторичное оружие' },
    { command: 'melee', description: '⚔️ Ближнее оружие' },
    { command: 'duviri', description: '🌀 Неделя Дувири (оружие)' },
    { command: 'warframes', description: '🤖 Варфреймы Дувири' },  // НОВОЕ
    { command: 'status', description: '📊 Статус' },
    { command: 'subscribe', description: '🔔 Подписаться' }
]).catch(err => console.log('Не удалось зарегистрировать команды:', err));

// =====================
// 8. ДОБАВИТЬ КНОПКУ "Варфреймы" В МЕНЮ
// =====================

// В команде bot.start() ЗАМЕНИТЬ keyboard на:

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
        Markup.button.callback('🤖 Варфреймы', 'cmd_warframes')  // НОВАЯ КНОПКА
    ],
    [
        Markup.button.callback('📊 Статус', 'cmd_status'),
        Markup.button.callback('🔔 Подписки', 'cmd_subscribe')
    ]
]);

// =====================
// 9. ДОБАВИТЬ ОБРАБОТЧИК КНОПКИ cmd_warframes
// =====================

// ДОБАВИТЬ после обработчика cmd_duviri:

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

// =====================
// КОНЕЦ ИЗМЕНЕНИЙ
// =====================