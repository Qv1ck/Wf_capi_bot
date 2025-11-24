const axios = require('axios');

const getWarframeWorldState = async () => {
    try {
        const response = await axios.get('https://api.warframe.com/cdn/worldState.php', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        return response.data;
        
    } catch (error) {
        throw new Error(`Ошибка получения данных: ${error.message}`);
    }
};

// Улучшенная функция для времени
const formatTimeLeft = (expiry) => {
    if (!expiry) return 'N/A';
    
    try {
        let expiryTime;
        
        if (expiry.$date && expiry.$date.$numberLong) {
            expiryTime = new Date(parseInt(expiry.$date.$numberLong));
        } else if (expiry.$date) {
            expiryTime = new Date(parseInt(expiry.$date));
        } else if (typeof expiry === 'number') {
            expiryTime = new Date(expiry * 1000);
        } else {
            return 'N/A';
        }
        
        const now = new Date();
        const diffMs = expiryTime - now;
        
        if (diffMs <= 0) return 'Завершено';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}ч ${minutes}м`;
    } catch (e) {
        return 'N/A';
    }
};

// Функция для поиска циклов ВО ВСЕЙ структуре
const findCyclesEverywhere = (worldState) => {
    const cycles = {};
    
    // Ищем циклы в корне объекта
    if (worldState.cetusCycle) cycles.cetus = worldState.cetusCycle;
    if (worldState.earthCycle) cycles.earth = worldState.earthCycle;
    if (worldState.cambionCycle) cycles.cambion = worldState.cambionCycle;
    if (worldState.voidCycle) cycles.void = worldState.voidCycle;
    
    // Ищем циклы в других возможных местах
    Object.keys(worldState).forEach(key => {
        if (key.toLowerCase().includes('cycle') && typeof worldState[key] === 'object') {
            cycles[key] = worldState[key];
        }
    });
    
    return cycles;
};

// Функция для правильного отображения фиссур
const parseFissures = (activeMissions) => {
    if (!activeMissions) return [];
    
    return activeMissions.filter(mission => {
        return mission.modifierTypes && 
               mission.modifierTypes.some(mod => 
                   mod && (mod.includes('FISSURE') || mod.includes('Fissure') || mod.includes('VOID'))
               );
    }).map(fissure => ({
        node: fissure.node || fissure.solnode || 'Unknown',
        missionType: fissure.missionType || 'Unknown',
        enemy: fissure.faction || fissure.enemy || 'Unknown',
        tier: fissure.modifier || fissure.tier || 'Unknown',
        expiry: fissure.Expiry
    }));
};

// Функция для правильного отображения Void Storms
const parseVoidStorms = (voidStorms) => {
    if (!voidStorms) return [];
    
    return voidStorms.map(storm => ({
        node: storm.solnode || storm.node || 'Unknown',
        missionType: storm.missionType || 'Unknown', 
        enemy: storm.faction || storm.enemy || 'Unknown',
        expiry: storm.Expiry,
        isStorm: true
    }));
};

// Основная функция анализа
const analyzeWorldState = (worldState) => {
    console.log('='.repeat(60));
    console.log('🛰️  WARFRAME WORLD STATE - ИСПРАВЛЕННАЯ СВОДКА');
    console.log('='.repeat(60));
    
    // 1. Аларты
    console.log(`\n📢 АЛЕРТЫ: ${worldState.Alerts?.length || 0} активных`);
    if (worldState.Alerts && worldState.Alerts.length > 0) {
        worldState.Alerts.forEach((alert, index) => {
            const mission = alert.MissionInfo;
            console.log(`   ${index + 1}. ${mission.missionType?.replace('MT_', '')} на ${mission.location}`);
            console.log(`      Награда: ${mission.missionReward?.credits || 0} кредитов`);
            if (mission.missionReward?.items?.length > 0) {
                console.log(`      Дополнительно: ${mission.missionReward.items.join(', ')}`);
            }
            console.log(`      Осталось: ${formatTimeLeft(alert.Expiry)}`);
        });
    }
    
    // 2. Вторжения
    console.log(`\n⚔️  ВТОРЖЕНИЯ: ${worldState.Invasions?.length || 0} активных`);
    if (worldState.Invasions) {
        worldState.Invasions.slice(0, 3).forEach((invasion, index) => {
            if (invasion.completed) return;
            
            console.log(`   ${index + 1}. ${invasion.node}`);
            console.log(`      ${invasion.attackerFaction} vs ${invasion.defenderFaction}`);
            const progress = invasion.count !== undefined ? Math.round((invasion.count / invasion.requiredRuns) * 100) : 0;
            console.log(`      Прогресс: ${progress}%`);
        });
        if (worldState.Invasions.length > 3) {
            console.log(`   ... и ещё ${worldState.Invasions.length - 3} вторжений`);
        }
    }
    
    // 3. ЦИКЛЫ - ИЩЕМ ВЕЗДЕ
    console.log(`\n🌍 ЦИКЛЫ ПЛАНЕТ:`);
    const cycles = findCyclesEverywhere(worldState);
    
    if (Object.keys(cycles).length > 0) {
        Object.entries(cycles).forEach(([key, cycle]) => {
            if (cycle.isDay !== undefined) {
                console.log(`   ${key}: ${cycle.isDay ? '☀️ День' : '🌙 Ночь'} (${cycle.timeLeft || 'N/A'})`);
            } else if (cycle.active) {
                console.log(`   ${key}: ${cycle.active === 'vome' ? '🔴 Vome' : '🔵 Fass'} (${cycle.timeLeft || 'N/A'})`);
            } else {
                console.log(`   ${key}: ${JSON.stringify(cycle).substring(0, 50)}...`);
            }
        });
    } else {
        console.log(`   ❌ Циклы не найдены в данных`);
    }
    
    // 4. РАЗРЫВЫ БЕЗДНЫ - ИСПРАВЛЕННЫЕ
    console.log(`\n⚡ РАЗРЫВЫ БЕЗДНЫ:`);
    
    const regularFissures = parseFissures(worldState.ActiveMissions);
    console.log(`   Обычные разрывы: ${regularFissures.length} активных`);
    if (regularFissures.length > 0) {
        regularFissures.slice(0, 3).forEach((fissure, index) => {
            console.log(`   ${index + 1}. ${fissure.missionType} на ${fissure.node}`);
            console.log(`      Эпоха: ${fissure.tier}`);
            console.log(`      Осталось: ${formatTimeLeft(fissure.expiry)}`);
        });
    }
    
    const voidStorms = parseVoidStorms(worldState.VoidStorms);
    console.log(`   🌪️  Эфирные разрывы: ${voidStorms.length} активных`);
    if (voidStorms.length > 0) {
        voidStorms.slice(0, 3).forEach((storm, index) => {
            console.log(`   ${index + 1}. ${storm.missionType} в ${storm.node}`);
            console.log(`      Осталось: ${formatTimeLeft(storm.expiry)}`);
        });
    }
    
    // 5. РОЗЫСК - ИСПРАВЛЕННЫЙ
    console.log(`\n🎭 РОЗЫСК:`);
    if (worldState.Sorties && worldState.Sorties.length > 0) {
        const sortie = worldState.Sorties[0];
        console.log(`   Босс: ${sortie.boss || 'Unknown'}`);
        console.log(`   Фракция: ${sortie.faction || 'Unknown'}`);
        console.log(`   Этапов: ${sortie.variants?.length || 0}`);
        console.log(`   Осталось: ${formatTimeLeft(sortie.Expiry)}`);
        
        if (sortie.variants) {
            sortie.variants.forEach((variant, idx) => {
                console.log(`   Этап ${idx + 1}: ${variant.missionType} - ${variant.modifierType || ''}`);
            });
        }
    } else {
        console.log(`   Не активен`);
    }
    
    // 6. АРБИТРАЖ
    console.log(`\n🎯 АРБИТРАЖ:`);
    const arbitration = worldState.Arbitration || worldState.Arbitrations?.[0];
    if (arbitration) {
        console.log(`   Миссия: ${arbitration.type} на ${arbitration.node}`);
        console.log(`      Фракция: ${arbitration.enemy}`);
        console.log(`      Осталось: ${formatTimeLeft(arbitration.Expiry)}`);
    } else {
        console.log(`   Не активен`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Сводка сгенерирована!');
    console.log('='.repeat(60));
};

// Функция для поиска ВСЕХ ключей связанных с циклами
const findAllCycleKeys = (worldState) => {
    console.log('\n🔍 ПОИСК ВСЕХ КЛЮЧЕЙ С ЦИКЛАМИ:');
    
    const cycleKeys = [];
    
    function searchCycles(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
            const fullPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            // Ищем ключи с "cycle" или названия планет
            if (key.toLowerCase().includes('cycle') || 
                key.toLowerCase().includes('cetus') ||
                key.toLowerCase().includes('earth') || 
                key.toLowerCase().includes('cambion')) {
                cycleKeys.push({
                    path: fullPath,
                    value: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value
                });
            }
            
            // Рекурсивно ищем вложенные объекты
            if (typeof value === 'object' && value !== null) {
                searchCycles(value, fullPath);
            }
        });
    }
    
    searchCycles(worldState);
    
    if (cycleKeys.length > 0) {
        console.log('Найдены ключи циклов:');
        cycleKeys.slice(0, 10).forEach(cycle => {
            console.log(`   ${cycle.path}: ${cycle.value}`);
        });
        if (cycleKeys.length > 10) {
            console.log(`   ... и ещё ${cycleKeys.length - 10} ключей`);
        }
    } else {
        console.log('❌ Ключи циклов не найдены вообще!');
    }
};

// Запуск
(async () => {
    try {
        console.log('🔄 Получаем данные от Warframe API...');
        const worldState = await getWarframeWorldState();
        
        console.log(`✅ Данные получены! Размер: ${JSON.stringify(worldState).length} байт\n`);
        
        // Анализируем и выводим сводку
        analyzeWorldState(worldState);
        
        // Ищем ВСЕ ключи циклов
        findAllCycleKeys(worldState);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
})();