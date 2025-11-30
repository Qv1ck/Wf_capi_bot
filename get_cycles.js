#!/usr/bin/env node

/**
 * Простой парсер циклов с warframestat.us
 * Работает на любом хостинге без curl
 */

const https = require('https');

// Функция получения данных
function getWorldState() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.warframestat.us',
            path: '/pc',
            method: 'GET',
            headers: {
                'User-Agent': 'WarframeBot/1.0'
            }
        };
        
        console.log('📥 Запрос к warframestat.us...\n');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            console.log(`HTTP ${res.statusCode}`);
            
            res.on('data', chunk => data += chunk);
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('Failed to parse JSON: ' + e.message));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

// Форматирование времени
function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) return `${hours}ч ${minutes}м`;
    if (minutes > 0) return `${minutes}м ${seconds}с`;
    return `${seconds}с`;
}

async function main() {
    try {
        const data = await getWorldState();
        
        console.log('\n✅ Данные получены!\n');
        console.log('='.repeat(60));
        
        // Cetus
        if (data.cetusCycle) {
            console.log('\n🌅 ЦЕТУС:');
            console.log(`   Сейчас: ${data.cetusCycle.state === 'day' ? 'ДЕНЬ ☀️' : 'НОЧЬ 🌙'}`);
            console.log(`   Осталось: ${data.cetusCycle.timeLeft || 'н/д'}`);
            if (data.cetusCycle.expiry) {
                const timeLeft = new Date(data.cetusCycle.expiry) - Date.now();
                console.log(`   Смена через: ${formatTime(timeLeft)}`);
            }
        }
        
        // Vallis (Fortuna)
        if (data.vallisCycle) {
            console.log('\n❄️  ФОРТУНА (Vallis):');
            console.log(`   Сейчас: ${data.vallisCycle.state === 'warm' ? 'ТЕПЛО 🌡️' : 'ХОЛОДНО ❄️'}`);
            console.log(`   Осталось: ${data.vallisCycle.timeLeft || 'н/д'}`);
            if (data.vallisCycle.expiry) {
                const timeLeft = new Date(data.vallisCycle.expiry) - Date.now();
                console.log(`   Смена через: ${formatTime(timeLeft)}`);
            }
        }
        
        // Cambion Drift
        if (data.cambionCycle) {
            console.log('\n🦠 КАМБИОН:');
            console.log(`   Сейчас: ${data.cambionCycle.active || data.cambionCycle.state}`);
            console.log(`   Осталось: ${data.cambionCycle.timeLeft || 'н/д'}`);
        }
        
        // Earth
        if (data.earthCycle) {
            console.log('\n🌍 ЗЕМЛЯ:');
            console.log(`   Сейчас: ${data.earthCycle.state === 'day' ? 'ДЕНЬ ☀️' : 'НОЧЬ 🌙'}`);
            console.log(`   Осталось: ${data.earthCycle.timeLeft || 'н/д'}`);
        }
        
        // Zariman
        if (data.zarimanCycle) {
            console.log('\n🚢 ЗАРИМАН:');
            console.log(`   Сейчас: ${data.zarimanCycle.state}`);
            console.log(`   Осталось: ${data.zarimanCycle.timeLeft || 'н/д'}`);
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Сохраняем всё для анализа
        const fs = require('fs');
        fs.writeFileSync('cycles_data.json', JSON.stringify(data, null, 2));
        console.log('\n💾 Все данные сохранены в cycles_data.json');
        
        // Показываем что ещё доступно
        console.log('\n📋 Доступные разделы в API:');
        const sections = {
            'Циклы': Object.keys(data).filter(k => k.includes('Cycle')),
            'Торговцы': Object.keys(data).filter(k => k.includes('void') || k.includes('Void') || k.includes('baro')),
            'События': Object.keys(data).filter(k => k.includes('event') || k.includes('alert') || k.includes('invasion')),
            'Миссии': Object.keys(data).filter(k => k.includes('sortie') || k.includes('arbitration') || k.includes('fissure'))
        };
        
        for (const [category, items] of Object.entries(sections)) {
            if (items.length > 0) {
                console.log(`   ${category}: ${items.join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
    }
}

main();
