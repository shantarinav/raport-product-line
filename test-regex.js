const fs = require('fs');
const glob = require('glob'); // Note: we can use a simple walk or npx glob

function testRegex() {
    const text = 'text-[var(--raport-muted)] bg-[var(--raport-surface-soft)] hover:bg-[var(--raport-action-bg-active)] shadow-[inset_0_0_0_1px_var(--raport-action-border)]';
    const regex = /\[var\(--raport-([a-zA-Z0-9-]+)\)\]/g;
    const result = text.replace(regex, 'raport-$1');
    console.log(result);
}

testRegex();
