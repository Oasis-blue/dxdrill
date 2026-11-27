const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('visual checker contains a syntactically valid browser script', () => {
  const html = fs.readFileSync('visual-checker.html', 'utf8');
  const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
  assert.ok(match, 'expected an inline script');
  assert.doesNotThrow(() => new vm.Script(match[1]));
});

test('ordinary question checker links to the visual intake checker', () => {
  const html = fs.readFileSync('checker.html', 'utf8');
  assert.match(html, /href="visual-checker\\.html"/);
});
