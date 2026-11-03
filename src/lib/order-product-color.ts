// Category wins over text; SKU inference is only for older/export-only records.
export function orderProductColor(glassType?: string, sku = ''): string {
  if (glassType) return glassType === 'privacy' ? '#D6A000' : glassType === 'premium_borderless' ? '#0070C0' : '#000000';
  const code = sku.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toUpperCase();
  if (/\bCNT\b|PRIVACY|CHONG\s*NHIN\s*TROM/.test(code)) return '#D6A000';
  if (/KHONG\s*VIEN|BORDERLESS/.test(code)) return '#0070C0';
  return '#000000';
}
