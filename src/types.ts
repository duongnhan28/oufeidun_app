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
  custom_name: string | null;
  unit_sale_price?: string;
  quoted_price_version?: number;
  product_name_snapshot?: string | null;
  sku_snapshot?: string | null;
  returned_quantity?: number;
  item_kind?: ItemKind;
  item_note?: string;
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
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_type?: "retail" | "wholesale";
  note: string;
  payment_method: string;
  payment_status?: PaymentStatus;
  paid_amount?: string;
  outstanding_amount?: string;
  payments?: Payment[];
  total_amount: string;
  created_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  version: number;
  items: Item[];
  returns?: ReturnRecord[];
  exchange_return_id?: string | null;
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
  logs: Audit[];
};
export type Report = {
  revenue: string;
  cost: string;
  profit: string;
  refunds: string;
  damage: string;
  sold: number;
  stock: number;
  stock_value: string;
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
  clear: "Kính trong",
  privacy: "Chống nhìn trộm",
  matte: "Kính nhám",
  other: "Khác",
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
export const dateText = (s: string) =>
  new Date(s).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
