const https = require('https');
const fs = require('fs');
const bundledNodes = require('./arbitration_nodes.json');

// Расписание сообщества, используемое самим browse.wf (arbys.ts).
const SCHEDULE_URLS = [
    'https://raw.githubusercontent.com/calamity-inc/browse.wf/senpai/arbys.txt',
    'https://browse.wf/arbys.txt',
];
const NODES_URL = 'https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json';
const HOUR = 3600;
const REFRESH_MS = 60 * 60 * 1000;
const RETRY_MS = 3 * 60 * 1000;

function fetchText(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'WarframeBot/3.1' } }, res => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                res.resume();
                if (!res.headers.location || redirects >= 3) return reject(new Error('Invalid redirect'));
                const next = new URL(res.headers.location, url);
                if (next.protocol !== 'https:') return reject(new Error('HTTPS required'));
                return fetchText(next.href, redirects + 1).then(resolve, reject);
            }
            if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
            const chunks = [];
            let bytes = 0;
            res.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > 4 * 1024 * 1024) req.destroy(new Error('Response too large'));
                else chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => req.destroy(new Error('Timeout')));
    });
}

function parseSchedule(text) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('Пустое расписание');
    const rows = text.trim().split(/\r?\n/).map(line => {
        const match = /^(\d+),([A-Za-z][A-Za-z0-9]+)$/.exec(line.trim());
        if (!match) throw new Error('Изменился формат расписания');
        const start = Number(match[1]);
        if (!Number.isSafeInteger(start) || start <= 0 || start % HOUR) throw new Error('Некорректное время арбитража');
        return { start, nodeId: match[2] };
    });
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].start - rows[i - 1].start !== HOUR) throw new Error('В расписании пропущены или повторены часы');
    }
    return rows;
}

function currentIndex(rows, timestamp) {
    let low = 0, high = rows.length - 1, result = -1;
    while (low <= high) {
        const middle = (low + high) >> 1;
        if (rows[middle].start <= timestamp) { result = middle; low = middle + 1; }
        else high = middle - 1;
    }
    return result >= 0 && timestamp < rows[result].start + HOUR ? result : -1;
}

function toMission(row, nodes) {
    const node = nodes[row.nodeId] || bundledNodes[row.nodeId];
    const label = node && (node.nameRu || node.value);
    const match = label && /^(.*) \(([^()]*)\)$/.exec(label);
    return {
        start: row.start, expiry: row.start + HOUR, nodeId: row.nodeId,
        name: match ? match[1] : label || row.nodeId,
        planet: match ? match[2] : 'локация пока не распознана',
        missionType: node && node.type || 'Unknown',
        enemy: node && node.enemy || 'Unknown',
    };
}

function createArbitrations({ request = fetchText, now = Date.now, cachePath = 'arbitration_cache.json', logger = console } = {}) {
    let rows = [], nodes = bundledNodes, fetchedAt = 0, fromCache = false, inFlight;
    let lastAttempt = -Infinity;
    try {
        if (cachePath && fs.existsSync(cachePath)) {
            const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            const parsed = parseSchedule(cached.schedule);
            if (currentIndex(parsed, Math.floor(now() / 1000)) >= 0 && Number.isFinite(cached.fetchedAt)) {
                rows = parsed; fetchedAt = cached.fetchedAt; fromCache = true;
                logger.log('✓ Расписание арбитражей восстановлено из кэша');
            }
        }
    } catch (error) { logger.error(`Кэш арбитражей не прочитан: ${error.message}`); }

    function missions() {
        const index = currentIndex(rows, Math.floor(now() / 1000));
        if (index < 0) return [];
        // Для поиска ближайших миссий достаточно 30 дней; полный прогноз остаётся в rows.
        return rows.slice(index, index + 30 * 24).map(row => toMission(row, nodes));
    }
    function current() {
        const index = currentIndex(rows, Math.floor(now() / 1000));
        if (index < 0) return { error: rows.length ? 'Расписание арбитражей закончилось или не охватывает текущий час. Обновление будет повторено.' : 'Расписание арбитражей пока недоступно. Загрузка будет повторена автоматически.' };
        return { current: toMission(rows[index], nodes), upcoming: rows.slice(index + 1, index + 4).map(row => toMission(row, nodes)), fetchedAt, fromCache };
    }

    async function refresh(force = false) {
        if (inFlight) return inFlight;
        const timestamp = now();
        if (!force && timestamp - lastAttempt < RETRY_MS) return current();
        if (!force && !fromCache && fetchedAt && timestamp - fetchedAt < REFRESH_MS && !current().error) return current();
        lastAttempt = timestamp;
        inFlight = (async () => {
            let downloaded, parsed;
            for (const url of SCHEDULE_URLS) {
                try {
                    downloaded = await request(url);
                    parsed = parseSchedule(downloaded);
                    if (currentIndex(parsed, Math.floor(now() / 1000)) < 0) throw new Error('Расписание не охватывает текущий час');
                    break;
                } catch (error) {
                    parsed = undefined;
                    logger.error(`Источник арбитражей ${new URL(url).hostname}: ${error.message}`);
                }
            }
            if (!parsed) { fromCache = rows.length > 0; return current(); }
            // Справочник нужен для названий миссий; его отказ не уничтожает расписание.
            try {
                const metadata = JSON.parse(await request(NODES_URL));
                if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Некорректный справочник узлов');
                const valid = Object.fromEntries(Object.entries(metadata).filter(([id, node]) =>
                    /^[A-Za-z][A-Za-z0-9]+$/.test(id) && node && typeof node.value === 'string' && typeof node.type === 'string'));
                if (!Object.keys(valid).length) throw new Error('Пустой справочник узлов');
                nodes = { ...bundledNodes, ...valid };
                for (const id of Object.keys(bundledNodes)) {
                    // Перевод относится к тому же узлу, но тип и фракция берутся из обновления.
                    if (nodes[id].value === bundledNodes[id].value) nodes[id].nameRu = bundledNodes[id].nameRu;
                }
            } catch (error) { logger.error(`Справочник узлов: ${error.message}; используется сохранённая копия`); }
            rows = parsed; fetchedAt = now(); fromCache = false;
            if (cachePath) {
                try {
                    const temporary = cachePath + '.tmp';
                    fs.writeFileSync(temporary, JSON.stringify({ fetchedAt, schedule: downloaded }));
                    fs.renameSync(temporary, cachePath);
                } catch (error) { logger.error(`Кэш арбитражей не сохранён: ${error.message}`); }
            }
            logger.log(`✓ Загружено ${rows.length} арбитражей (расписание browse.wf)`);
            return current();
        })();
        try { return await inFlight; } finally { inFlight = undefined; }
    }
    return { refresh, current, missions };
}

module.exports = { createArbitrations, parseSchedule, currentIndex, toMission };
