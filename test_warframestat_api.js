#!/usr/bin/env node

/**
 * Тест API warframestat.us (с поддержкой редиректов)
 */

const https = require('https');
const http = require('http');

console.log('🔍 Тестируем warframestat.us API\n');

// Функция для запроса с поддержкой редиректов
function fetchAPI(endpoint, followRedirects = true) {
    return new Promise((resolve, reject) => {
        const url = `https://api.warframestat.us${endpoint}`;
        
        console.log(`📥 Запрос: ${url}`);
        
        https.get(url, (res) => {
            // Проверяем редирект
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (followRedirects) {
                    console.log(`   🔄 Редирект на: ${res.headers.location}`);
                    
                    // Рекурсивно следуем редиректу
                    const newUrl = res.headers.location.startsWith('http') 
                        ? res.headers.location 
                        : `https://api.warframestat.us${res.headers.location}`;
                    
                    https.get(newUrl, (res2) => {
                        let data = '';
                        res2.on('data', chunk => data += chunk);
                        res2.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                resolve(json);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }).on('error', reject);
                } else {
                    reject(new Error('Redirect not followed'));
                }
                return;
            }
            
            let data = '';
            
            res.on('data', chunk => data += chunk);
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    console.log('\n📄 Ответ (первые 200 символов):');
                    console.log(data.substring(0, 200));
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
            console.log('   Is Day:', worldstate.cetusCycle.isDay);
            console.log();
        }
        
        if (worldstate.vallisCycle) {
            console.log('❄️  Vallis Cycle:');
            console.log('   State:', worldstate.vallisCycle.state);
            console.log('   Time Left:', worldstate.vallisCycle.timeLeft);
            console.log('   Expiry:', new Date(worldstate.vallisCycle.expiry));
            console.log('   Is Warm:', worldstate.vallisCycle.isWarm);
            console.log();
        }
        
        if (worldstate.cambionCycle) {
            console.log('🦠 Cambion Cycle:');
            console.log('   State:', worldstate.cambionCycle.state);
            console.log('   Active:', worldstate.cambionCycle.active);
            console.log('   Time Left:', worldstate.cambionCycle.timeLeft);
            console.log();
        }
        
        if (worldstate.earthCycle) {
            console.log('🌍 Earth Cycle:');
            console.log('   State:', worldstate.earthCycle.state);
            console.log('   Time Left:', worldstate.earthCycle.timeLeft);
            console.log('   Is Day:', worldstate.earthCycle.isDay);
            console.log();
        }
        
        if (worldstate.zarimanCycle) {
            console.log('🚢 Zariman Cycle:');
            console.log('   State:', worldstate.zarimanCycle.state);
            console.log('   Time Left:', worldstate.zarimanCycle.timeLeft);
            console.log();
        }
        
        // Сохраняем полный ответ для изучения
        const fs = require('fs');
        fs.writeFileSync('worldstate_full.json', JSON.stringify(worldstate, null, 2));
        console.log('💾 Полный ответ сохранён: worldstate_full.json');
        
        // Показываем структуру
        console.log('\n📋 Доступные данные:');
        const keys = Object.keys(worldstate);
        console.log(`Всего полей: ${keys.length}`);
        console.log('\nОсновные разделы:');
        console.log('  - Циклы:', keys.filter(k => k.includes('Cycle')).join(', '));
        console.log('  - События:', keys.filter(k => k.includes('event') || k.includes('Event')).join(', '));
        console.log('  - Торговцы:', keys.filter(k => k.includes('void') || k.includes('Void') || k.includes('arbitration')).join(', '));
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
    }
}

test();
