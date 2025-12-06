const Items = require('@wfcd/items');
const fs = require('fs');

const items = new Items();
const allMods = items.filter(i => i.category === 'Mods');

console.log(`Всего модов в WFCD: ${allMods.length}`);

// ============================================
// ДЕДУПЛИКАЦИЯ
// ============================================

const modPriority = {
    'Pressure Point': '/Lotus/Upgrades/Mods/Melee/WeaponMeleeDamageMod',
};

const modsByName = {};
allMods.forEach(mod => {
    if (!mod.name) return;
    if (!modsByName[mod.name]) {
        modsByName[mod.name] = [];
    }
    modsByName[mod.name].push(mod);
});

const mods = [];
for (const [name, versions] of Object.entries(modsByName)) {
    if (versions.length === 1) {
        mods.push(versions[0]);
    } else {
        const priority = modPriority[name];
        if (priority) {
            const correct = versions.find(v => v.uniqueName === priority);
            if (correct) {
                mods.push(correct);
                continue;
            }
        }
        
        const filtered = versions.filter(v => {
            const un = v.uniqueName || '';
            return !un.includes('Beginner') && 
                   !un.includes('OnHeavyKill') &&
                   !un.includes('Flawed');
        });
        
        if (filtered.length > 0) {
            filtered.sort((a, b) => (b.fusionLimit || 0) - (a.fusionLimit || 0));
            mods.push(filtered[0]);
        } else {
            mods.push(versions[0]);
        }
    }
}

console.log(`После дедупликации: ${mods.length} модов`);

// ============================================
// СЛОВАРИ ПЕРЕВОДОВ
// ============================================

const typeTranslations = {
    'Warframe Mod': 'Мод варфрейма',
    'Primary Mod': 'Мод основного оружия',
    'Melee Mod': 'Мод ближнего боя',
    'Secondary Mod': 'Мод вторичного оружия',
    'Companion Mod': 'Мод компаньона',
    'Shotgun Mod': 'Мод дробовика',
    'Plexus Mod': 'Мод плексуса',
    'Stance Mod': 'Мод стойки',
    'Parazon Mod': 'Мод паразона',
    'Arch-Gun Mod': 'Мод арч-пушки',
    'Necramech Mod': 'Мод некрамеха',
    'K-Drive Mod': 'Мод K-драйва',
    'Arch-Melee Mod': 'Мод арч-ближнего боя',
    'Mod Set Mod': 'Сетовый мод',
    'Archwing Mod': 'Мод арчвинга',
    'Railjack Mod': 'Мод рейлджека'
};

const categoryMapping = {
    'Warframe Mod': 'warframe',
    'Primary Mod': 'primary',
    'Melee Mod': 'melee',
    'Secondary Mod': 'secondary',
    'Companion Mod': 'companion',
    'Shotgun Mod': 'shotgun',
    'Stance Mod': 'stance',
    'Parazon Mod': 'parazon',
    'Arch-Gun Mod': 'archgun',
    'Necramech Mod': 'necramech',
    'K-Drive Mod': 'kdrive',
    'Arch-Melee Mod': 'archmelee',
    'Archwing Mod': 'archwing',
    'Railjack Mod': 'railjack',
    'Plexus Mod': 'plexus'
};

const rarityTranslations = {
    'Common': 'Обычный',
    'Uncommon': 'Необычный',
    'Rare': 'Редкий',
    'Legendary': 'Легендарный'
};

const polarityTranslations = {
    'madurai': 'Мадурай',
    'vazarin': 'Вазарин',
    'naramon': 'Нарамон',
    'zenurik': 'Зенурик',
    'unairu': 'Унайру',
    'penjaga': 'Пенджага',
    'umbra': 'Умбра',
    'universal': 'Универсальная'
};

