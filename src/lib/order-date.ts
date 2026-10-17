/** Inclusive calendar dates in Vietnam, independent of the timestamp's offset. */
export function inVietnamDateRange(timestamp: string, from: string, to: string): boolean {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return false;
  return (!from || value >= new Date(`${from}T00:00:00+07:00`).getTime()) &&
    (!to || value < new Date(`${to}T00:00:00+07:00`).getTime() + 86400000);
}

export function vietnamDateInput(value: string = new Date().toISOString()): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() + 7 * 3600000).toISOString().slice(0,16) : '';
}

export function orderDateValue(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('INVALID_ORDER_DATE');
  const parsed = new Date(value + ':00+07:00');
  if (!Number.isFinite(parsed.getTime()) || vietnamDateInput(parsed.toISOString()) !== value || value.slice(0,4) < '2000' || value.slice(0,4) > '2100') throw new Error('INVALID_ORDER_DATE');
  return value + ':00+07:00';
}
