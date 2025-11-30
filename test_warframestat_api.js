#!/usr/bin/env node

/**
 * Тест API warframestat.us
 * Проверяем что работает и какие данные возвращает
 */

const https = require('https');

console.log('🔍 Тестируем warframestat.us API\n');

// Функция для запроса
function fetchAPI(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://api.warframestat.us${endpoint}`;
        
        console.log(`📥 Запрос: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            
            res.on('end', () => {
                try {
                    console.log('\n📄 Первые 200 символов ответа:');
                    console.log(data.substring(0, 200));
                    console.log('\n');
                    
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    console.log('\n❌ Не удалось распарсить JSON!');
                    console.log('Полный ответ:');
                    console.log(data);
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function test() {
    try {
        // Получаем полный worldstate
        const worldstate = await fetchAPI('/pc');
        
        console.log('\n✅ API работает!\n');
        
        // Смотрим что есть про циклы
        console.log('📊 ЦИКЛЫ:\n');
        
        if (worldstate.cetusCycle) {
            console.log('🌅 Cetus Cycle:');
            console.log('   State:', worldstate.cetusCycle.state);
            console.log('   Time Left:', worldstate.cetusCycle.timeLeft);
            console.log('   Expiry:', new Date(worldstate.cetusCycle.expiry));
            console.log();
        }
        
        if (worldstate.vallisCycle) {
            console.log('❄️  Vallis Cycle:');
            console.log('   State:', worldstate.vallisCycle.state);
            console.log('   Time Left:', worldstate.vallisCycle.timeLeft);
            console.log('   Expiry:', new Date(worldstate.vallisCycle.expiry));
            console.log();
        }
        
        if (worldstate.cambionCycle) {
            console.log('🦠 Cambion Cycle:');
            console.log('   State:', worldstate.cambionCycle.state);
            console.log('   Time Left:', worldstate.cambionCycle.timeLeft);
            console.log();
        }
        
        if (worldstate.earthCycle) {
            console.log('🌍 Earth Cycle:');
            console.log('   State:', worldstate.earthCycle.state);
            console.log('   Time Left:', worldstate.earthCycle.timeLeft);
            console.log();
        }
        
        // Сохраняем полный ответ для изучения
        const fs = require('fs');
        fs.writeFileSync('worldstate_full.json', JSON.stringify(worldstate, null, 2));
        console.log('💾 Полный ответ сохранён: worldstate_full.json');
        
        // Показываем структуру
        console.log('\n📋 Доступные данные:');
        console.log(Object.keys(worldstate).join(', '));
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
    }
}

test();