const statTranslations = {
    'Melee Damage': 'Урон ближнего боя',
    'Damage': 'Урон',
    'Critical Chance': 'Шанс крита',
    'Critical Damage': 'Критический урон',
    'Status Chance': 'Шанс статуса',
    'Status Duration': 'Длительность статуса',
    'Multishot': 'Мультивыстрел',
    'Fire Rate': 'Скорострельность',
    'Attack Speed': 'Скорость атаки',
    'Reload Speed': 'Скорость перезарядки',
    'Magazine Capacity': 'Ёмкость магазина',
    'Ammo Maximum': 'Максимум боеприпасов',
    'Punch Through': 'Пробивание',
    'Range': 'Дальность',
    'Combo Duration': 'Длительность комбо',
    'Health': 'Здоровье',
    'Shield Capacity': 'Щит',
    'Shield': 'Щит',
    'Armor': 'Броня',
    'Energy': 'Энергия',
    'Ability Strength': 'Сила способностей',
    'Ability Duration': 'Длительность способностей',
    'Ability Range': 'Радиус способностей',
    'Ability Efficiency': 'Эффективность способностей',
    'Sprint Speed': 'Скорость бега',
    'Heat': 'Огонь',
    'Cold': 'Холод',
    'Electricity': 'Электричество',
    'Toxin': 'Яд',
    'Blast': 'Взрыв',
    'Radiation': 'Радиация',
    'Gas': 'Газ',
    'Viral': 'Вирус',
    'Magnetic': 'Магнит',
    'Corrosive': 'Коррозия',
    'Impact': 'Удар',
    'Puncture': 'Прокол',
    'Slash': 'Порез',
    'Void': 'Бездна'
};

const locationTranslations = {
    'Earth': 'Земля', 'Mars': 'Марс', 'Venus': 'Венера', 'Mercury': 'Меркурий',
    'Jupiter': 'Юпитер', 'Saturn': 'Сатурн', 'Uranus': 'Уран', 'Neptune': 'Нептун',
    'Pluto': 'Плутон', 'Ceres': 'Церера', 'Eris': 'Эрис', 'Europa': 'Европа',
    'Phobos': 'Фобос', 'Sedna': 'Седна', 'Lua': 'Луа', 'Void': 'Бездна',
    'Deimos': 'Деймос', 'Kuva Fortress': 'Крепость Кувы', 'Zariman': 'Зариман'
};

const missionTranslations = {
    'Defense': 'Оборона', 'Survival': 'Выживание', 'Capture': 'Захват',
    'Exterminate': 'Зачистка', 'Spy': 'Шпионаж', 'Sabotage': 'Саботаж',
    'Rescue': 'Спасение', 'Mobile Defense': 'Мобильная оборона',
    'Interception': 'Перехват', 'Excavation': 'Раскопки',
    'Assassination': 'Ликвидация', 'Rotation': 'Ротация'
};

// ============================================
// БОЛЬШОЙ СЛОВАРЬ ПЕРЕВОДОВ МОДОВ
// ============================================

