/**
 * ========================================================================
 * ТЕСТОВЫЙ ФАЙЛ ДЛЯ ПРОВЕРКИ WARFRAME API
 * ========================================================================
 * 
 * Этот файл можно запустить отдельно для проверки работы API
 * без запуска всего бота
 * 
 * Запуск: node test_api.js
 */

const {
    WarframeAPI,
    parseTimeLeft,
    formatCredits,
    getRewardEmoji,
    getFormattedSortie,
    getFormattedBaro,
    getFormattedCycles,
    getFormattedFissures,
    getFormattedInvasions,
    getFormattedNightwave
} = require('./warframe_api');

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

function separator(char = '=', length = 70) {
    console.log(colors.cyan + char.repeat(length) + colors.reset);
}

// ========================================================================
// ТЕСТЫ
// ========================================================================

async function testBasicAPI() {
    log(colors.bright + colors.blue, '\n📡 ТЕСТ 1: Базовое подключение к API');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        log(colors.yellow, '⏳ Получаем данные о сортировке...');
        const sortie = await api.getSortie();
        
        if (sortie) {
            log(colors.green, '✅ API работает!');
            log(colors.bright, `Босс: ${sortie.boss}`);
            log(colors.bright, `Фракция: ${sortie.faction}`);
            
            const timeLeft = parseTimeLeft(sortie.expiry);
            log(colors.bright, `До конца: ${timeLeft.formatted}`);
            
            return true;
        } else {
            log(colors.red, '❌ API не вернул данные');
            return false;
        }
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testAllCycles() {
    log(colors.bright + colors.blue, '\n🌍 ТЕСТ 2: Проверка всех циклов');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        log(colors.yellow, '⏳ Получаем циклы...');
        
        const [cetus, vallis, cambion, earth] = await Promise.all([
            api.getCetusCycle(),
            api.getVallisCycle(),
            api.getCambionCycle(),
            api.getEarthCycle()
        ]);
        
        // Равнины Эйдолона
        if (cetus) {
            const state = cetus.isDay ? '☀️  День' : '🌙 Ночь';
            log(colors.green, `✅ Равнины Эйдолона: ${state}`);
            log(colors.bright, `   До смены: ${cetus.timeLeft}`);
        } else {
            log(colors.red, '❌ Равнины Эйдолона: данные не получены');
        }
        
        // Фортуна
        if (vallis) {
            const state = vallis.isWarm ? '🔥 Тепло' : '❄️  Холод';
            log(colors.green, `✅ Orb Vallis: ${state}`);
            log(colors.bright, `   До смены: ${vallis.timeLeft}`);
        } else {
            log(colors.red, '❌ Orb Vallis: данные не получены');
        }
        
        // Камбионский Дрейф
        if (cambion) {
            log(colors.green, `✅ Cambion Drift: ${cambion.active}`);
            log(colors.bright, `   До смены: ${cambion.timeLeft}`);
        } else {
            log(colors.red, '❌ Cambion Drift: данные не получены');
        }
        
        // Земля
        if (earth) {
            const state = earth.isDay ? '☀️  День' : '🌙 Ночь';
            log(colors.green, `✅ Земля: ${state}`);
            log(colors.bright, `   До смены: ${earth.timeLeft}`);
        } else {
            log(colors.red, '❌ Земля: данные не получены');
        }
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testBaro() {
    log(colors.bright + colors.blue, '\n💎 ТЕСТ 3: Проверка Baro Ki\'Teer');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        log(colors.yellow, '⏳ Проверяем Baro...');
        const baro = await api.getVoidTrader();
        
        if (!baro) {
            log(colors.red, '❌ Данные не получены');
            return false;
        }
        
        if (baro.active) {
            log(colors.green, '✅ Baro Ki\'Teer ПРИСУТСТВУЕТ!');
            log(colors.bright, `📍 Локация: ${baro.location}`);
            
            const timeLeft = parseTimeLeft(baro.expiry);
            log(colors.bright, `⏰ Уходит через: ${timeLeft.formatted}`);
            
            if (baro.inventory && baro.inventory.length > 0) {
                log(colors.bright, `\n🛍️  Товары (первые 3):`);
                baro.inventory.slice(0, 3).forEach((item, i) => {
                    console.log(`   ${i + 1}. ${item.item}`);
                    console.log(`      💰 ${formatCredits(item.credits)} кр + 💎 ${item.ducats} дук`);
                });
                
                if (baro.inventory.length > 3) {
                    log(colors.bright, `   ... и ещё ${baro.inventory.length - 3} товаров`);
                }
            }
        } else {
            log(colors.yellow, '⚠️  Baro Ki\'Teer отсутствует');
            const timeLeft = parseTimeLeft(baro.activation);
            log(colors.bright, `⏰ Прибудет через: ${timeLeft.formatted}`);
        }
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testFissures() {
    log(colors.bright + colors.blue, '\n⚡ ТЕСТ 4: Проверка разломов');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        log(colors.yellow, '⏳ Получаем разломы...');
        const fissures = await api.getFissures();
        
        if (!fissures || fissures.length === 0) {
            log(colors.yellow, '⚠️  Нет активных разломов');
            return true;
        }
        
        log(colors.green, `✅ Найдено ${fissures.length} разломов`);
        log(colors.bright, `\nПервые 3:`);
        
        fissures.slice(0, 3).forEach((fissure, i) => {
            const timeLeft = parseTimeLeft(fissure.expiry);
            console.log(`\n   ${i + 1}. ${fissure.tier} - ${fissure.missionType}`);
            console.log(`      📍 ${fissure.node}`);
            console.log(`      ⏰ ${timeLeft.formatted}`);
            if (fissure.isStorm) console.log(`      ⚠️  Пустотный шторм`);
            if (fissure.isHard) console.log(`      💀 Стальной путь`);
        });
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testInvasions() {
    log(colors.bright + colors.blue, '\n⚔️  ТЕСТ 5: Проверка вторжений');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        log(colors.yellow, '⏳ Получаем вторжения...');
        const invasions = await api.getInvasions();
        
        if (!invasions || invasions.length === 0) {
            log(colors.yellow, '⚠️  Нет активных вторжений');
            return true;
        }
        
        const active = invasions.filter(inv => !inv.completed);
        
        if (active.length === 0) {
            log(colors.yellow, '⚠️  Нет активных вторжений (все завершены)');
            return true;
        }
        
        log(colors.green, `✅ Найдено ${active.length} активных вторжений`);
        log(colors.bright, `\nПервые 2:`);
        
        active.slice(0, 2).forEach((invasion, i) => {
            console.log(`\n   ${i + 1}. ${invasion.node}`);
            console.log(`      ${invasion.attackingFaction} vs ${invasion.defendingFaction}`);
            console.log(`      📊 Прогресс: ${invasion.completion.toFixed(1)}%`);
            
            const attackerReward = invasion.attackerReward?.asString || 'Нет';
            const defenderReward = invasion.defenderReward?.asString || 'Нет';
            
            console.log(`      🔴 Атакующие: ${attackerReward}`);
            console.log(`      🔵 Защитники: ${defenderReward}`);
        });
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testFormattedFunctions() {
    log(colors.bright + colors.blue, '\n📝 ТЕСТ 6: Форматированные функции');
    separator();
    
    try {
        log(colors.yellow, '⏳ Тестируем getFormattedCycles...');
        const cycles = await getFormattedCycles();
        if (cycles) {
            log(colors.green, '✅ getFormattedCycles работает');
        } else {
            log(colors.red, '❌ getFormattedCycles вернула null');
        }
        
        log(colors.yellow, '⏳ Тестируем getFormattedSortie...');
        const sortie = await getFormattedSortie();
        if (sortie) {
            log(colors.green, '✅ getFormattedSortie работает');
        } else {
            log(colors.red, '❌ getFormattedSortie вернула null');
        }
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testHelperFunctions() {
    log(colors.bright + colors.blue, '\n🛠️  ТЕСТ 7: Вспомогательные функции');
    separator();
    
    try {
        // Тест parseTimeLeft
        log(colors.yellow, 'Тестируем parseTimeLeft...');
        const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2 часа
        const time = parseTimeLeft(futureDate);
        
        if (time.hours === 2 && time.formatted.includes('2ч')) {
            log(colors.green, `✅ parseTimeLeft: ${time.formatted}`);
        } else {
            log(colors.red, `❌ parseTimeLeft вернула: ${time.formatted} (ожидалось ~2ч)`);
        }
        
        // Тест formatCredits
        log(colors.yellow, 'Тестируем formatCredits...');
        const formatted = formatCredits(1234567);
        if (formatted === '1 234 567') {
            log(colors.green, `✅ formatCredits: ${formatted}`);
        } else {
            log(colors.red, `❌ formatCredits вернула: ${formatted} (ожидалось "1 234 567")`);
        }
        
        // Тест getRewardEmoji
        log(colors.yellow, 'Тестируем getRewardEmoji...');
        const emoji1 = getRewardEmoji('Кредиты');
        const emoji2 = getRewardEmoji('Энд');
        const emoji3 = getRewardEmoji('Форма');
        
        if (emoji1 === '💰' && emoji2 === '💎' && emoji3 === '🔷') {
            log(colors.green, `✅ getRewardEmoji: ${emoji1} ${emoji2} ${emoji3}`);
        } else {
            log(colors.red, `❌ getRewardEmoji вернула: ${emoji1} ${emoji2} ${emoji3}`);
        }
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

async function testPerformance() {
    log(colors.bright + colors.blue, '\n⚡ ТЕСТ 8: Производительность');
    separator();
    
    const api = new WarframeAPI();
    
    try {
        // Последовательные запросы
        log(colors.yellow, '⏳ Тест последовательных запросов...');
        const start1 = Date.now();
        await api.getSortie();
        await api.getVoidTrader();
        await api.getCetusCycle();
        const time1 = Date.now() - start1;
        log(colors.bright, `   Время: ${time1}ms`);
        
        // Параллельные запросы
        log(colors.yellow, '⏳ Тест параллельных запросов...');
        const start2 = Date.now();
        await Promise.all([
            api.getSortie(),
            api.getVoidTrader(),
            api.getCetusCycle()
        ]);
        const time2 = Date.now() - start2;
        log(colors.bright, `   Время: ${time2}ms`);
        
        const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
        log(colors.green, `✅ Параллельные запросы быстрее на ${improvement}%`);
        
        return true;
    } catch (error) {
        log(colors.red, '❌ Ошибка:', error.message);
        return false;
    }
}

// ========================================================================
// ЗАПУСК ВСЕХ ТЕСТОВ
// ========================================================================

async function runAllTests() {
    console.clear();
    
    log(colors.bright + colors.green, '\n' + '='.repeat(70));
    log(colors.bright + colors.green, '🧪 ЗАПУСК ТЕСТОВ WARFRAME API');
    log(colors.bright + colors.green, '='.repeat(70) + '\n');
    
    const tests = [
        { name: 'Базовое подключение', fn: testBasicAPI },
        { name: 'Циклы', fn: testAllCycles },
        { name: 'Baro Ki\'Teer', fn: testBaro },
        { name: 'Разломы', fn: testFissures },
        { name: 'Вторжения', fn: testInvasions },
        { name: 'Форматированные функции', fn: testFormattedFunctions },
        { name: 'Вспомогательные функции', fn: testHelperFunctions },
        { name: 'Производительность', fn: testPerformance }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }
    
    // Итоги
    separator('=');
    log(colors.bright + colors.green, '\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ\n');
    log(colors.green, `✅ Пройдено: ${passed}`);
    if (failed > 0) {
        log(colors.red, `❌ Провалено: ${failed}`);
    }
    log(colors.bright, `   Всего: ${tests.length}`);
    separator('=');
    
    if (failed === 0) {
        log(colors.bright + colors.green, '\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!\n');
    } else {
        log(colors.bright + colors.yellow, '\n⚠️  ЕСТЬ ОШИБКИ. ПРОВЕРЬТЕ ЛОГИ ВЫШЕ.\n');
    }
}

// Запуск
runAllTests().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
});
