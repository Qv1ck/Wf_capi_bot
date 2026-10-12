// Обычная Цепь и Стальной путь — независимые недельные расписания.
// Update 43: девятая оружейная ротация началась 22.06.2026 в 00:00 UTC.
// https://www.warframe.com/en/patch-notes/psn/43-0-0
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STEEL_PATH_ROTATIONS = [
    ['Брэйтон', 'Лато', 'Скана', 'Парис', 'Кунай'],
    ['Боар', 'Гаммакор', 'Ангструм', 'Горгон', 'Анку'],
    ['Бо', 'Латрон', 'Фурис', 'Фуракс', 'Стран'],
    ['Лекс', 'Магистр', 'Болтор', 'Бронко', 'Керамический кинжал'],
    ['Торид', 'Двойные Токсоцисты', 'Двойные Ихоры', 'Митра', 'Атомос'],
    ['Ак и Брант', 'Сома', 'Васто', 'Нами Соло', 'Берстон'],
    ['Зайлок', 'Сибирь', 'Страх', 'Отчаяние', 'Ненависть'],
    ['Дера', 'Сибарис', 'Цестра', 'Сикарус', 'Окина'],
    ['Вектис', 'Стаг', 'Баллистика', 'Дестреза', 'Обекс'],
];
const STEEL_PATH_ROTATION_LENGTH = STEEL_PATH_ROTATIONS.length;
const EXPANSION_DATE = Date.parse('2026-06-22T00:00:00Z');

function rotationWeek(now, anchor, anchorWeek, length) {
    const timestamp = new Date(now).getTime();
    if (!Number.isFinite(timestamp)) throw new Error('Invalid rotation date');
    const elapsedWeeks = Math.floor((timestamp - Date.parse(anchor)) / WEEK_MS);
    const index = anchorWeek - 1 + elapsedWeeks;
    return ((index % length) + length) % length + 1;
}

function getCurrentDuviriWarframeWeek(now = new Date()) {
    // Сохранена прежняя опорная дата обычной Цепи; расширение оружия её не меняет.
    return rotationWeek(now, '2025-11-24T00:00:00Z', 3, 11);
}

function getCurrentDuviriWeek(now = new Date()) {
    if (new Date(now).getTime() < EXPANSION_DATE) {
        return rotationWeek(now, '2026-06-15T00:00:00Z', 8, 8);
    }
    return rotationWeek(now, '2026-06-22T00:00:00Z', 9, STEEL_PATH_ROTATION_LENGTH);
}

function getWeekWeapons(week) {
    return (STEEL_PATH_ROTATIONS[week - 1] || []).slice();
}

module.exports = {
    STEEL_PATH_ROTATION_LENGTH,
    getCurrentDuviriWarframeWeek,
    getCurrentDuviriWeek,
    getWeekWeapons,
};
