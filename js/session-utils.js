/* ============================================================
   SessionUtils — pure, DOM-free logic for logged workout sessions:
   id generation, and the export/import merge behavior.

   Kept in its own file (instead of inline in index.html) so it can
   be loaded two ways with zero build step and zero dependencies:
     - in the browser, via <script src="./js/session-utils.js">,
       which attaches `window.SessionUtils`
     - in Node, via require('./js/session-utils.js'), used by the
       unit tests under tests/unit/
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SessionUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const EXPORT_FORMAT_VERSION = 1;

  // Same id shape used throughout the app (finishWorkout, the
  // pre-existing-session id backfill in renderProgress, and import).
  function generateSessionId(now, random) {
    now = now === undefined ? Date.now() : now;
    const rand = random === undefined ? Math.random().toString(36).slice(2, 7) : random;
    return `sess_${now}_${rand}`;
  }

  // Wraps a history array for export. `exportedAt` is injectable for
  // deterministic tests; defaults to "now" for real use.
  function buildExportPayload(history, exportedAt) {
    return {
      app: 'motion-blueprint',
      type: 'session-export',
      version: EXPORT_FORMAT_VERSION,
      exportedAt: exportedAt || new Date().toISOString(),
      sessions: history
    };
  }

  // Parses raw import file text into an array of session-like objects.
  // Accepts either our own {sessions:[...]} export shape or a bare
  // array, so a manually trimmed/edited file still imports. Throws a
  // short, user-facing message on anything unusable — callers show it
  // directly rather than a raw parser/stack error.
  function parseImportPayload(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error("That file isn't valid JSON");
    }
    const sessions = Array.isArray(parsed) ? parsed : parsed && parsed.sessions;
    if (!Array.isArray(sessions)) {
      throw new Error('Not a recognized Motion Blueprint export');
    }
    return sessions;
  }

  // Merges `incoming` sessions into `existingHistory`, skipping anything
  // malformed (missing date/day) and anything whose id already exists
  // (a duplicate — already logged or already imported once before),
  // so re-importing the same file is a no-op rather than creating
  // duplicate cards. Returns a NEW array (existingHistory is not
  // mutated) sorted newest-first, plus counts for the UI to report.
  function mergeImportedSessions(existingHistory, incoming) {
    const merged = existingHistory.slice();
    const existingIds = new Set(merged.map(h => h.id));
    let added = 0, skipped = 0;

    incoming.forEach(s => {
      if (!s || typeof s !== 'object' || !s.date || !s.day) { skipped++; return; }
      const session = s.id ? s : Object.assign({}, s, { id: generateSessionId() });
      if (existingIds.has(session.id)) { skipped++; return; }
      existingIds.add(session.id);
      merged.push(session);
      added++;
    });

    merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { merged, added, skipped };
  }

  return {
    EXPORT_FORMAT_VERSION,
    generateSessionId,
    buildExportPayload,
    parseImportPayload,
    mergeImportedSessions
  };
});
