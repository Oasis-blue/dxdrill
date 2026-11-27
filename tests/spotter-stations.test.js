const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function bootSpotter() {
  const visual = (id, station, q) => ({
    id, topic: 'topic-a', visualStationId: station, image: 'gross/shared.jpg',
    q, options: ['A', 'B', 'C', 'D'], answer: 0, explain: 'Explanation'
  });
  const legacy = (id, q) => ({
    id, topic: 'topic-a', image: 'histo/legacy.jpg',
    q, options: ['A', 'B', 'C', 'D'], answer: 0, explain: 'Explanation'
  });
  const recorded = [];
  const submitted = [];
  const intervals = [];
  const DX = {
    esc: s => String(s == null ? '' : s),
    questions: [
      visual('v1', 'station-one', 'Visual question one'),
      visual('v2', 'station-one', 'Visual question two'),
      legacy('l1', 'Legacy question one'),
      legacy('l2', 'Legacy question two')
    ],
    topicById: { 'topic-a': { name: 'Topic A', area: 'area-a' } },
    areaById: { 'area-a': { name: 'Area A' } },
    shuffle: a => a.slice(),
    optOrder: () => [0, 1, 2, 3],
    qImg: q => '<img alt="' + q.id + '">',
    record: a => recorded.push(...a),
    cloud: { submit: a => submitted.push(...a) },
    fx: { unlock() {}, play() {} }
  };
  const app = { innerHTML: '' };
  const document = {
    getElementById: () => null,
    querySelectorAll: () => []
  };
  const window = { DX, matchMedia: () => ({ matches: false }), scrollTo() {} };
  const context = {
    window, document, Date, Math: Object.create(Math),
    setInterval: fn => { intervals.push(fn); return intervals.length; },
    clearInterval() {}
  };
  context.Math.random = () => 0;
  vm.runInNewContext(fs.readFileSync('js/spotter.js', 'utf8'), context);
  DX.spotter.render(app);
  function click(action, attrs = {}) {
    const target = { getAttribute: name => ({ 'data-act': action, ...attrs })[name] || null };
    DX.spotter.onClick({ target: { closest: () => target } });
  }
  return { DX, app, click, recorded, submitted, intervals };
}

test('visual station questions run in sequence under one station timer; legacy image stays one question', () => {
  const x = bootSpotter();
  assert.match(x.app.innerHTML, /Stations from/);
  x.click('start');
  assert.match(x.app.innerHTML, /Station 1 of 2/);
  assert.match(x.app.innerHTML, /Question 1 of 2/);
  assert.match(x.app.innerHTML, /Visual question one/);
  assert.equal(x.intervals.length, 1);

  x.click('nextq');
  assert.match(x.app.innerHTML, /Question 2 of 2/);
  assert.match(x.app.innerHTML, /Visual question two/);
  assert.equal(x.intervals.length, 1, 'moving to the next question must not restart the station timer');

  x.click('pick', { 'data-oi': '0' });
  x.click('skip');
  assert.match(x.app.innerHTML, /Station 2 of 2/);
  assert.doesNotMatch(x.app.innerHTML, /Question 1 of 1/);
  assert.match(x.app.innerHTML, /Legacy question one/);

  x.click('skip');
  assert.match(x.app.innerHTML, /1 out of 3/);
  assert.match(x.app.innerHTML, /3 answered|1 answered/);
  assert.equal(x.recorded.length, 3, 'every displayed question is recorded');
  assert.equal(x.submitted.length, 1, 'only answered questions are submitted to the cloud');
  assert.match(x.app.innerHTML, /Visual question one/);
  assert.match(x.app.innerHTML, /Visual question two/);
  assert.match(x.app.innerHTML, /Legacy question one/);
  assert.doesNotMatch(x.app.innerHTML, /Legacy question two/);
});
