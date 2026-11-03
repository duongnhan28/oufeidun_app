import type {Report} from '../types';

// Older APIs return product revenue in `revenue`; newer ones include fees.
export function reportTotals(report: Report) {
  const fees = BigInt(report.other_charges || '0');
  const products = BigInt(report.product_revenue ?? report.revenue);
  return {products, fees, revenue: products + fees};
}
