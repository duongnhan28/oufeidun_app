export type Role = "admin" | "staff";
export type User = {
  id: string;
  display_name: string;
  role: Role;
  active: boolean;
};
export type Product = {
  id: string;
  sku: string;
  name: string;
  glass_type: string;
  models: string[];
  brand: string;
  glass_brand_id?: string | null;
  sale_price: string;
  wholesale_price?: string;
  fixed_cost?: string;
  on_hand: number;
  version: number;
  price_version: number;
  stock_version: number;
  active: boolean;
  image_path?: string | null;
};
export type ItemKind = "sale" | "gift" | "sample";
export type Item = {
  id?: string;
  product_id: string;
  quantity: number;
  delivered_quantity?: number;
  missing_quantity?: number;
  custom_name: string | null;
  unit_sale_price?: string;
  price_overridden?: boolean;
  price_source?: "retail_default" | "wholesale_default" | "customer_saved" | "manual" | "free_item";
  save_customer_price?: boolean;
  zero_price_confirm?: boolean;
  quoted_price_version?: number;
  product_name_snapshot?: string | null;
  sku_snapshot?: string | null;
  returned_quantity?: number;
  item_kind?: ItemKind;
  item_note?: string;
  models_snapshot?: string[] | null;
};
export type Payment = {
  id: string;
  amount: string;
  method:
    | "cash"
    | "transfer"
    | "cod"
    | "cod_transfer"
    | "cash_transfer";
  note: string;
  paid_at: string;
  actor_name?: string;
};
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type Order = {
  id: string;
  order_no: string;
  status: string;
  created_by: string;
  creator_name: string;
  sales_user_id?: string | null;
  sales_name?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_type?: "retail" | "wholesale";
  customer_id?: string | null;
  fulfillment_status?: "complete" | "short";
  missing_summary?: string;
  note: string;
  payment_method: string;
  payment_status?: PaymentStatus;
  paid_amount?: string;
  outstanding_amount?: string;
  payments?: Payment[];
  total_amount: string;
  ordered_at?: string;
  extra_cost?: string;
  extra_cost_note?: string;
  created_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  version: number;
  items: Item[];
  deliveries?: DeliveryRecord[];
  returns?: ReturnRecord[];
  exchange_return_id?: string | null;
};
export type DeliveryRecord = {
  id: string;
  sequence_no: number;
  delivery_kind: "initial" | "supplement";
  delivered_at: string;
  actor_name: string;
  total_quantity: number;
  total_amount: string;
  items: {
    order_item_id: string;
    product_id: string;
    sku: string | null;
    name: string | null;
    quantity: number;
    unit_price: string;
    amount: string;
  }[];
};
export type Customer = {
  id: string;
  customer_type: "retail" | "wholesale";
  name: string;
  phone: string;
  address: string;
  note: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type ReturnRecord = {
  id: string;
  return_no: string;
  posted_at: string;
  refund_amount: string;
  reason: string;
  items: {
    order_item_id: string;
    quantity: number;
    restock_quantity: number;
  }[];
};
export type Audit = {
  id: string;
  action: string;
  actor_name: string;
  created_at: string;
  detail: string;
};
export type Workspace = {
  me: User;
  glass_brands: { id: string; name: string }[];
  products: Product[];
  orders: Order[];
  users: User[];
  salespeople: User[];
  logs: Audit[];
  customers: Customer[];
  customer_prices: { customer_id: string; product_id: string; unit_price: string }[];
};
export type Report = {
  other_charges?: string;
  order_value?: string;
  revenue: string;
  cost?: string;
  profit?: string;
  refunds: string;
  damage?: string;
  sold: number;
  stock: number;
  stock_value?: string;
  order_count?: number;
  sales?: {
    sku: string; name: string; unit_cost?: string; sale_price: string;
    quantity: number; total_cost?: string; revenue: string; profit?: string;
  }[];
  movements?: {
    occurred_at: string; sku: string; name: string; movement_type: string;
    quantity_delta: number; balance_after: number; sales: string; order_no?: string | null;
  }[];
  inventory: {
    sku: string;
    name: string;
    opening: number;
    incoming: number;
    outgoing: number;
    closing: number;
  }[];
};
export const typeLabels: Record<string, string> = {
  clear: "Full viền",
  privacy: "Chống nhìn trộm",
  full_border: "Full viền",
  premium_borderless: "Không viền cao cấp",
  matte: "Full viền cao cấp",
  other: "Phụ kiện khác",
};
export const statusLabels: Record<string, string> = {
  draft: "Bản nháp",
  confirmed: "Đã bán",
  cancelled: "Đã hủy",
  partially_returned: "Trả một phần",
  returned: "Đã trả hết",
  deleted: "Đã xóa",
};
export const paymentLabels: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  cod: "COD",
  cod_transfer: "COD + chuyển khoản",
  cash_transfer: "Tiền mặt + chuyển khoản",
};
export const paymentStatusLabels: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};
export const money = (n: string | number | bigint = 0) =>
  BigInt(n).toLocaleString("vi-VN") + "đ";
export const amount = (items: Item[]) =>
  items.reduce(
    (s, i) => s + BigInt(i.unit_sale_price || "0") * BigInt(i.quantity),
    0n,
  );
export const dateText = (s: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(s))
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`;
};
export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
export const currentMonthStart = () => `${today().slice(0, 7)}-01`;
