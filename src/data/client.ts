import { createClient } from "@supabase/supabase-js";
import type { Report, User, Workspace } from "../types";

export const demo = import.meta.env.VITE_DEMO_MODE === "true";
const backend = String(
  import.meta.env.VITE_DATA_BACKEND || "supabase",
).toLowerCase();
const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "");
const supabaseKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "");
const supabase =
  !demo && backend === "supabase" && supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
const productImageBucket = "app-ban-hang-product-images";
let actor = "";
let accessToken = "";

export function setDemoActor(id: string) {
  actor = id;
}

function deviceId() {
  let id = localStorage.getItem("app-ban-hang-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("app-ban-hang-device-id", id);
  }
  return id;
}

function endpoint(path: string) {
  if (!apiBase) throw new Error("CONFIG_REQUIRED");
  return `${apiBase}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(endpoint(path), {
      ...init,
      headers,
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      if (response.status === 401 || body.error === "SESSION_REQUIRED")
        accessToken = "";
      throw new Error(body.error || `HTTP_${response.status}`);
    }
    return body as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loginOnline(
  username: string,
  password: string,
): Promise<User> {
  if (demo) throw new Error("CONFIG_REQUIRED");
  if (backend === "supabase") {
    if (!supabase) throw new Error("CONFIG_REQUIRED");
    const { data: email, error: resolveError } = await supabase.rpc(
      "app_ban_hang_resolve_login",
      { p_login_name: username },
    );
    if (resolveError || !email) throw new Error("INVALID_CREDENTIALS");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(email),
      password,
    });
    if (error) throw new Error("INVALID_CREDENTIALS");
    const { error: claimError } = await supabase.rpc(
      "app_ban_hang_claim_session",
      { p_device_id: deviceId() },
    );
    if (claimError) {
      await supabase.auth.signOut({ scope: "local" });
      throw claimError;
    }
    const data = await workspace();
    return data.me;
  }
  const result = await request<{ access_token: string; user: User }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password, device_id: deviceId() }),
    },
  );
  accessToken = result.access_token;
  return result.user;
}

export async function claimOnlineSession() {
  if (!demo && backend === "api" && !accessToken)
    throw new Error("SESSION_REQUIRED");
}
export async function touchOnlineSession() {
  if (demo) return;
  if (backend === "supabase") {
    const { error } = await supabase!.rpc("app_ban_hang_touch_session");
    if (error) throw error;
    return;
  }
  await request<{ ok: boolean }>("/session/touch", {
    method: "POST",
    body: "{}",
  });
}
export async function releaseOnlineSession() {
  if (demo) return;
  if (backend === "supabase") {
    if (supabase) {
      await supabase.rpc("app_ban_hang_release_session");
      await supabase.auth.signOut({ scope: "local" });
    }
    return;
  }
  if (!accessToken) return;
  try {
    await request<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: "{}",
    });
  } finally {
    accessToken = "";
  }
}

export async function rpc<T>(
  name: "shop_read" | "shop_write",
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const { demoRpc } = await import("./demo");
    return demoRpc<T>(actor, name, payload);
  }
  if (backend === "supabase") {
    if (!supabase) throw new Error("CONFIG_REQUIRED");
    const remoteName =
      name === "shop_read" ? "app_ban_hang_read" : "app_ban_hang_write";
    const { data, error } = await supabase.rpc(remoteName, { payload });
    if (error) throw error;
    return data as T;
  }
  if (name === "shop_read") {
    if (payload.action === "history")
      return request<T>("/query", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    return request<T>("/workspace");
  }
  return request<T>("/mutations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function workspace() {
  const data = await rpc<Workspace>("shop_read");
  if (demo) {
    const { demoOrderExtras } = await import("./demo");
    mergeOrderExtras(data, await demoOrderExtras<OrderExtra[]>(actor));
  }
  if (!demo && backend === "supabase" && data.me.role === "admin") {
    const { data: users, error } = await supabase!.rpc(
      "app_ban_hang_list_users",
    );
    if (error) throw error;
    data.users = users as User[];
  }
  if (!demo && backend === "supabase") {
    const { data: extras, error } = await supabase!.rpc(
      "app_ban_hang_order_extras",
    );
    if (error) throw error;
    mergeOrderExtras(data, extras as OrderExtra[]);
  }
  return data;
}

type OrderExtra = {
  order_id: string;
  customer_address: string;
  customer_type: "retail" | "wholesale";
  paid_amount: string;
  payment_status: "unpaid" | "partial" | "paid";
  payments: Workspace["orders"][number]["payments"];
  items: {
    product_id: string;
    unit_sale_price: string;
    item_kind: "sale" | "gift" | "sample";
    item_note: string;
  }[];
};
function mergeOrderExtras(data: Workspace, extras: OrderExtra[]) {
  const byOrder = new Map(extras.map((extra) => [extra.order_id, extra]));
  for (const order of data.orders) {
    const extra = byOrder.get(order.id);
    if (!extra) continue;
    order.customer_address = extra.customer_address;
    order.customer_type = extra.customer_type;
    order.paid_amount = extra.paid_amount;
    order.outstanding_amount = (
      BigInt(order.total_amount) - BigInt(extra.paid_amount)
    ).toString();
    order.payment_status = extra.payment_status;
    order.payments = extra.payments || [];
    const itemExtras = new Map(
      extra.items.map((item) => [item.product_id, item]),
    );
    for (const item of order.items)
      Object.assign(item, itemExtras.get(item.product_id));
  }
}

export async function saveOrderFeatures(payload: Record<string, unknown>) {
  if (demo) {
    const { demoOrderFeatures } = await import("./demo");
    return demoOrderFeatures<{ id: string }>(actor, {
      action: "save",
      ...payload,
    });
  }
  if (backend === "supabase") {
    const { data, error } = await supabase!.rpc("app_ban_hang_order_features", {
      payload: { action: "save", ...payload },
    });
    if (error) throw error;
    return data as { id: string };
  }
  return request<{ id: string }>("/orders/features", {
    method: "POST",
    body: JSON.stringify({ action: "save", ...payload }),
  });
}

export async function recordPayment(payload: Record<string, unknown>) {
  if (demo) {
    const { demoOrderFeatures } = await import("./demo");
    return demoOrderFeatures<{ id: string }>(actor, {
      action: "payment",
      ...payload,
    });
  }
  if (backend === "supabase") {
    const { data, error } = await supabase!.rpc("app_ban_hang_order_features", {
      payload: { action: "payment", ...payload },
    });
    if (error) throw error;
    return data as { id: string };
  }
  return request<{ id: string }>("/orders/features", {
    method: "POST",
    body: JSON.stringify({ action: "payment", ...payload }),
  });
}

export type SharedLookupItem = {
  id: number | string;
  sku: string;
  name: string;
  glassTypes: string[];
  images: string[];
  matchedModels: string[];
  compatibleModels: string[];
};
export async function lookupSharedProducts(
  query: string,
): Promise<SharedLookupItem[]> {
  const base = String(import.meta.env.VITE_GLASS_LOOKUP_API_URL || "").trim();
  if (!base || query.trim().length < 2) return [];
  const url = new URL(base);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "20");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("LOOKUP_FAILED");
  const body = (await response.json()) as { items?: SharedLookupItem[] };
  return body.items || [];
}

export async function loadReport(
  from: string,
  to: string,
  brand: string,
): Promise<Report> {
  if (demo)
    return rpc<Report>("shop_read", { action: "report", from, to, brand });
  if (backend === "supabase") {
    const { data, error } = await supabase!.rpc("app_ban_hang_report", {
      payload: { from, to, brand },
    });
    if (error) throw error;
    return data as Report;
  }
  return request<Report>("/reports", {
    method: "POST",
    body: JSON.stringify({ from, to, brand }),
  });
}

export const mutate = (payload: Record<string, unknown>) =>
  rpc<{ id: string; return_id?: string }>("shop_write", payload);
export const command = (action: string, data: Record<string, unknown>) => ({
  action,
  key: crypto.randomUUID(),
  ...data,
});

export async function deleteProductRecord(payload: Record<string, unknown>) {
  if (demo) return mutate(payload);
  if (backend === "supabase") {
    const { data, error } = await supabase!.rpc("app_ban_hang_delete_product", {
      payload,
    });
    if (error) throw error;
    return data as { id: string };
  }
  return request<{ id: string }>("/products/delete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function manageStaffAccount(payload: Record<string, unknown>) {
  if (demo) throw new Error("CONFIG_REQUIRED");
  if (backend === "supabase") {
    const { data, error } = await supabase!.rpc("app_ban_hang_manage_staff", {
      payload,
    });
    if (error) throw error;
    return data as { id: string; self?: boolean };
  }
  return request<{ id: string; self?: boolean }>("/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Ảnh phải là JPEG/PNG/WebP, tối đa 5 MB.");
  if (demo) throw new Error("Tải ảnh chỉ dùng được khi kết nối API thật.");
  if (backend === "supabase") {
    const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await supabase!.storage
      .from(productImageBucket)
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  }
  const form = new FormData();
  form.set("image", file);
  const result = await request<{ path: string }>("/images", {
    method: "POST",
    body: form,
  });
  return result.path;
}

export async function loadProductImage(path: string) {
  if (backend === "supabase") {
    const { data, error } = await supabase!.storage
      .from(productImageBucket)
      .download(path);
    if (error) throw error;
    return data;
  }
  if (!accessToken) throw new Error("SESSION_REQUIRED");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(
      endpoint(`/images/${encodeURIComponent(path)}`),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "SESSION_REQUIRED"
          : `HTTP_${response.status}`,
      );
    return response.blob();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function removeImage(path: string) {
  if (demo || !path) return;
  if (backend === "supabase") {
    const { error } = await supabase!.storage
      .from(productImageBucket)
      .remove([path]);
    if (error) throw error;
    return;
  }
  await request<{ ok: boolean }>(`/images/${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

const errors: Record<string, string> = {
  UNAUTHENTICATED: "Vui lòng đăng nhập.",
  INVALID_CREDENTIALS: "Tên đăng nhập hoặc mật khẩu không đúng.",
  ACCOUNT_DISABLED: "Tài khoản đã bị khóa.",
  ACCOUNT_EXISTS: "Tên đăng nhập này đã được sử dụng.",
  ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản nhân viên.",
  SESSION_ALREADY_ACTIVE: "Tài khoản này đang được sử dụng trên một máy khác.",
  SESSION_REPLACED:
    "Phiên đăng nhập đã được chuyển sang máy khác. Vui lòng đăng nhập lại.",
  SESSION_REQUIRED:
    "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  VERSION_CONFLICT: "Dữ liệu vừa thay đổi. Tải lại và kiểm tra trước khi lưu.",
  PRICE_CHANGED:
    "Giá bán đã thay đổi. Lưu lại nháp để xem giá mới trước khi xác nhận.",
  INSUFFICIENT_STOCK: "Không đủ tồn kho. Vui lòng kiểm tra số lượng.",
  PRODUCT_INACTIVE: "Sản phẩm đã ngừng kinh doanh hoặc không tồn tại.",
  INVALID_ORDER_STATE: "Trạng thái đơn đã thay đổi. Vui lòng tải lại.",
  RETURN_EXCEEDS_SOLD: "Số lượng trả vượt số lượng còn được trả.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu đã được sử dụng với nội dung khác.",
  OPENING_EXISTS:
    "Sản phẩm đã có lịch sử kho. Hãy dùng nhập hàng hoặc kiểm kê.",
  SKU_IMMUTABLE: "Mã kính đã có giao dịch, không thể thay đổi.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường.",
  PAYLOAD_TOO_LARGE: "Dữ liệu gửi lên vượt quá giới hạn cho phép.",
  PAYMENT_EXCEEDS_DUE: "Số tiền thu vượt quá số tiền còn phải thanh toán.",
  CONFIG_REQUIRED:
    "Chưa cấu hình backend. Hãy kiểm tra biến môi trường Supabase hoặc API rồi chạy lại ứng dụng.",
  PRODUCT_NOT_FOUND: "Không tìm thấy mã kính.",
  PRODUCT_HAS_STOCK:
    "Mã kính vẫn còn tồn kho. Hãy điều chỉnh tồn về 0 trước khi xóa.",
  PRODUCT_IN_USE:
    "Mã kính đang có trong bản nháp. Hãy xóa bản nháp hoặc bỏ sản phẩm khỏi đơn trước.",
};

export function friendly(e: unknown) {
  const msg =
    (e as { message?: string })?.message ||
    "Không thực hiện được. Vui lòng thử lại.";
  for (const [key, value] of Object.entries(errors))
    if (msg.includes(key)) return value;
  if (/failed to fetch|network|fetch failed|load failed|abort/i.test(msg))
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  if (/rate limit|too many requests/i.test(msg))
    return "Bạn thao tác quá nhanh. Vui lòng chờ một lúc rồi thử lại.";
  if (/unique|duplicate|already exists/i.test(msg))
    return "Mã hoặc dữ liệu này đã tồn tại.";
  if (/password.*characters/i.test(msg))
    return "Mật khẩu chưa đủ độ dài yêu cầu.";
  return "Không thực hiện được. Vui lòng kiểm tra thông tin và thử lại.";
}
