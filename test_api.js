const axios = require('axios');

async function test() {
    try {
        console.log('Пробуем получить данные...');
        const response = await axios.get('https://content.warframe.com/dynamic/worldState.php', {
            timeout: 10000
        });
        
        console.log('✅ Успех! Код ответа:', response.status);
        console.log('Размер данных:', JSON.stringify(response.data).length, 'байт');
        console.log('\nПервые 500 символов:');
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
        
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
    }
}

test();