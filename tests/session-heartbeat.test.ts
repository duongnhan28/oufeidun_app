import test from 'node:test';
import assert from 'node:assert/strict';
import {isSessionInvalid, startSessionHeartbeat} from '../src/lib/session-heartbeat';

test('heartbeat only expires sessions explicitly rejected by authentication', () => {
  for (const code of ['SESSION_REQUIRED','SESSION_REPLACED','ACCOUNT_DISABLED','UNAUTHENTICATED']) {
    assert.equal(isSessionInvalid(new Error(code)), true);
    assert.equal(isSessionInvalid({message: code}), true);
  }
  for (const code of ['SERVER_UNAVAILABLE','AbortError','Failed to fetch','HTTP_500','HTTP_503','FORBIDDEN','ER_LOCK_WAIT_TIMEOUT','unexpected failure'])
    assert.equal(isSessionInvalid(new Error(code)), false);
  assert.equal(isSessionInvalid(null), false);
});

test('outage warns once, recovers automatically, and does not overlap or act after disposal', async () => {
  let tick!: () => Promise<void>;
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  globalThis.setInterval = ((callback: () => Promise<void>) => { tick = callback; return 1; }) as any;
  globalThis.clearInterval = (() => {}) as any;
  let expire = 0, warn = 0, calls = 0, mode = 'network';
  let rejectPending!: (e: Error) => void;
  try {
    const stop = startSessionHeartbeat({
      touch: async () => {
        calls++;
        if (mode === 'pending') return new Promise<void>((_resolve,reject) => { rejectPending = reject; });
        if (mode !== 'ok') throw new Error(mode === 'network' ? 'SERVER_UNAVAILABLE' : 'SESSION_REQUIRED');
      },
      expired: () => { expire++; }, unavailable: () => { warn++; },
    });
    await tick(); await tick();
    assert.equal(expire,0); assert.equal(warn,1);
    mode = 'ok'; await tick();
    mode = 'network'; await tick(); assert.equal(warn,2);
    mode = 'pending'; const pending = tick(); const before = calls;
    await tick(); assert.equal(calls,before);
    stop(); rejectPending(new Error('SESSION_REQUIRED')); await pending;
    assert.equal(expire,0);
    await tick(); assert.equal(calls,before);
    startSessionHeartbeat({touch: async () => { throw new Error('SESSION_REQUIRED'); }, expired: () => {expire++;}, unavailable: () => {warn++;}});
    await tick(); await tick(); assert.equal(expire,1); assert.equal(warn,2);
  } finally {
    globalThis.setInterval = realSet; globalThis.clearInterval = realClear;
  }
});
