#!/usr/bin/env node

/**
 * Тест ОФИЦИАЛЬНОГО API от Digital Extremes
 * https://content.warframe.com/dynamic/worldState.php
 */

const https = require('https');

async function fetchWorldState() {
    return new Promise((resolve, reject) => {
        const url = 'https://content.warframe.com/dynamic/worldState.php';
        
        console.log('📥 Запрос к ОФИЦИАЛЬНОМУ API Warframe...');
        console.log(`   ${url}\n`);
        
        https.get(url, (res) => {
            let data = '';
            
            console.log(`HTTP ${res.statusCode}`);
            
            res.on('data', chunk => data += chunk);
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('Failed to parse JSON'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Функция для расчёта времени цикла
function calculateCycleTime(startTime, cycleDuration, dayDuration) {
    const now = Date.now() / 1000; // текущее время в секундах
    const timeSinceStart = now - startTime;
    const timeInCycle = timeSinceStart % cycleDuration;
    const isDay = timeInCycle < dayDuration;
    const timeLeft = isDay ? (dayDuration - timeInCycle) : (cycleDuration - timeInCycle);
    
    return {
        isDay,
        timeLeft: Math.floor(timeLeft)
    };
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
}

async function main() {
    try {
        const data = await fetchWorldState();
        
        console.log('\n✅ Данные получены!\n');
        console.log('='.repeat(60));
        
        // Ищем данные о циклах в сыром JSON
        console.log('\n🔍 Структура данных:');
        console.log('   Полей в ответе:', Object.keys(data).length);
        console.log('   Ключи:', Object.keys(data).slice(0, 20).join(', '), '...');
        
        // Cetus (Равнины Эйдолона)
        // Цикл: 100 минут день (6000 сек) + 50 минут ночь (3000 сек) = 150 мин (9000 сек)
        if (data.Time) {
            console.log('\n🌅 ЦЕТУС (расчётный):');
            const cetus = calculateCycleTime(data.Time, 9000, 6000);
            console.log(`   Сейчас: ${cetus.isDay ? 'ДЕНЬ ☀️' : 'НОЧЬ 🌙'}`);
            console.log(`   Смена через: ${formatTime(cetus.timeLeft)}`);
        }
        
        // Vallis (Фортуна)
        // Цикл: 6:40 тепло (400 сек) + 13:20 холод (800 сек) = 20 мин (1200 сек)
        if (data.Time) {
            console.log('\n❄️  ФОРТУНА (расчётный):');
            const vallis = calculateCycleTime(data.Time, 1200, 400);
            console.log(`   Сейчас: ${vallis.isDay ? 'ТЕПЛО 🌡️' : 'ХОЛОДНО ❄️'}`);
            console.log(`   Смена через: ${formatTime(vallis.timeLeft)}`);
        }
        
        // Сохраняем всё
        const fs = require('fs');
        fs.writeFileSync('official_worldstate.json', JSON.stringify(data, null, 2));
        console.log('\n💾 Полные данные сохранены в official_worldstate.json');
        console.log('   Размер:', JSON.stringify(data).length, 'байт');
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ ОФИЦИАЛЬНЫЙ API РАБОТАЕТ!');
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
    }
}

main();