const modNameTranslations = {
    // === БАЗОВЫЕ МОДЫ ОРУЖИЯ ===
    'Serration': 'Зазубрины',
    'Pressure Point': 'Болевая точка',
    'Hornet Strike': 'Укус Шершня',
    'Point Blank': 'В упор',
    'Primed Pressure Point': 'Болевая точка Прайм',
    
    // === МОДЫ ВАРФРЕЙМА (базовые) ===
    'Vitality': 'Живучесть',
    'Redirection': 'Перенаправление',
    'Steel Fiber': 'Стальное волокно',
    'Streamline': 'Рационализация',
    'Intensify': 'Усиление',
    'Continuity': 'Непрерывность',
    'Stretch': 'Растяжение',
    'Flow': 'Поток',
    'Fleeting Expertise': 'Мимолётный опыт',
    'Transient Fortitude': 'Быстротечная стойкость',
    'Blind Rage': 'Слепая ярость',
    'Narrow Minded': 'Узколобость',
    'Overextended': 'Перенапряжение',
    'Primed Continuity': 'Непрерывность Прайм',
    'Primed Flow': 'Поток Прайм',
    'Umbral Vitality': 'Умбральная живучесть',
    'Umbral Fiber': 'Умбральное волокно',
    'Umbral Intensify': 'Умбральное усиление',
    'Adaptation': 'Адаптация',
    'Rolling Guard': 'Защитный Перекат',
    'Natural Talent': 'Природный талант',
    'Constitution': 'Крепость духа',
    'Rage': 'Ярость',
    'Hunter Adrenaline': 'Адреналин Охотника',
    'Quick Thinking': 'Быстрое мышление',
    'Equilibrium': 'Равновесие',
    'Primed Sure Footed': 'Устойчивость Прайм',
    'Sure Footed': 'Устойчивость',
    'Handspring': 'Кувырок',
    
    // === МОДЫ КРИТА ===
    'Point Strike': 'Точный удар',
    'Vital Sense': 'Жизненное чутьё',
    'True Steel': 'Истинная сталь',
    'Organ Shatter': 'Разрушитель органов',
    'Blood Rush': 'Приток Крови',
    'Weeping Wounds': 'Стенающие Раны',
    'Pistol Gambit': 'Пистолетная авантюра',
    'Target Cracker': 'Разрушитель целей',
    'Blunderbuss': 'Мушкетон',
    'Ravage': 'Разорение',
    
    // === МОДЫ СКОРОСТИ ===
    'Fury': 'Ярость',
    'Primed Fury': 'Ярость Прайм',
    'Berserker': 'Берсерк',
    'Berserker Fury': 'Ярость Берсерка',
    'Quickening': 'Ускорение',
    'Speed Trigger': 'Лёгкий спуск',
    'Gunslinger': 'Стрелок',
    'Lethal Torrent': 'Смертельный поток',
    'Barrel Diffusion': 'Рассеивание ствола',
    'Split Chamber': 'Разделённая камера',
    "Hell's Chamber": 'Адская камора',
    
    // === ЭЛЕМЕНТАЛЬНЫЕ МОДЫ ===
    'Stormbringer': 'Вестник бури',
    'Hellfire': 'Адское пламя',
    'Cryo Rounds': 'Криопатроны',
    'Infected Clip': 'Заражённая обойма',
    'Fever Strike': 'Лихорадочный удар',
    'Molten Impact': 'Расплавленный удар',
    'North Wind': 'Северный ветер',
    'Shocking Touch': 'Шокирующее касание',
    'Convulsion': 'Конвульсия',
    'Pathogen Rounds': 'Патогенные патроны',
    'Deep Freeze': 'Глубокая заморозка',
    'Heated Charge': 'Тепловой заряд',
    
    // === 60/60 МОДЫ ===
    'High Voltage': 'Высокое напряжение',
    'Malignant Force': 'Злокачественная сила',
    'Rime Rounds': 'Инеистые патроны',
    'Thermite Rounds': 'Термитные патроны',
    'Voltaic Strike': 'Вольтовый удар',
    'Virulent Scourge': 'Вирулентная чума',
    'Vicious Frost': 'Лютый мороз',
    'Volcanic Edge': 'Вулканическое лезвие',
    
    // === МОДЫ ДАЛЬНОСТИ ===
    'Reach': 'Досягаемость',
    'Primed Reach': 'Досягаемость Прайм',
    'Condition Overload': 'Избыточное Состояние',
    
    // === НЕКРАМЕХ МОДЫ ===
    'Necramech Pressure Point': 'Болевая Точка Некрамеха',
    'Necramech Fury': 'Ярость Некрамеха',
    'Necramech Reach': 'Досягаемость Некрамеха',
    'Necramech Vitality': 'Живучесть Некрамеха',
    'Necramech Steel Fiber': 'Стальное Волокно Некрамеха',
    'Necramech Intensify': 'Усиление Некрамеха',
    'Necramech Streamline': 'Рационализация Некрамеха',
    'Necramech Flow': 'Поток Некрамеха',
    'Necramech Stretch': 'Растяжение Некрамеха',
    'Necramech Redirection': 'Перенаправление Некрамеха',
    'Necramech Deflection': 'Отражение Некрамеха',
    
    // === СЕТОВЫЕ МОДЫ ===
    'Augur Message': 'Послание Предвестника',
    'Augur Reach': 'Досягаемость Предвестника',
    'Augur Secrets': 'Секреты Предвестника',
    'Augur Accord': 'Согласие Предвестника',
    'Augur Pact': 'Пакт Предвестника',
    'Augur Seeker': 'Искатель Предвестника',
    'Gladiator Might': 'Мощь Гладиатора',
    'Gladiator Rush': 'Рывок Гладиатора',
    'Gladiator Vice': 'Порок Гладиатора',
    'Gladiator Finesse': 'Изящество Гладиатора',
    'Gladiator Resolve': 'Решимость Гладиатора',
    'Gladiator Aegis': 'Эгида Гладиатора',
    'Hunter Munitions': 'Боеприпасы Охотника',
    'Hunter Track': 'След Охотника',
    'Hunter Recovery': 'Восстановление Охотника',
    'Hunter Synergy': 'Синергия Охотника',
    'Hunter Command': 'Команда Охотника',
    'Vigilante Armaments': 'Вооружение Стража',
    'Vigilante Fervor': 'Пыл Стража',
    'Vigilante Offense': 'Атака Стража',
    'Vigilante Supplies': 'Припасы Стража',
    'Vigilante Pursuit': 'Преследование Стража',
    
    // === АУГМЕНТЫ ASH ===
    'Seeking Shuriken': 'Ищущий Сюрикен',
    'Smoke Shadow': 'Тень Дыма',
    'Fatal Teleport': 'Смертельная Телепортация',
    'Rising Storm': 'Восходящий Шторм',
    
    // === АУГМЕНТЫ ATLAS ===
    'Path of Statues': 'Путь Статуй',
    'Tectonics Burst': 'Тектонический Взрыв',
    'Titanic Rumbler': 'Титанический Громовержец',
    'Ore Gaze': 'Рудный Взгляд',
    'Rubble Heap': 'Груда Камней',
    
    // === АУГМЕНТЫ BANSHEE ===
    'Sonic Fracture': 'Звуковая Трещина',
    'Resonance': 'Резонанс',
    'Savage Silence': 'Дикая Тишина',
    'Resonating Quake': 'Резонирующее Землетрясение',
    
    // === АУГМЕНТЫ BARUUK ===
    'Endless Lullaby': 'Бесконечная Колыбельная',
    'Serene Storm': 'Безмятежный Шторм',
    'Reactive Storm': 'Реактивный Шторм',
    
    // === АУГМЕНТЫ CHROMA ===
    'Afterburn': 'Дожигание',
    'Everlasting Ward': 'Вечный Страж',
    'Vexing Retaliation': 'Досадное Возмездие',
    'Guided Effigy': 'Направляемое Изваяние',
    
    // === АУГМЕНТЫ EMBER ===
    'Fireball Frenzy': 'Огненное Безумие',
    'Immolated Radiance': 'Сияние Самосожжения',
    'Healing Flame': 'Целебное Пламя',
    'Exothermic': 'Экзотермика',
    
    // === АУГМЕНТЫ EQUINOX ===
    'Duality': 'Двойственность',
    'Calm & Frenzy': 'Спокойствие и Безумие',
    'Energy Transfer': 'Передача Энергии',
    'Peaceful Provocation': 'Мирная Провокация',
    
    // === АУГМЕНТЫ EXCALIBUR ===
    'Surging Dash': 'Волновой Рывок',
    'Radiant Finish': 'Сияющий Финал',
    'Furious Javelin': 'Яростное Копьё',
    'Chromatic Blade': 'Хроматический Клинок',
    
    // === АУГМЕНТЫ FROST ===
    'Freeze Force': 'Ледяная Сила',
    'Ice Wave Impedance': 'Преграда Ледяной Волны',
    'Chilling Globe': 'Морозящий Купол',
    'Icy Avalanche': 'Ледяная Лавина',
    'Biting Frost': 'Кусающий Мороз',
    
    // === АУГМЕНТЫ GARA ===
    'Mending Splinters': 'Лечащие Осколки',
    'Spectrosiphon': 'Спектросифон',
    
    // === АУГМЕНТЫ GARUDA ===
    'Dread Ward': 'Оберег Страха',
    'Blood Forge': 'Кровавая Ковка',
    'Blending Talons': 'Смешивающие Когти',
    
    // === АУГМЕНТЫ GAUSS ===
    'Mach Crash': 'Маховый Удар',
    
    // === АУГМЕНТЫ GRENDEL ===
    'Gourmand': 'Гурман',
    'Hearty Nourishment': 'Сытное Питание',
    'Catapult': 'Катапульта',
    
    // === АУГМЕНТЫ GYRE ===
    'Cathode Current': 'Катодный Ток',
    
    // === АУГМЕНТЫ HARROW ===
    'Tribunal': 'Трибунал',
    'Lasting Covenant': 'Нерушимый Завет',
    'Warding Thurible': 'Оберегающее Кадило',
    
    // === АУГМЕНТЫ HILDRYN ===
    'Balefire Surge': 'Волна Злого Огня',
    'Blazing Pillage': 'Пылающее Разграбление',
    'Aegis Gale': 'Буря Эгиды',
    
    // === АУГМЕНТЫ HYDROID ===
    'Corroding Barrage': 'Коррозийный Шквал',
    'Tidal Impunity': 'Приливная Безнаказанность',
    'Curative Undertow': 'Лечебное Течение',
    'Pilfering Swarm': 'Грабящий Рой',
    
    // === АУГМЕНТЫ INAROS ===
    "Desiccation's Curse": 'Проклятие Иссушения',
    'Elemental Sandstorm': 'Стихийная Буря',
    'Negation Armor': 'Доспех Отрицания',
    
    // === АУГМЕНТЫ IVARA ===
    'Empowered Quiver': 'Усиленный Колчан',
    'Infiltrate': 'Проникновение',
    'Piercing Navigator': 'Пробивающий Штурман',
    'Concentrated Arrow': 'Концентрированная Стрела',
    
    // === АУГМЕНТЫ KHORA ===
    'Accumulating Whipclaw': 'Накапливающий Когтехлыст',
    'Venari Bodyguard': 'Венари Телохранитель',
    'Pilfering Strangledome': 'Грабящий Купол',
    
    // === АУГМЕНТЫ LAVOS ===
    'Chem Lab': 'Химлаборатория',
    'Swift Bite': 'Быстрый Укус',
    
    // === АУГМЕНТЫ LIMBO ===
    'Rift Haven': 'Убежище Разлома',
    'Rift Torrent': 'Поток Разлома',
    'Cataclysmic Continuum': 'Катастрофический Континуум',
    
    // === АУГМЕНТЫ LOKI ===
    'Savior Decoy': 'Спасительная Обманка',
    'Hushed Invisibility': 'Тихая Невидимость',
    'Safeguard Switch': 'Защитное Переключение',
    'Irradiating Disarm': 'Облучающее Разоружение',
    
    // === АУГМЕНТЫ MAG ===
    'Greedy Pull': 'Жадное Притяжение',
    'Magnetized Discharge': 'Магнитный Разряд',
    'Counter Pulse': 'Контрпульс',
    'Fracturing Crush': 'Сокрушительное Раздавливание',
    
    // === АУГМЕНТЫ MESA ===
    'Ballistic Bullseye': 'Баллистическое Яблочко',
    'Staggering Shield': 'Потрясающий Щит',
    'Muzzle Flash': 'Вспышка Дула',
    "Mesa's Waltz": 'Вальс Мисы',
    
    // === АУГМЕНТЫ MIRAGE ===
    'Hall Of Malevolence': 'Зал Злобы',
    'Explosive Legerdemain': 'Взрывная Ловкость',
    'Total Eclipse': 'Полное Затмение',
    'Prism Guard': 'Призменная Защита',
    
    // === АУГМЕНТЫ NEKROS ===
    'Soul Survivor': 'Выживший Дух',
    'Creeping Terrify': 'Ползущий Ужас',
    'Despoil': 'Осквернение',
    'Shield of Shadows': 'Щит Теней',
    
    // === АУГМЕНТЫ NEZHA ===
    'Pyroclastic Flow': 'Пирокластический Поток',
    'Reaping Chakram': 'Жнущий Чакрам',
    'Safeguard': 'Охрана',
    'Divine Retribution': 'Божественное Возмездие',
    
    // === АУГМЕНТЫ NIDUS ===
    'Abundant Mutation': 'Обильная Мутация',
    'Larva Burst': 'Взрыв Личинки',
    'Insatiable': 'Ненасытный',
    'Teeming Virulence': 'Кишащая Вирулентность',
    
    // === АУГМЕНТЫ NOVA ===
    'Neutron Star': 'Нейтронная Звезда',
    'Antimatter Absorb': 'Поглощение Антиматерии',
    'Escape Velocity': 'Скорость Убегания',
    'Molecular Fission': 'Молекулярное Деление',
    
    // === АУГМЕНТЫ NYX ===
    'Mind Freak': 'Безумие Разума',
    'Pacifying Bolts': 'Умиротворяющие Снаряды',
    'Chaos Sphere': 'Сфера Хаоса',
    'Assimilate': 'Ассимиляция',
    'Singularity': 'Сингулярность',
    
    // === АУГМЕНТЫ OBERON ===
    'Smite Infusion': 'Вливание Кары',
    'Hallowed Eruption': 'Священное Извержение',
    'Phoenix Renewal': 'Возрождение Феникса',
    'Hallowed Reckoning': 'Священное Возмездие',
    
    // === АУГМЕНТЫ OCTAVIA ===
    'Partitioned Mallet': 'Разделённый Молот',
    'Conductor': 'Дирижёр',
    
    // === АУГМЕНТЫ PROTEA ===
    'Repair Dispensary': 'Ремонтный Раздатчик',
    'Temporal Erosion': 'Временная Эрозия',
    
    // === АУГМЕНТЫ REVENANT ===
    'Blinding Reave': 'Ослепляющий Уход',
    'Mesmer Shield': 'Щит Месмера',
    'Thrall Pact': 'Пакт Раба',
    
    // === АУГМЕНТЫ RHINO ===
    'Ironclad Charge': 'Бронированный Натиск',
    'Iron Shrapnel': 'Железная Шрапнель',
    'Piercing Roar': 'Пронзающий Рёв',
    'Reinforcing Stomp': 'Укрепляющий Топот',
    
    // === АУГМЕНТЫ SARYN ===
    'Venom Dose': 'Доза Яда',
    'Regenerative Molt': 'Регенеративная Линька',
    'Contagion Cloud': 'Облако Заразы',
    'Revealing Spores': 'Разоблачающие Споры',
    
    // === АУГМЕНТЫ SEVAGOTH ===
    'Shadow Haze': 'Теневая Дымка',
    
    // === АУГМЕНТЫ STYANAX ===
    'Intrepid Stand': 'Бесстрашная Стойка',
    'Axios Javelineers': 'Метатели Копий Аксиоса',
    
    // === АУГМЕНТЫ TITANIA ===
    'Spellbound Harvest': 'Заколдованный Урожай',
    'Beguiling Lantern': 'Пленяющий Фонарь',
    'Razorwing Blitz': 'Блиц Бритвокрыла',
    
    // === АУГМЕНТЫ TRINITY ===
    'Pool of Life': 'Источник Жизни',
    'Vampire Leech': 'Пиявка Вампира',
    'Abating Link': 'Ослабляющая Связь',
    "Champion's Blessing": 'Благословение Чемпиона',
    
    // === АУГМЕНТЫ VALKYR ===
    'Swing Line': 'Линия Размаха',
    'Eternal War': 'Вечная Война',
    'Enraged': 'Разъярённая',
    'Hysterical Assault': 'Истерический Штурм',
    
    // === АУГМЕНТЫ VAUBAN ===
    'Tesla Bank': 'Банк Теслы',
    'Photon Repeater': 'Фотонный Репитер',
    'Repelling Bastille': 'Отталкивающая Бастилия',
    
    // === АУГМЕНТЫ VOLT ===
    'Shock Trooper': 'Ударный Боец',
    'Shocking Speed': 'Шокирующая Скорость',
    'Transistor Shield': 'Транзисторный Щит',
    'Capacitance': 'Ёмкость',
    
    // === АУГМЕНТЫ WISP ===
    'Fused Reservoir': 'Слитый Резервуар',
    'Critical Surge': 'Критическая Волна',
    
    // === АУГМЕНТЫ WUKONG ===
    'Celestial Stomp': 'Небесный Топот',
    'Enveloping Cloud': 'Обволакивающее Облако',
    'Primal Rage': 'Первобытная Ярость',
    'Iron Jab': 'Железный Тычок',
    
    // === АУГМЕНТЫ YARELI ===
    'Loyal Merulina': 'Верная Мерулина',
    'Merulina Guardian': 'Страж Мерулины',
    
    // === АУГМЕНТЫ ZEPHYR ===
    'Target Fixation': 'Фиксация Цели',
    'Airburst Rounds': 'Воздушные Снаряды',
    'Jet Stream': 'Реактивный Поток',
    'Funnel Clouds': 'Воронки',
    
    // === МОДЫ ХЁЛЬВАНИИ ===
    "Amar's Anguish": 'Страдание Амара',
    "Amar's Contempt": 'Презрение Амара',
    "Amar's Hatred": 'Ненависть Амара',
    "Vauban's Bastion": 'Бастион Вобана',
    
    // === ДРИФТ МОДЫ ===
    'Power Drift': 'Дрифт Силы',
    'Speed Drift': 'Дрифт Скорости',
    'Cunning Drift': 'Дрифт Хитрости',
    'Coaction Drift': 'Дрифт Взаимодействия',
    'Endurance Drift': 'Дрифт Выносливости',
    'Stealth Drift': 'Дрифт Скрытности',
    'Agility Drift': 'Дрифт Ловкости',
    
    // === ПРОЧИЕ ПОПУЛЯРНЫЕ МОДЫ ===
    'Enemy Sense': 'Чувство Врага',
    "Thief's Wit": 'Смекалка Вора',
    'Animal Instinct': 'Животный Инстинкт',
    'Primed Animal Instinct': 'Животный Инстинкт Прайм',
    'Vacuum': 'Вакуум',
    'Fetch': 'Подбор',
    'Mobilize': 'Мобилизация',
    'Rush': 'Рывок',
    'Marathon': 'Марафон',
    'Armored Agility': 'Бронированная Ловкость',
    'Aviator': 'Авиатор',
    'Dispatch Overdrive': 'Экстренный Разгон',
    
    // === ТЕХ МОДЫ (Tek) ===
    'Tek Assault': 'Тех-Штурм',
    'Tek Collateral': 'Тех-Сопутствие',
    'Tek Enhance': 'Тех-Усиление',
    'Tek Gravity': 'Тех-Гравитация',
    
    // === СИНТ МОДЫ (Synth) ===
    'Synth Charge': 'Синт-Заряд',
    'Synth Deconstruct': 'Синт-Деконструкция',
    'Synth Fiber': 'Синт-Волокно',
    'Synth Reflex': 'Синт-Рефлекс',
    
    // === МЕХА МОДЫ (Mecha) ===
    'Mecha Empowered': 'Меха-Усиление',
    'Mecha Overdrive': 'Меха-Форсаж',
    'Mecha Pulse': 'Меха-Импульс',
    'Mecha Recharge': 'Меха-Перезарядка',
    
    // === ШТАММ МОДЫ (Strain) ===
    'Strain Consume': 'Штамм-Поглощение',
    'Strain Eruption': 'Штамм-Извержение',
    'Strain Fever': 'Штамм-Лихорадка',
    'Strain Infection': 'Штамм-Заражение',
    
    // === АЭРО МОДЫ (Aero) ===
    'Aero Periphery': 'Аэро-Периферия',
    'Aero Vantage': 'Аэро-Преимущество',
    'Aero Agility': 'Аэро-Ловкость',
    
    // === МОТУС МОДЫ (Motus) ===
    'Motus Signal': 'Мотус-Сигнал',
    'Motus Impact': 'Мотус-Удар',
    'Motus Setup': 'Мотус-Подготовка',
    
    // === ПРОТОН МОДЫ (Proton) ===
    'Proton Pulse': 'Протон-Импульс',
    'Proton Jet': 'Протон-Струя',
    'Proton Snap': 'Протон-Щелчок',
    
    // === КАРНИС МОДЫ (Carnis) - Деймос ===
    'Carnis Carapace': 'Карнис-Панцирь',
    'Carnis Mandible': 'Карнис-Жвалы',
    'Carnis Stinger': 'Карнис-Жало',
    
    // === ЮГУЛУС МОДЫ (Jugulus) - Деймос ===
    'Jugulus Barbs': 'Югулус-Шипы',
    'Jugulus Carapace': 'Югулус-Панцирь',
    'Jugulus Spines': 'Югулус-Иглы',
    
    // === САКСУМ МОДЫ (Saxum) - Деймос ===
    'Saxum Carapace': 'Саксум-Панцирь',
    'Saxum Spittle': 'Саксум-Плевок',
    'Saxum Thorax': 'Саксум-Торакс',
    
    // === МОДЫ ХЁЛЬВАНИИ (Амара, Бореала, Ниры) ===
    "Amar's Anguish": 'Страдание Амара',
    "Amar's Contempt": 'Презрение Амара',
    "Amar's Hatred": 'Ненависть Амара',
    "Boreal's Anguish": 'Страдание Бореала',
    "Boreal's Contempt": 'Презрение Бореала',
    "Boreal's Hatred": 'Ненависть Бореала',
    "Nira's Anguish": 'Страдание Ниры',
    "Nira's Contempt": 'Презрение Ниры',
    "Nira's Hatred": 'Ненависть Ниры',
    
    // === ГАЛЬВАНИЗИРОВАННЫЕ МОДЫ (Galvanized) - Арбитраж ===
    'Galvanized Acceleration': 'Гальванизированное Ускорение',
    'Galvanized Aptitude': 'Гальванизированная Склонность',
    'Galvanized Chamber': 'Гальванизированная Камера',
    'Galvanized Crosshairs': 'Гальванизированный Прицел',
    'Galvanized Diffusion': 'Гальванизированная Диффузия',
    'Galvanized Elementalist': 'Гальванизированный Стихийник',
    'Galvanized Hell': 'Гальванизированный Ад',
    'Galvanized Reflex': 'Гальванизированный Рефлекс',
    'Galvanized Savvy': 'Гальванизированная Смекалка',
    'Galvanized Scope': 'Гальванизированный Оптический Прицел',
    'Galvanized Shot': 'Гальванизированный Выстрел',
    'Galvanized Steel': 'Гальванизированная Сталь',
    
    // === АРХОНТ МОДЫ (Archon) ===
    'Archon Continuity': 'Непрерывность Архонта',
    'Archon Flow': 'Поток Архонта',
    'Archon Intensify': 'Усиление Архонта',
    'Archon Stretch': 'Растяжение Архонта',
    'Archon Vitality': 'Живучесть Архонта',
    
    // === АМАЛЬГАМА МОДЫ (Amalgam) ===
    'Amalgam Barrel Diffusion': 'Амальгама Рассеивание Ствола',
    'Amalgam Serration': 'Амальгама Зазубрины',
    'Amalgam Organ Shatter': 'Амальгама Разрушитель Органов',
    
    // === ЖЕРТВЕННЫЕ МОДЫ (Sacrificial) ===
    'Sacrificial Steel': 'Жертвенная Сталь',
    'Sacrificial Pressure': 'Жертвенное Давление',
    
    // === СТОЙКИ (Stance) - популярные ===
    'Crimson Dervish': 'Багровый Дервиш',
    'Tempo Royale': 'Королевский Темп',
    'Blind Justice': 'Слепое Правосудие',
    'Crushing Ruin': 'Сокрушающие Руины',
    'Cleaving Whirlwind': 'Рассекающий Вихрь',
    'Primed Fever Strike': 'Лихорадочный Удар Прайм',
    
    // === VIGILANTE (дополнение) ===
    'Vigilante Vigor': 'Бодрость Стража'
};

