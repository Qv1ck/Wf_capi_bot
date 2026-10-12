const assert = require('assert');
const {
    STEEL_PATH_ROTATION_LENGTH,
    getCurrentDuviriWarframeWeek,
    getCurrentDuviriWeek,
    getWeekWeapons,
} = require('./duviri_rotations');

assert.strictEqual(STEEL_PATH_ROTATION_LENGTH, 9);
assert.strictEqual(getCurrentDuviriWeek('2026-06-21T23:59:59.999Z'), 8);
assert.strictEqual(getCurrentDuviriWeek('2026-06-22T00:00:00Z'), 9);
assert.strictEqual(getCurrentDuviriWeek('2026-06-28T23:59:59.999Z'), 9);
assert.strictEqual(getCurrentDuviriWeek('2026-06-29T00:00:00Z'), 1);
assert.strictEqual(getCurrentDuviriWeek('2026-08-24T00:00:00Z'), 9);

// Регрессия: старый код сообщал неделю 1 вместо 7 на 12 октября.
assert.strictEqual(getCurrentDuviriWeek('2026-10-12T12:00:00Z'), 7);
assert.strictEqual(getCurrentDuviriWarframeWeek('2026-10-12T12:00:00Z'), 5);
assert.strictEqual(getCurrentDuviriWeek('2026-10-11T23:59:59.999Z'), 6);
assert.strictEqual(getCurrentDuviriWeek('2026-10-12T03:00:00+03:00'), 7);
assert.ok(getWeekWeapons(6).includes('Берстон'));
assert.ok(getWeekWeapons(6).includes('Нами Соло'));
assert.deepStrictEqual(getWeekWeapons(9), ['Вектис', 'Стаг', 'Баллистика', 'Дестреза', 'Обекс']);
assert.strictEqual(getWeekWeapons(10).length, 0);
assert.strictEqual(getWeekWeapons(0).length, 0);
assert.throws(() => getCurrentDuviriWeek('not a date'), /Invalid rotation date/);

// Полные циклы и границы: смена строго в понедельник 00:00 UTC.
const start = Date.parse('2026-06-29T00:00:00Z');
for (let week = 0; week < 27; week++) {
    const date = start + week * 7 * 24 * 60 * 60 * 1000;
    assert.strictEqual(getCurrentDuviriWeek(date), week % 9 + 1);
    assert.strictEqual(getCurrentDuviriWeek(date - 1), (week + 8) % 9 + 1);
    assert.strictEqual(getWeekWeapons(getCurrentDuviriWeek(date)).length, 5);
}
console.log('Duviri rotation checks passed: expansion, reset, full cycles, reported regression.');
