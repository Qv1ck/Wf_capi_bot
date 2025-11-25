const TelegramBot = require('node-telegram-bot-api');
const XLSX = require('xlsx');
const fs = require('fs');

const token = '7748691142:AAE_bH4h7ChiVLA_zW2G7XaN8z83ltFJPn0';
const bot = new TelegramBot(token, { polling: true });

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

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        'Добро пожаловать! Доступные команды:\n' +
        '/add Имя|Телефон|Email|Адрес - добавить запись\n' +
        '/search Текст - найти записи\n' +
        '/list - показать все записи\n' +
        '/delete ID - удалить запись по ID'
    );
});

bot.onText(/\/add (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];
    const parts = input.split('|').map(p => p.trim());
    
    if (parts.length !== 4) {
        bot.sendMessage(chatId, '❌ Неверный формат! Используйте: /add Имя|Телефон|Email|Адрес');
        return;
    }
    
    const data = readExcel();
    data.push({
        'Имя': parts[0],
        'Телефон': parts[1],
        'Email': parts[2],
        'Адрес': parts[3]
    });
    
    writeExcel(data);
    bot.sendMessage(chatId, '✅ Запись добавлена!');
});

bot.onText(/\/search (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim();
    
    if (!query) {
        bot.sendMessage(chatId, '❌ Пожалуйста, укажите поисковый запрос после команды /search');
        return;
    }
    
    const results = searchInExcel(query);
    
    if (results.length === 0) {
        bot.sendMessage(chatId, '❌ Ничего не найдено. Попробуй другой запрос.');
        return;
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
    
    bot.sendMessage(chatId, message);
});

bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const data = readExcel();
    
    if (data.length === 0) {
        bot.sendMessage(chatId, '📋 База данных пуста.');
        return;
    }
    
    let message = `📋 Всего записей: ${data.length}\n\n`;
    
    data.forEach((item, index) => {
        message += `${index + 1}. ${item['Имя']} - ${item['Телефон']}\n`;
    });
    
    bot.sendMessage(chatId, message);
});

bot.onText(/\/delete (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = parseInt(match[1]) - 1;
    const data = readExcel();
    
    if (id < 0 || id >= data.length) {
        bot.sendMessage(chatId, '❌ Запись с таким ID не найдена.');
        return;
    }
    
    data.splice(id, 1);
    writeExcel(data);
    bot.sendMessage(chatId, '✅ Запись удалена!');
});

console.log('Бот запущен...');
