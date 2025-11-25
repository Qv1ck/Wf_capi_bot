const { Telegraf } = require('telegraf');
const XLSX = require('xlsx');
const fs = require('fs');

const token = '7748691142:AAE_bH4h7ChiVLA_zW2G7XaN8z83ltFJPn0';
const bot = new Telegraf(token);

const EXCEL_FILE = 'data.xlsx';

function readExcel() {
    if (!fs.existsSync(EXCEL_FILE)) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([['Имя', 'Телефон', 'Email', 'Адрес']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Данные');
        XLSX.writeFile(wb, EXCEL_FILE);
    }
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

function writeExcel(data) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Данные');
    XLSX.writeFile(wb, EXCEL_FILE);
}

function searchInExcel(query) {
    const data = readExcel();
    const lowerQuery = query.toLowerCase();
    
    return data.filter(row => {
        return Object.values(row).some(value => 
            String(value).toLowerCase().includes(lowerQuery)
        );
    });
}

bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать! Доступные команды:\n' +
        '/add Имя|Телефон|Email|Адрес - добавить запись\n' +
        '/search Текст - найти записи\n' +
        '/list - показать все записи\n' +
        '/delete ID - удалить запись по ID'
    );
});

bot.command('add', (ctx) => {
    const input = ctx.message.text.replace('/add', '').trim();
    const parts = input.split('|').map(p => p.trim());
    
    if (parts.length !== 4) {
        return ctx.reply('❌ Неверный формат! Используйте: /add Имя|Телефон|Email|Адрес');
    }
    
    const data = readExcel();
    data.push({
        'Имя': parts[0],
        'Телефон': parts[1],
        'Email': parts[2],
        'Адрес': parts[3]
    });
    
    writeExcel(data);
    ctx.reply('✅ Запись добавлена!');
});

bot.command('search', (ctx) => {
    const query = ctx.message.text.replace('/search', '').trim();
    
    if (!query) {
        return ctx.reply('❌ Пожалуйста, укажите поисковый запрос после команды /search');
    }
    
    const results = searchInExcel(query);
    
    if (results.length === 0) {
        return ctx.reply('❌ Ничего не найдено. Попробуй другой запрос.');
    }
    
    let message = `✅ Найдено записей: ${results.length}\n\n`;
    
    results.forEach((item, index) => {
        message += `📋 Запись ${index + 1}:\n`;
        message += `Имя: ${item['Имя'] || 'не указано'}\n`;
        message += `Телефон: ${item['Телефон'] || 'не указан'}\n`;
        message += `Email: ${item['Email'] || 'не указан'}\n`;
        message += `Адрес: ${item['Адрес'] || 'не указан'}\n`;
        message += `\n`;
    });
    
    ctx.reply(message);
});

bot.command('list', (ctx) => {
    const data = readExcel();
    
    if (data.length === 0) {
        return ctx.reply('📋 База данных пуста.');
    }
    
    let message = `📋 Всего записей: ${data.length}\n\n`;
    
    data.forEach((item, index) => {
        message += `${index + 1}. ${item['Имя']} - ${item['Телефон']}\n`;
    });
    
    ctx.reply(message);
});

bot.command('delete', (ctx) => {
    const input = ctx.message.text.replace('/delete', '').trim();
    const id = parseInt(input) - 1;
    const data = readExcel();
    
    if (isNaN(id) || id < 0 || id >= data.length) {
        return ctx.reply('❌ Запись с таким ID не найдена.');
    }
    
    data.splice(id, 1);
    writeExcel(data);
    ctx.reply('✅ Запись удалена!');
});

bot.launch()
    .then(() => console.log('Бот запущен...'))
    .catch(err => console.error('Ошибка запуска:', err));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
