const test = require('node:test');
const assert = require('node:assert/strict');
const SessionUtils = require('../../js/session-utils.js');

test('generateSessionId', async (t) => {
  await t.test('has the expected shape', () => {
    const id = SessionUtils.generateSessionId();
    assert.match(id, /^sess_\d+_[a-z0-9]+$/);
  });

  await t.test('is unique across calls', () => {
    const ids = new Set();
    for (let i = 0; i < 200; i++) ids.add(SessionUtils.generateSessionId());
    assert.equal(ids.size, 200);
  });

  await t.test('is deterministic when given explicit inputs (for reproducible tests)', () => {
    assert.equal(SessionUtils.generateSessionId(12345, 'abcde'), 'sess_12345_abcde');
  });
});

test('buildExportPayload', async (t) => {
  const history = [
    { id: 'sess_1', date: '2026-01-01T00:00:00.000Z', day: 'Day 1 — Squat Focus', plan: '3-Day Total Body', doneSets: 10, totalSets: 12, exercises: [] }
  ];

  await t.test('wraps the history with app/type/version metadata', () => {
    const payload = SessionUtils.buildExportPayload(history, '2026-06-01T00:00:00.000Z');
    assert.equal(payload.app, 'motion-blueprint');
    assert.equal(payload.type, 'session-export');
    assert.equal(payload.version, SessionUtils.EXPORT_FORMAT_VERSION);
    assert.equal(payload.exportedAt, '2026-06-01T00:00:00.000Z');
    assert.deepEqual(payload.sessions, history);
  });

  await t.test('defaults exportedAt to now when not given', () => {
    const before = Date.now();
    const payload = SessionUtils.buildExportPayload(history);
    const parsed = Date.parse(payload.exportedAt);
    assert.ok(parsed >= before);
  });
});

test('buildExportFilename', async (t) => {
  await t.test('matches what exportSessions() actually saves as', () => {
    const name = SessionUtils.buildExportFilename(new Date('2026-06-01T12:34:56.000Z'));
    assert.equal(name, 'motion-blueprint-sessions-2026-06-01.json');
  });

  await t.test('is always a .json file with no path separators (safe as a bare filename)', () => {
    const name = SessionUtils.buildExportFilename(new Date('2026-01-01'));
    assert.match(name, /^motion-blueprint-sessions-\d{4}-\d{2}-\d{2}\.json$/);
    assert.ok(!name.includes('/') && !name.includes('\\'));
  });

  await t.test('defaults to today when no date given', () => {
    const todayStamp = new Date().toISOString().slice(0, 10);
    assert.equal(SessionUtils.buildExportFilename(), `motion-blueprint-sessions-${todayStamp}.json`);
  });
});

test('parseImportPayload', async (t) => {
  await t.test('accepts our own {sessions:[...]} export shape', () => {
    const raw = JSON.stringify({ app: 'motion-blueprint', sessions: [{ id: 'a', date: '2026-01-01', day: 'Day 1' }] });
    const sessions = SessionUtils.parseImportPayload(raw);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'a');
  });

  await t.test('accepts a bare array (manually trimmed/edited file)', () => {
    const raw = JSON.stringify([{ id: 'a', date: '2026-01-01', day: 'Day 1' }]);
    const sessions = SessionUtils.parseImportPayload(raw);
    assert.equal(sessions.length, 1);
  });

  await t.test('throws a user-facing message on invalid JSON', () => {
    assert.throws(() => SessionUtils.parseImportPayload('{not json'), /valid JSON/);
  });

  await t.test('throws a user-facing message when there is no sessions array', () => {
    assert.throws(() => SessionUtils.parseImportPayload(JSON.stringify({ foo: 'bar' })), /recognized/);
    assert.throws(() => SessionUtils.parseImportPayload(JSON.stringify(42)), /recognized/);
  });
});

test('mergeImportedSessions', async (t) => {
  const existing = [
    { id: 'sess_1', date: '2026-06-01T00:00:00.000Z', day: 'Day 1 — Squat Focus', doneSets: 10, totalSets: 12 }
  ];

  await t.test('adds new sessions and sorts newest-first', () => {
    const incoming = [
      { id: 'sess_2', date: '2026-06-05T00:00:00.000Z', day: 'Day 2 — Bench Focus' },
      { id: 'sess_0', date: '2026-05-01T00:00:00.000Z', day: 'Day 3 — Deadlift Focus' }
    ];
    const { merged, added, skipped } = SessionUtils.mergeImportedSessions(existing, incoming);
    assert.equal(added, 2);
    assert.equal(skipped, 0);
    assert.deepEqual(merged.map(s => s.id), ['sess_2', 'sess_1', 'sess_0']);
  });

  await t.test('does not mutate the original history array', () => {
    const before = existing.length;
    SessionUtils.mergeImportedSessions(existing, [{ id: 'sess_9', date: '2026-06-05', day: 'Day 2' }]);
    assert.equal(existing.length, before);
  });

  await t.test('skips a session whose id already exists (re-importing the same file is a no-op)', () => {
    const { merged, added, skipped } = SessionUtils.mergeImportedSessions(existing, [
      { id: 'sess_1', date: '2026-06-01T00:00:00.000Z', day: 'Day 1 — Squat Focus (edited copy)' }
    ]);
    assert.equal(added, 0);
    assert.equal(skipped, 1);
    assert.equal(merged.length, 1);
    // The pre-existing entry wins — an incoming duplicate id never overwrites it.
    assert.equal(merged[0].day, 'Day 1 — Squat Focus');
  });

  await t.test('skips malformed entries (missing date or day) without throwing', () => {
    const { merged, added, skipped } = SessionUtils.mergeImportedSessions(existing, [
      null,
      42,
      { id: 'sess_x' },                       // missing date/day
      { date: '2026-06-05', day: 'Day 2' },   // missing id — should be backfilled and added
    ]);
    assert.equal(added, 1);
    assert.equal(skipped, 3);
    assert.equal(merged.length, 2);
  });

  await t.test('backfills a missing id and still dedupes against it on a second merge', () => {
    const first = SessionUtils.mergeImportedSessions([], [{ date: '2026-06-05', day: 'Day 2' }]);
    assert.equal(first.added, 1);
    const generatedId = first.merged[0].id;
    assert.match(generatedId, /^sess_/);

    // Re-importing the exact same (now-id-bearing) object should be
    // recognized as a duplicate, not appended again.
    const second = SessionUtils.mergeImportedSessions(first.merged, [first.merged[0]]);
    assert.equal(second.added, 0);
    assert.equal(second.skipped, 1);
  });
});
