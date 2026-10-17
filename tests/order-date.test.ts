import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inVietnamDateRange } from '../src/lib/order-date';

test('Vietnam order filtering includes the whole displayed date with either local or UTC timestamps', () => {
  for (const timestamp of ['2026-10-05T20:21:00+07:00', '2026-10-05T13:21:00Z', '2026-10-05T00:00:00+07:00', '2026-10-05T23:59:59.999+07:00']) {
    assert.equal(inVietnamDateRange(timestamp, '2026-10-05', '2026-10-05'), true, timestamp);
    assert.equal(inVietnamDateRange(timestamp, '2026-10-06', '2026-10-06'), false, timestamp);
  }
  assert.equal(inVietnamDateRange('2026-10-06T00:00:00+07:00', '2026-10-05', '2026-10-05'), false);
  assert.equal(inVietnamDateRange('2026-10-04T23:59:59+07:00', '2026-10-05', '2026-10-05'), false);
  assert.equal(inVietnamDateRange('2026-10-05T20:21:00+07:00', '', ''), true);
  assert.equal(inVietnamDateRange('invalid', '', ''), false);
});
