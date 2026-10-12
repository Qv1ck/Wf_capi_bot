const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createArbitrations, parseSchedule, currentIndex } = require('./arbitrations');
const logger = { log() {}, error() {} };
const start = Date.parse('2026-10-12T18:00:00Z') / 1000;
const schedule = [0, 1, 2, 3, 4].map(i => `${start + i * 3600},SolNode26`).join('\n');
const clock = () => (start + 600) * 1000;

(async () => {
    const calls = [];
    const provider = createArbitrations({ now: clock, cachePath: null, logger, request: async url => {
        calls.push(url);
        if (url.includes('raw.githubusercontent.com/calamity-inc')) throw new Error('HTTP 404');
        if (url.includes('solNodes')) throw new Error('HTTP 503');
        return schedule;
    } });
    const result = await provider.refresh();
    assert.strictEqual(calls.length, 3);
    assert.strictEqual(result.current.name, 'Lith');
    assert.strictEqual(result.current.planet, 'Земля');
    assert.strictEqual(result.current.missionType, 'Defense');
    assert.strictEqual(result.upcoming.length, 3);
    assert.strictEqual(result.current.start, start);
    assert.strictEqual(result.current.expiry, start + 3600);

    const parsed = parseSchedule(schedule);
    assert.strictEqual(currentIndex(parsed, start - 1), -1);
    assert.strictEqual(currentIndex(parsed, start + 3600), 1);
    assert.strictEqual(currentIndex(parsed, start + 5 * 3600), -1);
    assert.throws(() => parseSchedule('<html>not data</html>'), /формат/);
    assert.throws(() => parseSchedule('[]'), /формат/);
    assert.throws(() => parseSchedule(''), /Пустое/);
    assert.throws(() => parseSchedule(`${start},SolNode26\n${start + 7200},SolNode26`), /пропущены/);
    assert.throws(() => parseSchedule(`${start + 1},SolNode26`), /время/);

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-arbitrations-'));
    const cachePath = path.join(directory, 'cache.json');
    try {
        const loaded = createArbitrations({ now: clock, cachePath, logger, request: async url => url.includes('solNodes') ? '{}' : schedule });
        await loaded.refresh();
        assert.ok(fs.existsSync(cachePath));
        const offline = createArbitrations({ now: clock, cachePath, logger, request: async () => { throw new Error('Offline'); } });
        const cached = await offline.refresh();
        assert.strictEqual(cached.current.start, start);
        assert.strictEqual(cached.fromCache, true);
        const expired = createArbitrations({ now: () => (start + 5 * 3600) * 1000, cachePath, logger, request: async () => schedule });
        assert.ok((await expired.refresh()).error);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
    console.log('Arbitration checks passed: real format, source fallback, metadata fallback, cache, hourly boundaries, expired data.');
})().catch(error => { console.error(error); process.exitCode = 1; });
