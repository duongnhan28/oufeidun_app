import {InputError} from './input-error';
export type StockAdjustmentMode = 'decrease' | 'increase' | 'count';

export function stockAdjustmentTarget(current: number, mode: string, input: string): number {
  if (!Number.isSafeInteger(current) || current < 0 || !/^\d+$/.test(input)) throw new InputError('Vui lòng nhập số lượng nguyên hợp lệ.');
  const quantity = Number(input);
  if (!['decrease','increase','count'].includes(mode) || !Number.isSafeInteger(quantity) || quantity < (mode === 'count' ? 0 : 1) || quantity > 1000000) throw new InputError('Số lượng điều chỉnh phải là số nguyên trong giới hạn cho phép.');
  const target = mode === 'count' ? quantity : current + (mode === 'increase' ? quantity : -quantity);
  if (target < 0) throw new InputError('Số lượng giảm không được vượt quá tồn hiện tại.');
  if (target > 1000000) throw new InputError('Tồn sau điều chỉnh không được vượt quá 1.000.000.');
  if (target === current) throw new InputError('Số lượng tồn chưa thay đổi.');
  return target;
}