// ============================================
// ФУНКЦИИ ПЕРЕВОДА
// ============================================

function translateStat(stat) {
    let translated = stat;
    for (const [en, ru] of Object.entries(statTranslations)) {
        translated = translated.replace(new RegExp(en, 'gi'), ru);
    }
    return translated;
}

function translateLocation(location) {
    let translated = location;
    for (const [en, ru] of Object.entries(locationTranslations)) {
        translated = translated.replace(new RegExp(en + '/', 'g'), ru + '/');
        translated = translated.replace(new RegExp(en + ' ', 'g'), ru + ' ');
    }
    for (const [en, ru] of Object.entries(missionTranslations)) {
        translated = translated.replace(new RegExp('\\(' + en + '\\)', 'g'), '(' + ru + ')');
        translated = translated.replace(new RegExp(', ' + en, 'g'), ', ' + ru);
    }
    return translated;
}

// ============================================
// ГЕНЕРАЦИЯ БАЗЫ
// ============================================

const modsDatabase = {};

mods.forEach(mod => {
    if (mod.type && mod.type.includes('Riven')) return;
    if (mod.type === 'Focus Way') return;
    
    const entry = {
        name: mod.name,
        nameRu: modNameTranslations[mod.name] || mod.name,
        uniqueName: mod.uniqueName,
        type: mod.type,
        typeRu: typeTranslations[mod.type] || mod.type,
        category: categoryMapping[mod.type] || 'other',
        rarity: mod.rarity,
        rarityRu: rarityTranslations[mod.rarity] || mod.rarity,
        baseDrain: mod.baseDrain || 0,
        maxRank: mod.fusionLimit || 0,
        polarity: mod.polarity,
        polarityRu: polarityTranslations[mod.polarity] || mod.polarity,
        tradable: mod.tradable || false,
        transmutable: mod.transmutable || false
    };
    
    if (mod.levelStats && mod.levelStats.length > 0) {
        entry.levelStats = mod.levelStats.map(level => ({
            stats: level.stats.map(s => translateStat(s))
        }));
    }
    
    if (mod.drops && mod.drops.length > 0) {
        entry.drops = mod.drops.map(drop => ({
            chance: drop.chance,
            location: translateLocation(drop.location),
            rarity: drop.rarity,
            rarityRu: rarityTranslations[drop.rarity] || drop.rarity,
            type: drop.type
        }));
    }
    
    // Специальная обработка для Galvanized модов - добавляем Арбитраж
    if (mod.name && mod.name.startsWith('Galvanized')) {
        if (!entry.drops) entry.drops = [];
        entry.drops.unshift({
            chance: 1.0,
            location: 'Арбитраж (за Витус-эссенцию)',
            rarity: 'Common',
            rarityRu: 'Обычный',
            type: mod.name
        });
    }
    
    modsDatabase[mod.name] = entry;
    
    if (modNameTranslations[mod.name] && modNameTranslations[mod.name] !== mod.name) {
        modsDatabase[modNameTranslations[mod.name]] = entry;
    }
});

fs.writeFileSync('mods_database_new.json', JSON.stringify(modsDatabase, null, 2));

// Статистика
const translated = Object.values(modsDatabase).filter(m => m.nameRu !== m.name).length;
const total = Object.keys(modsDatabase).length;

console.log('');
console.log('✅ Готово!');
console.log(`   Записей в базе: ${total}`);
console.log(`   С переводом: ${translated}`);
console.log('   Файл: mods_database_new.json');
