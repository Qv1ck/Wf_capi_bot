const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Выполняем реальные обработчики без подключения к Telegram.
const source = fs.readFileSync(require.resolve('./js_bot.js'), 'utf8');
function handlerSnippet(marker) {
    const begin = source.indexOf(marker);
    const end = source.indexOf('\n});', begin);
    assert.ok(begin >= 0 && end > begin);
    return source.slice(begin, end + 4);
}

(async () => {
    const start = Math.floor(Date.now() / 3600000) * 3600;
    const missions = Array.from({length:5}, (_, i) => ({ start:start+i*3600, name:'Lith', planet:'Земля', missionType:'Defense', enemy:'Grineer' }));
    let result = { current:{...missions[0]}, upcoming:missions.slice(1,4), fetchedAt:Date.now() };
    const messages = [];
    let command, callback, refreshes = 0, acknowledgements = 0;
    const context = {
        bot: { command(names, fn) { command = fn; }, action(name, fn) { callback = fn; } },
        console: {log() {}}, Date,
        arbitrationData: missions,
        async loadArbitrationData() { refreshes++; },
        getCurrentArbitration() { return result; },
        formatArbitrationInfo(arb) { return `[${arb.start}]`; },
        formatArbitrationStatus() { return 'STATUS'; },
    };
    vm.runInNewContext(handlerSnippet("bot.command(['arbitration'"), context);
    vm.runInNewContext(handlerSnippet("bot.action('cmd_arbitration'"), context);
    const ctx = { from:{first_name:'test'}, message:{text:'/arbitration'},
        async reply(message) { messages.push(message); },
        async replyWithMarkdown(message) { messages.push(message); },
        async answerCbQuery() { acknowledgements++; } };
    await command(ctx);
    assert.ok(messages.pop().includes('СЛЕДУЮЩИЕ'));
    ctx.message.text='/arbitration defense';
    await command(ctx);
    const filtered=messages.pop();
    // current — отдельный объект; поиск индекса по ссылке потерял бы первые четыре миссии.
    assert.strictEqual((filtered.match(/\[\d+\]/g) || []).length, 5);
    assert.strictEqual((filtered.match(/STATUS/g) || []).length, 1);
    await callback(ctx);
    assert.strictEqual((messages.pop().match(/STATUS/g) || []).length, 1);
    assert.strictEqual(acknowledgements, 1);
    result={error:'Источник недоступен'};
    await command(ctx);
    assert.ok(messages.pop().includes('Источник недоступен'));
    assert.strictEqual(refreshes, 4);
    console.log('Telegram arbitration handlers passed: command, filtering, button, source status, unavailable data.');
})().catch(error => { console.error(error); process.exitCode=1; });
