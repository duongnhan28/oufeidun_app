import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ShoppingCart,
  FileText,
  Package,
  BarChart3,
  Users,
  History,
  Search,
  Plus,
  Minus,
  X,
  Pencil,
  Trash2,
  LogOut,
  ShieldCheck,
  LockKeyhole,
  ArrowDownToLine,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  Save,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  ImagePlus,
} from "lucide-react";
import {
  demo,
  workspace,
  mutate,
  command,
  deleteProductRecord,
  friendly,
  setDemoActor,
  rpc,
  loadReport,
  uploadImage,
  removeImage,
  loadProductImage,
  loginOnline,
  manageStaffAccount,
  releaseOnlineSession,
  touchOnlineSession,
  saveOrderFeatures,
  recordPayment,
  lookupSharedProducts,
  type SharedLookupItem,
} from "./data/client";
import {
  type Product,
  type Item,
  type Workspace,
  type Order,
  type Report,
  type User,
  typeLabels,
  statusLabels,
  paymentLabels,
  paymentStatusLabels,
  money,
  amount,
  dateText,
  today,
} from "./types";
import InventoryReport from "./InventoryReport";

type Modal = {
  title: string;
  subtitle?: string;
  body: ReactNode;
  submit?: string;
  danger?: boolean;
  onSubmit?: (data: FormData) => Promise<void>;
};
const actionLabels: Record<string, string> = {
  product: "Cập nhật sản phẩm",
  inventory: "Ghi nhận kho",
  save_draft: "Lưu bản nháp",
  confirm_order: "Xác nhận bán hàng",
  delete_draft: "Xóa bản nháp",
  cancel_order: "Hủy đơn",
  return_order: "Trả hàng",
  exchange: "Tạo đơn đổi hàng",
  glass_brand: "Thêm hãng kính",
  staff_state: "Cập nhật tài khoản",
  "staff.create": "Tạo tài khoản nhân viên",
  "staff.delete": "Xóa tài khoản nhân viên",
  "staff.rename": "Đổi tên đăng nhập nhân viên",
  "staff.password.reset": "Đặt lại mật khẩu nhân viên",
  "admin.profile": "Đổi tên chủ cửa hàng",
  "admin.password.reset": "Đổi mật khẩu chủ cửa hàng",
  "order.item_name.update": "Đổi tên trên đơn",
  "order.features.update": "Cập nhật thông tin đơn hàng",
  "order.payment": "Ghi nhận thanh toán",
};
actionLabels["product.delete"] = "Xóa mã kính";
function auditDetail(log: Workspace["logs"][number], data: Workspace) {
  const detail = log.detail || "";
  const id = detail.match(/^[0-9a-f]{8}-[0-9a-f-]{27}/i)?.[0];
  if (
    [
      "staff.create",
      "staff.password.reset",
      "staff_state",
      "admin.password.reset",
    ].includes(log.action) &&
    id
  ) {
    const user = data.users.find((u) => u.id === id);
    return user
      ? `Tài khoản: ${user.display_name}`
      : "Tài khoản liên quan không còn tồn tại";
  }
  if (
    [
      "save_draft",
      "confirm_order",
      "delete_draft",
      "cancel_order",
      "return_order",
      "exchange",
    ].includes(log.action) &&
    id
  ) {
    const order = data.orders.find((o) => o.id === id);
    return order
      ? `${order.order_no} · ${order.customer_name || "Khách lẻ"}`
      : "Đơn hàng không còn trong danh sách gần đây";
  }
  if (log.action === "order.item_name.update" && id) {
    const order = data.orders.find((o) => o.id === id);
    return `${order?.order_no || "Đơn hàng"}${detail.slice(id.length)}`;
  }
  if (log.action === "inventory")
    return detail
      .replace(/^opening:/, "Tồn đầu kỳ:")
      .replace(/^receipt:/, "Nhập hàng:")
      .replace(/^issue:/, "Xuất kho:")
      .replace(/^damage:/, "Kính lỗi:")
      .replace(/^adjustment:/, "Điều chỉnh tồn:");
  if (id && detail === id) return "Dữ liệu liên quan không còn tồn tại";
  return detail || "Không có ghi chú";
}
function field(
  label: string,
  name: string,
  value: string | number = "",
  type = "text",
  required = true,
  extra: Record<string, unknown> = {},
) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        {...extra}
      />
    </label>
  );
}
function OufeidunMark() {
  return (
    <svg
      className="oufeidun-mark"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Oufeidun"
    >
      <path d="M22 14h26M14 20h33M8 26h35M6 32h34M8 38h35M14 44h33M22 50h26" />
      <path d="M47 17c7 5 11 13 11 21s-4 16-11 21M47 17c-4 3-7 8-8 15 1 7 4 12 8 15" />
    </svg>
  );
}
type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function controlName(control: FormControl) {
  const aria = control.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const label = control.closest("label");
  const text = Array.from(label?.childNodes || [])
    .find((node) => node.nodeType === Node.TEXT_NODE)
    ?.textContent?.trim();
  return text || "thông tin này";
}
function validateForm(form: HTMLFormElement) {
  const controls = Array.from(form.elements).filter(
    (item): item is FormControl =>
      item instanceof HTMLInputElement ||
      item instanceof HTMLSelectElement ||
      item instanceof HTMLTextAreaElement,
  );
  for (const control of controls) {
    control.removeAttribute("aria-invalid");
    if (control.disabled || control.validity.valid) continue;
    const name = controlName(control);
    let message = `${name} chưa hợp lệ. Vui lòng kiểm tra lại.`;
    if (control.validity.valueMissing)
      message =
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? `Vui lòng xác nhận: ${name}.`
          : `Vui lòng nhập ${name.toLocaleLowerCase("vi")}.`;
    else if (
      control.validity.tooShort &&
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement)
    )
      message = `${name} phải có ít nhất ${control.minLength} ký tự.`;
    else if (
      control.validity.tooLong &&
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement)
    )
      message = `${name} không được vượt quá ${control.maxLength} ký tự.`;
    else if (
      control.validity.typeMismatch &&
      control instanceof HTMLInputElement &&
      control.type === "email"
    )
      message = "Email không đúng định dạng. Ví dụ: ten@congty.vn.";
    else if (
      control.validity.rangeUnderflow &&
      control instanceof HTMLInputElement
    )
      message = `${name} phải lớn hơn hoặc bằng ${control.min}.`;
    else if (
      control.validity.rangeOverflow &&
      control instanceof HTMLInputElement
    )
      message = `${name} phải nhỏ hơn hoặc bằng ${control.max}.`;
    else if (control.validity.badInput)
      message = `${name} phải là một số hợp lệ.`;
    else if (control.validity.stepMismatch)
      message = `${name} không đúng bước giá trị cho phép.`;
    control.setAttribute("aria-invalid", "true");
    control.focus();
    return message;
  }
  return "";
}
function ProductArt({
  product,
  small = false,
}: {
  product: Product;
  small?: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let live = true,
      objectUrl = "";
    setUrl("");
    if (product.image_path && !demo)
      loadProductImage(product.image_path)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (live) setUrl(objectUrl);
        })
        .catch(() => {
          if (live) setUrl("");
        });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [product.image_path]);
  return (
    <div
      className={`product-art ${small ? "small" : ""} ${product.glass_type === "privacy" ? "privacy" : ""}`}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" onError={() => setUrl("")} />
      ) : (
        <>
          <div className="pack">
            <span className="hanger" />
            <span className="pack-logo">9H</span>
            <strong>
              {product.glass_type === "privacy" ? "PRIVACY" : "GLASS"}
            </strong>
            <small>TEMPERED GLASS</small>
            <i />
            <span className="pack-foot">SCREEN PROTECTOR</span>
          </div>
          <div className="glass">
            <span />
          </div>
        </>
      )}
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<Workspace | null>(null),
    [page, setPage] = useState("sale"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [brand, setBrand] = useState("all");
  const [glassBrand, setGlassBrand] = useState("all"),
    [reportBrand, setReportBrand] = useState("all");
  const [orderFrom, setOrderFrom] = useState(""),
    [orderTo, setOrderTo] = useState("");
  const [cart, setCart] = useState<Item[]>([]),
    [draft, setDraft] = useState<Order | null>(null),
    [customer, setCustomer] = useState(""),
    [phone, setPhone] = useState(""),
    [address, setAddress] = useState(""),
    [customerType, setCustomerType] = useState<"retail" | "wholesale">(
      "retail",
    ),
    [note, setNote] = useState(""),
    [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null),
    [orderFilter, setOrderFilter] = useState("all"),
    [from, setFrom] = useState(today()),
    [to, setTo] = useState(today()),
    [report, setReport] = useState<Report | null>(null),
    [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(() =>
      Boolean(localStorage.getItem("app-ban-hang-login-name")),
    ),
    [savedLogin, setSavedLogin] = useState(
      () => localStorage.getItem("app-ban-hang-login-name") || "",
    );
  const pending = useRef<{
    signature: string;
    payload: Record<string, unknown>;
  } | null>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.querySelector<HTMLElement>('[role="dialog"]');
    const list = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) || [],
      );
    list()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = list();
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  const admin = data?.me.role === "admin";
  const refresh = useCallback(async () => {
    const d = await workspace();
    setData(d);
    return d;
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (demo || !data) return;
    const timer = setInterval(() => {
      void touchOnlineSession().catch((e) => {
        setError(friendly(e));
        setData(null);
      });
    }, 25000);
    return () => clearInterval(timer);
  }, [!!data]);
  useEffect(() => {
    const stop = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [dirty]);
  useEffect(() => {
    if (!data) return;
    const focus = () => {
      refresh().catch((e) => {
        setError(friendly(e));
        if (String((e as Error).message).includes("ACCOUNT_DISABLED"))
          setData(null);
      });
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [!!data, refresh]);
  useEffect(() => {
    if (page !== "reports" || !admin) return;
    let live = true;
    setReport(null);
    loadReport(from, to, reportBrand)
      .then((r) => {
        if (live) setReport(r);
      })
      .catch((e) => {
        if (live) setError(friendly(e));
      });
    return () => {
      live = false;
    };
  }, [page, from, to, reportBrand, data, admin]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  async function write(action: string, values: Record<string, unknown>) {
    const signature = JSON.stringify({ action, ...values });
    if (pending.current?.signature !== signature)
      pending.current = { signature, payload: command(action, values) };
    const result = await mutate(pending.current.payload);
    const d = await refresh();
    pending.current = null;
    return { result, data: d };
  }
  function clearCart() {
    setCart([]);
    setDraft(null);
    setCustomer("");
    setPhone("");
    setAddress("");
    setCustomerType("retail");
    setNote("");
    setDirty(false);
  }
  function openDraft(o: Order) {
    setDraft(o);
    setCart(
      o.items.map((i) => ({
        ...i,
        item_kind: i.item_kind || "sale",
        item_note: i.item_note || "",
      })),
    );
    setCustomer(o.customer_name);
    setPhone(o.customer_phone);
    setAddress(o.customer_address || "");
    setCustomerType(o.customer_type || "retail");
    setNote(o.note);
    setDirty(false);
    setPage("sale");
    setModal(null);
  }
  function abandon(next: () => void) {
    if (!dirty) {
      next();
      return;
    }
    setModal({
      title: "Đơn đang soạn chưa được lưu",
      subtitle: "Lưu bản nháp trước khi rời để giữ thay đổi.",
      body: (
        <div className="stack">
          <button
            type="button"
            className="primary"
            onClick={() =>
              run(async () => {
                await save();
                setModal(null);
                next();
              })
            }
          >
            Lưu nháp và tiếp tục
          </button>
          <button
            type="button"
            className="danger-outline"
            onClick={() => {
              clearCart();
              setModal(null);
              next();
            }}
          >
            Bỏ thay đổi
          </button>
        </div>
      ),
    });
  }
  async function save() {
    if (!cart.length) throw new Error("Vui lòng chọn ít nhất một mã kính.");
    const { result } = await write("save_draft", {
      id: draft?.id || null,
      version: draft?.version,
      items: cart.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        custom_name: i.custom_name,
      })),
      customer_name: customer,
      customer_phone: phone,
      note,
    });
    await saveOrderFeatures({
      order_id: result.id,
      customer_address: address,
      customer_type: customerType,
      items: cart.map((i) => ({
        product_id: i.product_id,
        unit_sale_price: i.unit_sale_price || "0",
        item_kind: i.item_kind || "sale",
        item_note: i.item_note || "",
      })),
    });
    const d = await refresh();
    const o = d.orders.find((o) => o.id === result.id)!;
    setDraft(o);
    setCart(o.items);
    setDirty(false);
    return o;
  }
  function add(p: Product) {
    if (busy) return;
    setCart((old) => {
      const found = old.find((i) => i.product_id === p.id);
      return found
        ? old.map((i) =>
            i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...old,
            {
              product_id: p.id,
              quantity: 1,
              custom_name: null,
              unit_sale_price: p.sale_price,
              quoted_price_version: p.price_version,
              item_kind: "sale",
              item_note: "",
            },
          ];
    });
    setDirty(true);
  }
  function changeQty(id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000)
      return;
    setCart((c) =>
      c.map((i) => (i.product_id === id ? { ...i, quantity } : i)),
    );
    setDirty(true);
  }
  function editLine(i: Item, p: Product) {
    setModal({
      title: "Tùy chỉnh sản phẩm trên đơn",
      subtitle: "Giá, tên và ghi chú chỉ áp dụng cho đơn đang lập.",
      body: (
        <div className="form-grid">
          {field(
            "Tên hiển thị",
            "name",
            i.custom_name ?? p.name,
            "text",
            true,
            { maxLength: 200 },
          )}
          {field(
            "Đơn giá bán (đ)",
            "unit_sale_price",
            i.unit_sale_price || p.sale_price,
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1 },
          )}
          <label className="field">
            Loại hàng
            <select name="item_kind" defaultValue={i.item_kind || "sale"}>
              <option value="sale">Hàng bán</option>
              <option value="gift">Hàng tặng</option>
              <option value="sample">Hàng mẫu</option>
            </select>
          </label>
          {field(
            "Ghi chú sản phẩm / máy dùng chung",
            "item_note",
            i.item_note || "",
            "text",
            false,
            {
              maxLength: 500,
              placeholder: "Ví dụ: dùng chung iPhone 15 / iPhone 16",
            },
          )}
          <div className="hint full">
            Mã kính: <b>{p.sku}</b>. Hàng tặng và hàng mẫu vẫn trừ tồn nhưng
            thành tiền bằng 0đ.
          </div>
        </div>
      ),
      submit: "Áp dụng",
      onSubmit: async (fd) => {
        const name = String(fd.get("name")).trim(),
          kind = String(fd.get("item_kind")) as Item["item_kind"];
        if (!name) throw new Error("Tên không được để trống.");
        setCart((c) =>
          c.map((x) =>
            x.product_id === p.id
              ? {
                  ...x,
                  custom_name: name === p.name ? null : name,
                  item_kind: kind,
                  item_note: String(fd.get("item_note") || "").trim(),
                  unit_sale_price:
                    kind === "sale" ? String(fd.get("unit_sale_price")) : "0",
                }
              : x,
          ),
        );
        setDirty(true);
      },
    });
  }
  function rename(i: Item, p: Product) {
    editLine(i, p);
  }
  async function prepareConfirm() {
    const o = await save();
    setModal({
      title: "Xác nhận bán hàng",
      subtitle:
        "Xác nhận sẽ trừ tồn kho. Có thể ghi nhận chưa trả, trả một phần hoặc toàn bộ.",
      body: (
        <>
          <div className="confirm-total">
            <span>{o.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm</span>
            <strong>{money(o.total_amount)}</strong>
          </div>
          <label className="field">
            Hình thức thanh toán của đơn
            <select name="payment_method">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="cod">COD</option>
              <option value="cod_transfer">COD + chuyển khoản</option>
              <option value="cash_transfer">Tiền mặt + chuyển khoản</option>
            </select>
          </label>
          {field(
            "Số tiền khách trả ngay (đ)",
            "paid_amount",
            o.total_amount,
            "number",
            true,
            { min: 0, max: o.total_amount, step: 1 },
          )}
          <label className="field">
            Kênh nhận khoản này
            <select name="payment_channel">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="cod">COD</option>
            </select>
          </label>
          <p className="hint">
            Nhập 0đ nếu đã đi đơn nhưng khách chưa thanh toán. Có thể thu thêm
            nhiều đợt trong chi tiết đơn.
          </p>
        </>
      ),
      submit: "Xác nhận và trừ kho",
      onSubmit: async (fd) => {
        await write("confirm_order", {
          id: o.id,
          version: o.version,
          payment_method: fd.get("payment_method"),
        });
        const paid = String(fd.get("paid_amount") || "0");
        if (BigInt(paid) > 0n)
          await recordPayment({
            order_id: o.id,
            amount: paid,
            method: fd.get("payment_channel"),
            note: "Thanh toán khi xác nhận đơn",
          });
        await refresh();
        clearCart();
        setToast("Đã xác nhận đơn và cập nhật tình trạng thanh toán.");
      },
    });
  }
  function manageGlassBrands() {
    setModal({
      title: "Hãng kính",
      subtitle:
        "Thương hiệu kính được quản lý riêng với hãng điện thoại tương thích.",
      body: (
        <>
          <div className="brand-list">
            {data!.glass_brands.length ? (
              data!.glass_brands.map((b) => (
                <span className="badge teal" key={b.id}>
                  {b.name}
                </span>
              ))
            ) : (
              <p className="hint">
                Chưa có hãng kính. Thêm hãng đầu tiên bên dưới.
              </p>
            )}
          </div>
          {field("Tên hãng kính mới", "name", "", "text", true, {
            maxLength: 100,
          })}
        </>
      ),
      submit: "Thêm hãng kính",
      onSubmit: async (fd) => {
        await write("glass_brand", { name: String(fd.get("name")).trim() });
        setToast("Đã thêm hãng kính. Có thể chọn hãng khi thêm/sửa sản phẩm.");
      },
    });
  }
  function editProduct(p?: Product) {
    setModal({
      title: p ? "Chỉnh sửa mã kính" : "Thêm mã kính",
      subtitle: "Giá vốn cố định không tự thay đổi khi nhập thêm hàng.",
      body: (
        <div className="form-grid">
          {field("Mã kính", "sku", p?.sku, "text", true, { maxLength: 50 })}
          {field("Tên sản phẩm", "name", p?.name, "text", true, {
            maxLength: 200,
          })}
          <label className="field">
            Loại kính
            <select name="glass_type" defaultValue={p?.glass_type || "clear"}>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {field("Hãng điện thoại", "brand", p?.brand || "")}
          <label className="field">
            Hãng kính
            <select
              aria-label="Hãng kính"
              name="glass_brand_id"
              defaultValue={p?.glass_brand_id || ""}
            >
              <option value="">Chưa phân loại</option>
              {data!.glass_brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <small>
              Thêm hãng mới bằng nút “Hãng kính” trên trang Kho kính.
            </small>
          </label>
          {field(
            "Giá bán (đ)",
            "sale_price",
            p?.sale_price || "0",
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1 },
          )}
          {field(
            "Giá vốn cố định (đ)",
            "fixed_cost",
            p?.fixed_cost || "0",
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1 },
          )}
          <label className="field full">
            Dòng máy tương thích · mỗi dòng một tên
            <textarea
              name="models"
              defaultValue={p?.models.join("\n")}
              rows={3}
            />
          </label>
          <label className="field full">
            Ảnh sản phẩm · tối đa 5 MB
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              disabled={demo}
            />
            {demo && (
              <small>Tải ảnh sử dụng Supabase; bản mẫu có hình minh họa.</small>
            )}
          </label>
          <label className="check full">
            <input
              name="active"
              type="checkbox"
              defaultChecked={p?.active ?? true}
            />{" "}
            Đang kinh doanh
          </label>
          <label className="check full">
            <input type="checkbox" name="zero_confirm" /> Tôi xác nhận nếu giá
            bán hoặc giá vốn bằng 0đ
          </label>
        </div>
      ),
      submit: "Lưu sản phẩm",
      onSubmit: async (fd) => {
        if (
          (fd.get("sale_price") === "0" || fd.get("fixed_cost") === "0") &&
          !fd.has("zero_confirm")
        )
          throw new Error("Vui lòng xác nhận giá 0đ.");
        let imagePath = p?.image_path || null;
        let uploaded = "";
        const file = fd.get("image");
        if (file instanceof File && file.size) {
          uploaded = await uploadImage(file);
          imagePath = uploaded;
        }
        try {
          await write("product", {
            id: p?.id || null,
            version: p?.version,
            sku: fd.get("sku"),
            name: fd.get("name"),
            brand: fd.get("brand"),
            glass_brand_id: fd.get("glass_brand_id") || null,
            glass_type: fd.get("glass_type"),
            sale_price: fd.get("sale_price"),
            fixed_cost: fd.get("fixed_cost"),
            models: String(fd.get("models"))
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            active: fd.has("active"),
            image_path: imagePath,
          });
        } catch (e) {
          if (uploaded) await removeImage(uploaded);
          throw e;
        }
        setToast("Đã lưu sản phẩm.");
      },
    });
  }
  function deleteProduct(p: Product) {
    setModal({
      title: "Xóa mã kính?",
      subtitle:
        "Mã kính sẽ biến mất khỏi bán hàng và kho, nhưng lịch sử đã phát sinh vẫn được giữ để đối chiếu.",
      body: (
        <>
          {p.on_hand > 0 ? (
            <div className="error">
              Mã <b>{p.sku}</b> vẫn còn {p.on_hand} miếng. Hãy điều chỉnh tồn
              kho về 0 trước khi xóa.
            </div>
          ) : (
            <p>
              Bạn có chắc muốn xóa{" "}
              <b>
                {p.sku} — {p.name}
              </b>
              ? Thao tác này không thể hoàn tác trong ứng dụng.
            </p>
          )}
        </>
      ),
      submit: p.on_hand === 0 ? "Xóa mã kính" : undefined,
      danger: true,
      onSubmit: async () => {
        await deleteProductRecord(
          command("delete_product", { id: p.id, version: p.version }),
        );
        if (p.image_path) await removeImage(p.image_path);
        await refresh();
        setToast(`Đã xóa mã kính ${p.sku}.`);
      },
    });
  }
  function inventory(kind: string, p?: Product) {
    const titles: Record<string, string> = {
      receipt: "Nhập hàng",
      opening: "Tồn đầu kỳ",
      issue: "Xuất kho",
      damage: "Ghi nhận kính lỗi",
      adjustment: "Kiểm kê tồn kho",
    };
    const balances = new Map(
      data!.products.map((p) => [p.id, p.stock_version]),
    );
    setModal({
      title: titles[kind],
      subtitle:
        kind === "receipt"
          ? "Giá mua trên phiếu không thay đổi giá vốn cố định."
          : "Thao tác được ghi vào lịch sử kho.",
      body: (
        <>
          <label className="field">
            Mã kính
            <select name="product_id" defaultValue={p?.id}>
              {data!.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (tồn {p.on_hand})
                </option>
              ))}
            </select>
          </label>
          {field(
            kind === "adjustment" ? "Số lượng thực đếm" : "Số lượng (miếng)",
            "quantity",
            kind === "adjustment" ? p?.on_hand || 0 : 1,
            "number",
            true,
            { min: kind === "adjustment" ? 0 : 1, max: 1000000, step: 1 },
          )}
          {kind === "receipt" &&
            field(
              "Đơn giá mua thực tế (đ)",
              "purchase_price",
              "",
              "number",
              true,
              { min: 0, step: 1 },
            )}
          {field(
            "Lý do / ghi chú",
            "reason",
            kind === "receipt" ? "Nhập hàng" : "",
            "text",
            true,
            { maxLength: 1000 },
          )}
        </>
      ),
      submit: "Xác nhận ghi kho",
      onSubmit: async (fd) => {
        const id = String(fd.get("product_id"));
        await write("inventory", {
          type: kind,
          reason: fd.get("reason"),
          items: [
            {
              product_id: id,
              quantity: Number(fd.get("quantity")),
              stock_version: balances.get(id),
              ...(kind === "receipt"
                ? { purchase_price: fd.get("purchase_price") }
                : {}),
            },
          ],
        });
        setToast("Đã cập nhật kho.");
      },
    });
  }
  function addOrderPayment(o: Order) {
    const due = BigInt(o.outstanding_amount ?? o.total_amount);
    setModal({
      title: `Thu tiền · ${o.order_no}`,
      subtitle: `Còn phải thu ${money(due)}`,
      body: (
        <>
          {field("Số tiền nhận (đ)", "amount", due.toString(), "number", true, {
            min: 1,
            max: due.toString(),
            step: 1,
          })}
          <label className="field">
            Phương thức
            <select name="method">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="cod">COD</option>
              <option value="cod_transfer">COD + chuyển khoản</option>
              <option value="cash_transfer">Tiền mặt + chuyển khoản</option>
            </select>
          </label>
          {field("Ghi chú đợt thanh toán", "note", "", "text", false, {
            maxLength: 500,
            placeholder: "Ví dụ: Đợt 2, khách chuyển khoản",
          })}
        </>
      ),
      submit: "Ghi nhận thanh toán",
      onSubmit: async (fd) => {
        await recordPayment({
          order_id: o.id,
          amount: fd.get("amount"),
          method: fd.get("method"),
          note: fd.get("note"),
        });
        await refresh();
        setToast("Đã cập nhật công nợ đơn hàng.");
      },
    });
  }
  function showBill(o: Order) {
    setModal({
      title: `Bill ${o.order_no}`,
      subtitle: "Bản in gọn tự dàn trang, không cắt danh sách sản phẩm.",
      body: <OrderBill order={o} products={data!.products} />,
    });
  }
  function showOrder(o: Order) {
    const due = BigInt(o.outstanding_amount ?? o.total_amount);
    setModal({
      title: o.order_no,
      subtitle: `${statusLabels[o.status]} · ${o.creator_name} · ${dateText(o.created_at)}`,
      body: (
        <>
          <p>
            <b>{o.customer_name || "Khách lẻ"}</b>
            {o.customer_phone && ` · ${o.customer_phone}`}
            {o.customer_address && (
              <small className="block-note">{o.customer_address}</small>
            )}
          </p>
          <div className="payment-summary">
            <span
              className={`badge ${o.payment_status === "paid" ? "teal" : o.payment_status === "partial" ? "amber" : "red"}`}
            >
              {paymentStatusLabels[o.payment_status || "unpaid"]}
            </span>
            <b>
              Đã thu {money(o.paid_amount || 0)} · Còn {money(due)}
            </b>
          </div>
          <div className="detail-lines">
            {o.items.map((i) => {
              const p = data!.products.find((p) => p.id === i.product_id);
              return (
                <div key={i.id}>
                  <span>
                    <b>{i.product_name_snapshot || i.custom_name || p?.name}</b>
                    <small>
                      {i.sku_snapshot || p?.sku} · {i.quantity} miếng
                      {i.item_kind && i.item_kind !== "sale"
                        ? ` · ${i.item_kind === "gift" ? "Hàng tặng" : "Hàng mẫu"}`
                        : ""}
                      {i.item_note && ` · ${i.item_note}`}
                    </small>
                  </span>
                  <strong>
                    {money(BigInt(i.unit_sale_price || 0) * BigInt(i.quantity))}
                  </strong>
                </div>
              );
            })}
          </div>
          <div className="confirm-total">
            <span>Tổng đơn</span>
            <strong>{money(o.total_amount)}</strong>
          </div>
          {o.payments?.map((p) => (
            <div className="return-row" key={p.id}>
              <span>
                {paymentLabels[p.method]} · {dateText(p.paid_at)}
                <small>{p.note || p.actor_name}</small>
              </span>
              <b>{money(p.amount)}</b>
            </div>
          ))}
          {o.returns?.map((record) => (
            <div className="return-row" key={record.id}>
              <span>
                {record.return_no} · {dateText(record.posted_at)}
                <small>{record.reason}</small>
              </span>
              <b>Hoàn {money(record.refund_amount)}</b>
            </div>
          ))}
          {o.note && <p className="hint">{o.note}</p>}
          <div className="actions">
            <button type="button" onClick={() => showBill(o)}>
              In / lưu PDF
            </button>
            {o.status !== "draft" && due > 0n && (
              <button
                type="button"
                className="primary"
                onClick={() => addOrderPayment(o)}
              >
                Thu thêm
              </button>
            )}
            {o.status === "draft" ? (
              <>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    abandon(() => openDraft(o));
                  }}
                >
                  Mở bản nháp
                </button>
                <button
                  type="button"
                  className="danger-outline"
                  onClick={() =>
                    setModal({
                      title: "Xóa bản nháp?",
                      body: (
                        <p>
                          {o.order_no} sẽ được xóa khỏi danh sách. Tồn kho không
                          thay đổi.
                        </p>
                      ),
                      submit: "Xóa nháp",
                      danger: true,
                      onSubmit: async () => {
                        await write("delete_draft", {
                          id: o.id,
                          version: o.version,
                        });
                        if (draft?.id === o.id) clearCart();
                      },
                    })
                  }
                >
                  Xóa nháp
                </button>
              </>
            ) : (
              admin &&
              ["confirmed", "partially_returned"].includes(o.status) && (
                <>
                  <button type="button" onClick={() => returnOrder(o)}>
                    Trả / đổi hàng
                  </button>
                  {o.status === "confirmed" && (
                    <button
                      type="button"
                      className="danger-outline"
                      onClick={() => cancelOrder(o)}
                    >
                      Hủy toàn bộ
                    </button>
                  )}
                </>
              )
            )}
          </div>
        </>
      ),
    });
  }
  function cancelOrder(o: Order) {
    setModal({
      title: `Hủy ${o.order_no}`,
      subtitle:
        "Chỉ dùng khi toàn bộ hàng được hoàn lại và còn bán được. Nếu có kính lỗi hoặc trả một phần, dùng Trả hàng.",
      body: (
        <>
          {field("Lý do", "reason", "", "text", true, { maxLength: 1000 })}
          <label className="field">
            Hoàn tiền
            <select name="refund_method">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" required /> Đã nhận đủ hàng bán được và hoàn{" "}
            {money(o.total_amount)} cho khách
          </label>
        </>
      ),
      submit: "Hủy và hoàn kho",
      danger: true,
      onSubmit: async (fd) => {
        await write("cancel_order", {
          id: o.id,
          reason: fd.get("reason"),
          refund_method: fd.get("refund_method"),
        });
        setToast("Đã hủy đơn và hoàn kho.");
      },
    });
  }
  function returnOrder(o: Order) {
    setModal({
      title: `Trả hàng · ${o.order_no}`,
      subtitle:
        "Tiền hoàn tính theo giá bán gốc. Chỉ số miếng bán lại được mới cộng vào kho.",
      body: (
        <>
          <div className="return-grid">
            <b>Sản phẩm</b>
            <b>Trả</b>
            <b>Bán lại được</b>
            {o.items
              .filter((i) => i.quantity > (i.returned_quantity || 0))
              .map((i) => (
                <div className="return-input" key={i.id}>
                  <span>
                    {i.product_name_snapshot}
                    <small>
                      {i.sku_snapshot} · còn trả được{" "}
                      {i.quantity - (i.returned_quantity || 0)}
                    </small>
                  </span>
                  <input
                    aria-label={`Trả ${i.sku_snapshot}`}
                    name={`qty_${i.id}`}
                    type="number"
                    min={0}
                    max={i.quantity - (i.returned_quantity || 0)}
                    defaultValue={0}
                  />
                  <input
                    aria-label={`Nhập lại ${i.sku_snapshot}`}
                    name={`stock_${i.id}`}
                    type="number"
                    min={0}
                    max={i.quantity - (i.returned_quantity || 0)}
                    defaultValue={0}
                  />
                </div>
              ))}
          </div>
          {field("Lý do trả hàng", "reason", "", "text", true, {
            maxLength: 1000,
          })}
          <label className="field">
            Phương thức hoàn tiền
            <select name="refund_method">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </label>
          <p className="hint">
            Đổi hàng: sau khi ghi phiếu trả, mở lại đơn và chọn “Tạo đơn đổi”.
            Hai giao dịch độc lập.
          </p>
          <label className="check">
            <input type="checkbox" required /> Đã kiểm tra hàng và hoàn tiền
            theo giá bán gốc
          </label>
        </>
      ),
      submit: "Ghi nhận trả hàng",
      onSubmit: async (fd) => {
        const items = o.items
          .map((i) => ({
            order_item_id: i.id,
            quantity: Number(fd.get(`qty_${i.id}`) || 0),
            restock_quantity: Number(fd.get(`stock_${i.id}`) || 0),
          }))
          .filter((i) => i.quantity > 0);
        if (!items.length)
          throw new Error("Chọn số lượng trả ít nhất một sản phẩm.");
        await write("return_order", {
          id: o.id,
          reason: fd.get("reason"),
          refund_method: fd.get("refund_method"),
          items,
        });
        setToast("Đã ghi nhận phiếu trả.");
      },
    });
  }
  function manageStaff(id?: string) {
    const self = Boolean(id && id === data?.me.id);
    setModal({
      title: self
        ? "Đổi mật khẩu chủ cửa hàng"
        : id
          ? "Đặt lại mật khẩu"
          : "Thêm nhân viên",
      subtitle: demo
        ? "Quản trị tài khoản chỉ dùng được khi kết nối API thật."
        : self
          ? "Sau khi đổi mật khẩu, chủ cửa hàng cần đăng nhập lại."
          : "Tên nhân viên dùng để hiển thị; tên đăng nhập dùng khi vào ứng dụng. Mật khẩu không được lưu vào lịch sử.",
      body: (
        <>
          {!id && (
            <>
              {field("Tên nhân viên", "display_name", "", "text", true, {
                maxLength: 100,
                placeholder: "Ví dụ: Nguyễn An",
                autoComplete: "off",
              })}
              {field("Tên đăng nhập", "login_name", "", "text", true, {
                minLength: 3,
                maxLength: 50,
                placeholder: "Ví dụ: nguyennan",
                autoComplete: "off",
                autoCapitalize: "none",
                spellCheck: false,
              })}
            </>
          )}
          {field(
            "Mật khẩu mới (ít nhất 12 ký tự)",
            "password",
            "",
            "password",
            true,
            {
              minLength: 12,
              autoComplete: "new-password",
              placeholder: self
                ? "Nhập mật khẩu mới"
                : "Nhập mật khẩu cho nhân viên",
            },
          )}
        </>
      ),
      submit: self ? "Đổi mật khẩu" : "Lưu tài khoản",
      onSubmit: async (fd) => {
        const payload = id
          ? { action: "reset", id, password: fd.get("password") }
          : {
              action: "create",
              display_name: fd.get("display_name"),
              login_name: fd.get("login_name"),
              password: fd.get("password"),
            };
        await manageStaffAccount(payload);
        if (self) {
          setData(null);
          setToast("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
          return;
        }
        await refresh();
        setToast("Đã cập nhật tài khoản.");
      },
    });
  }
  function editUserName(user: User) {
    setModal({
      title:
        user.role === "admin" ? "Đổi tên chủ cửa hàng" : "Sửa tên nhân viên",
      subtitle:
        user.role === "admin"
          ? "Tên đăng nhập vẫn là admin và quyền quản trị không thay đổi."
          : "Thay đổi tên hiển thị không làm đổi tên đăng nhập.",
      body: field(
        user.role === "admin" ? "Tên chủ cửa hàng" : "Tên nhân viên",
        "display_name",
        user.display_name,
        "text",
        true,
        { maxLength: 100 },
      ),
      submit: "Lưu tên",
      onSubmit: async (fd) => {
        if (user.role === "admin") {
          await manageStaffAccount({
            action: "profile",
            display_name: fd.get("display_name"),
          });
          await refresh();
          setToast("Đã đổi tên chủ cửa hàng.");
        } else
          await write("staff_state", {
            id: user.id,
            display_name: fd.get("display_name"),
          });
      },
    });
  }
  function deleteStaff(user: User) {
    setModal({
      title: "Xóa tài khoản nhân viên?",
      subtitle: "Thao tác này thu hồi vĩnh viễn quyền đăng nhập.",
      body: (
        <p>
          Tài khoản <b>{user.display_name}</b> sẽ bị xóa khỏi danh sách nhân
          viên. Đơn hàng và lịch sử thao tác cũ vẫn được giữ nguyên để đối
          chiếu.
        </p>
      ),
      submit: "Xóa tài khoản",
      danger: true,
      onSubmit: async () => {
        await manageStaffAccount({ action: "delete", id: user.id });
        await refresh();
        setToast(`Đã xóa tài khoản ${user.display_name}.`);
      },
    });
  }
  async function loginDemo(id: string) {
    await run(async () => {
      setDemoActor(id);
      await refresh();
      setPage("sale");
    });
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = validateForm(e.currentTarget);
    if (message) {
      setError(message);
      return;
    }
    const fd = new FormData(e.currentTarget);
    await run(async () => {
      const username = String(fd.get("username")).trim();
      await loginOnline(username, String(fd.get("password")));
      try {
        await refresh();
        if (rememberLogin) {
          localStorage.setItem("app-ban-hang-login-name", username);
          setSavedLogin(username);
        } else {
          localStorage.removeItem("app-ban-hang-login-name");
          setSavedLogin("");
        }
      } catch (e) {
        await releaseOnlineSession();
        throw e;
      }
    });
  }
  async function logout() {
    await releaseOnlineSession();
    clearCart();
    setData(null);
    setModal(null);
    setReport(null);
    setError("");
  }
  const products =
    data?.products.filter(
      (p) =>
        (page === "stock" || p.active) &&
        (filter === "all" || p.glass_type === filter) &&
        (brand === "all" || p.brand === brand) &&
        (glassBrand === "all" || p.glass_brand_id === glassBrand) &&
        `${p.sku} ${p.name} ${p.models.join(" ")}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi").replace(/^ip\s+/, "iphone ")),
    ) || [];
  const nav = admin
    ? ([
        ["sale", "Bán hàng", ShoppingCart],
        ["lookup", "Mã dùng chung", Search],
        ["orders", "Đơn hàng", FileText],
        ["stock", "Kho kính", Package],
        ["reports", "Báo cáo", BarChart3],
        ["users", "Nhân viên", Users],
        ["audit", "Lịch sử thao tác", History],
      ] as const)
    : ([
        ["sale", "Bán hàng", ShoppingCart],
        ["lookup", "Mã dùng chung", Search],
        ["drafts", "Đơn nháp", FileText],
        ["orders", "Đơn đã bán", History],
        ["stock", "Tra cứu kính", Search],
      ] as const);
  const navigate = (next: string) => {
    setPage(next);
    setQuery("");
    setFilter("all");
    setBrand("all");
    setGlassBrand("all");
    setError("");
  };
  const title = nav.find((n) => n[0] === page)?.[1] || "Bán hàng";
  const subtitles: Record<string, string> = {
    sale: "Chọn kính và lưu đơn nháp trước khi chốt bán",
    lookup: "Tra mã kính và xem toàn bộ dòng máy dùng chung",
    stock: "Quản lý mã kính, giá bán và số lượng tồn",
    orders: "Theo dõi đơn hàng và lịch sử bán",
    drafts: "Tiếp tục xử lý những đơn khách chưa chốt",
    reports: "Theo dõi kết quả bán hàng theo khoảng thời gian",
    users: "Mỗi nhân viên một tài khoản, đúng quyền thao tác",
    audit: "Mọi thay đổi quan trọng đều có thể đối chiếu",
  };
  const searchBar = (
    <div className="search-tools">
      <label className="search">
        <Search size={20} />
        <input
          aria-label="Tìm mã kính hoặc dòng điện thoại"
          placeholder="Tìm mã kính hoặc dòng điện thoại..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">
            <X size={16} />
          </button>
        )}
      </label>
      {page === "stock" && (
        <select
          aria-label="Lọc loại kính"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả loại kính</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Lọc hãng kính"
        value={glassBrand}
        onChange={(e) => setGlassBrand(e.target.value)}
      >
        <option value="all">Tất cả hãng kính</option>
        {data?.glass_brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Lọc hãng điện thoại"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      >
        <option value="all">Hãng điện thoại</option>
        {[...new Set(data?.products.map((p) => p.brand))].map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>
      {page === "sale" && (
        <button
          onClick={() =>
            setModal({
              title: "Thông tin khách hàng",
              subtitle:
                "Địa chỉ dùng trên bill; loại khách giúp nhận biết đơn sỉ.",
              body: (
                <>
                  <label className="field">
                    Loại khách
                    <select name="customer_type" defaultValue={customerType}>
                      <option value="retail">Khách lẻ</option>
                      <option value="wholesale">Khách sỉ</option>
                    </select>
                  </label>
                  <label className="field">
                    Địa chỉ giao hàng
                    <textarea
                      name="address"
                      defaultValue={address}
                      maxLength={500}
                      rows={3}
                    />
                  </label>
                </>
              ),
              submit: "Áp dụng",
              onSubmit: async (fd) => {
                setCustomerType(
                  String(fd.get("customer_type")) as "retail" | "wholesale",
                );
                setAddress(String(fd.get("address") || "").trim());
                setDirty(true);
              },
            })
          }
        >
          Khách {customerType === "wholesale" ? "sỉ" : "lẻ"}
          {address ? " · Có địa chỉ" : ""}
        </button>
      )}
    </div>
  );
  return (
    <>
      {!data ? (
        <div className="login-shell">
          <div
            className="login-artwork"
            role="img"
            aria-label="Kính cường lực Oufeidun với các lớp bảo vệ"
          />
          <div className="login-card">
            <div className="login-brand">
              <OufeidunMark />
              <b>Oufeidun</b>
            </div>
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập để bắt đầu ca bán hàng.</p>
            {demo ? (
              <>
                <div className="demo-note">
                  <b>BẢN CHẠY THỬ · DỮ LIỆU MẪU</b>
                  <p>
                    Dùng thử giao diện và nghiệp vụ. Chưa kết nối dữ liệu cửa
                    hàng; phân quyền tại máy này chỉ để mô phỏng.
                  </p>
                </div>
                {[
                  [
                    "10000000-0000-4000-8000-000000000001",
                    "Chủ cửa hàng",
                    "Admin · toàn quyền",
                  ],
                  [
                    "10000000-0000-4000-8000-000000000002",
                    "Nguyễn An",
                    "Nhân viên 01",
                  ],
                  [
                    "10000000-0000-4000-8000-000000000003",
                    "Trần Bình",
                    "Nhân viên 02",
                  ],
                ].map(([id, name, role]) => (
                  <button
                    className="demo-user"
                    disabled={busy}
                    key={id}
                    onClick={() => loginDemo(id)}
                  >
                    <span className="avatar">{name[0]}</span>
                    <span>
                      <b>{name}</b>
                      <small>{role}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </>
            ) : (
              <form noValidate onSubmit={login}>
                {field("Tên đăng nhập", "username", savedLogin, "text", true, {
                  autoComplete: "username",
                  autoCapitalize: "none",
                  spellCheck: false,
                  placeholder: "Nhập tên đăng nhập",
                })}
                <label className="field">
                  Mật khẩu
                  <div className="password">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      name="password"
                      required
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      aria-label="Hiện hoặc ẩn mật khẩu"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>
                <label className="remember-login">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                  />{" "}
                  Ghi nhớ tên đăng nhập
                </label>
                <button className="primary wide" disabled={busy}>
                  Đăng nhập <ChevronRight size={18} />
                </button>
              </form>
            )}
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <p className="login-foot">
              <LockKeyhole size={13} /> Quyền truy cập được cấp bởi chủ cửa hàng
            </p>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <OufeidunMark />
              <span>
                Oufeidun<small>Quản lý bán hàng</small>
              </span>
            </div>
            <div className="nav-label">Không gian làm việc</div>
            <nav>
              {nav.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={page === id ? "active" : ""}
                  onClick={() => navigate(id)}
                >
                  <Icon size={21} />
                  <span>{label}</span>
                  {(id === "drafts" || (admin && id === "orders")) &&
                    data.orders.filter((o) => o.status === "draft").length >
                      0 && (
                      <em>
                        {data.orders.filter((o) => o.status === "draft").length}
                      </em>
                    )}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              {demo && (
                <div className="demo-chip">Dữ liệu mẫu · bản xem thử</div>
              )}
              <div className="profile">
                <span className="avatar">{data.me.display_name[0]}</span>
                <span>
                  <b>{data.me.display_name}</b>
                  <small>{admin ? "Admin" : "Nhân viên"}</small>
                </span>
              </div>
              <button
                onClick={() =>
                  abandon(() => {
                    void logout();
                  })
                }
              >
                <LogOut size={19} /> Đăng xuất
              </button>
            </div>
          </aside>
          <main>
            <header>
              <div>
                <h1>{title}</h1>
                <p>{subtitles[page]}</p>
              </div>
              <div className="actions">
                <button
                  title="Tải lại dữ liệu"
                  aria-label="Tải lại dữ liệu"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await refresh();
                      setToast("Đã tải lại dữ liệu.");
                    })
                  }
                >
                  <RefreshCw size={18} />
                </button>
                {page === "stock" && admin && (
                  <>
                    <button onClick={manageGlassBrands}>
                      <Package size={18} /> Hãng kính
                    </button>
                    <button onClick={() => inventory("receipt")}>
                      <ArrowDownToLine size={18} /> Nhập hàng
                    </button>
                    <button className="primary" onClick={() => editProduct()}>
                      <Plus size={18} /> Thêm mã kính
                    </button>
                  </>
                )}
                {page === "sale" && draft && (
                  <button onClick={() => abandon(clearCart)}>
                    <Plus size={18} /> Đơn mới
                  </button>
                )}
                {page === "users" && (
                  <button className="primary" onClick={() => manageStaff()}>
                    <Plus size={18} /> Thêm nhân viên
                  </button>
                )}
              </div>
            </header>
            {error && (
              <div className="error" role="alert">
                {error}
                <button
                  aria-label="Đóng thông báo"
                  onClick={() => setError("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {page === "sale" && (
              <div className="sale-layout">
                <section className="catalog">
                  {searchBar}
                  <div className="chips">
                    {[
                      ["all", "Tất cả"],
                      ["clear", "Kính trong"],
                      ["privacy", "Chống nhìn trộm"],
                      ["matte", "Kính nhám"],
                    ].map(([k, v]) => (
                      <button
                        key={k}
                        className={filter === k ? "selected" : ""}
                        onClick={() => setFilter(k)}
                      >
                        {v}
                      </button>
                    ))}
                    <span>{products.length} mã kính</span>
                  </div>
                  <div className="product-grid">
                    {products.map((p) => (
                      <article key={p.id} className="product-card">
                        <button
                          className="art-button"
                          aria-label={`Thêm ${p.sku}`}
                          disabled={busy || !p.on_hand}
                          onClick={() => add(p)}
                        >
                          <ProductArt product={p} />
                        </button>
                        <div className="product-info">
                          <strong>{p.sku}</strong>
                          <p>{p.name}</p>
                          <small title={p.models.join(" / ")}>
                            {p.models.join(" / ")}
                          </small>
                          <span
                            className={`badge ${p.on_hand < 10 ? "amber" : "teal"}`}
                          >
                            Tồn: {p.on_hand}
                          </span>
                          <div className="product-price">
                            <b>{money(p.sale_price)}</b>
                            <button
                              aria-label={`Chọn ${p.sku}`}
                              disabled={busy || !p.on_hand}
                              onClick={() => add(p)}
                            >
                              <Plus size={21} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!products.length && (
                    <div className="empty">
                      <Search />
                      <h3>Không tìm thấy mã kính</h3>
                      <p>Thử tên điện thoại khác hoặc xóa bộ lọc.</p>
                    </div>
                  )}
                </section>
                <section className="cart panel">
                  <div className="cart-heading">
                    <h2>{draft?.order_no || "Đơn hàng mới"}</h2>
                    <span className="badge amber">Bản nháp</span>
                  </div>
                  <div className="customer-fields">
                    <label>
                      <span>Tên khách hàng</span>
                      <input
                        aria-label="Tên khách hàng"
                        placeholder="Nhập tên khách (tùy chọn)"
                        maxLength={200}
                        value={customer}
                        onChange={(e) => {
                          setCustomer(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label>
                      <span>Số điện thoại</span>
                      <input
                        aria-label="Số điện thoại"
                        type="tel"
                        inputMode="tel"
                        placeholder="Nhập số điện thoại (tùy chọn)"
                        maxLength={30}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                  </div>
                  <div className="cart-items">
                    {cart.length ? (
                      cart.map((i) => {
                        const p = data.products.find(
                          (p) => p.id === i.product_id,
                        )!;
                        return (
                          <div className="cart-item" key={i.product_id}>
                            <ProductArt product={p} small />
                            <div className="cart-line">
                              <div className="line-name">
                                <b>{i.custom_name || p.name}</b>
                                <button
                                  aria-label={`Đổi tên ${p.sku}`}
                                  onClick={() => rename(i, p)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  aria-label={`Bỏ ${p.sku}`}
                                  onClick={() => {
                                    setCart((c) =>
                                      c.filter(
                                        (x) => x.product_id !== i.product_id,
                                      ),
                                    );
                                    setDirty(true);
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <small>
                                {p.sku}
                                {i.custom_name && " · Tên riêng trên đơn"}
                              </small>
                              <span>{money(i.unit_sale_price)}</span>
                              <div className="line-bottom">
                                <div className="stepper">
                                  <button
                                    aria-label={`Giảm ${p.sku}`}
                                    onClick={() =>
                                      changeQty(p.id, i.quantity - 1)
                                    }
                                    disabled={i.quantity === 1}
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    aria-label={`Số lượng ${p.sku}`}
                                    type="number"
                                    min={1}
                                    value={i.quantity}
                                    onChange={(e) =>
                                      changeQty(p.id, Number(e.target.value))
                                    }
                                  />
                                  <button
                                    aria-label={`Tăng ${p.sku}`}
                                    onClick={() =>
                                      changeQty(p.id, i.quantity + 1)
                                    }
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                                <b>
                                  {money(
                                    BigInt(i.unit_sale_price || 0) *
                                      BigInt(i.quantity),
                                  )}
                                </b>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-cart">
                        <ShoppingCart size={38} />
                        <h3>Chưa có sản phẩm</h3>
                        <p>Chọn kính bên trái để tạo đơn.</p>
                      </div>
                    )}
                  </div>
                  <textarea
                    className="cart-note"
                    aria-label="Ghi chú đơn hàng"
                    placeholder="Ghi chú cho đơn hàng..."
                    value={note}
                    maxLength={1000}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <div className="cart-summary">
                    <div>
                      <span>Số lượng</span>
                      <b>{cart.reduce((s, i) => s + i.quantity, 0)} miếng</b>
                    </div>
                    <div className="total">
                      <strong>Tổng tiền</strong>
                      <b>{money(amount(cart))}</b>
                    </div>
                    <p className="hint">
                      <ShieldCheck size={15} /> Đơn nháp chưa trừ tồn kho
                    </p>
                    <div className="cart-actions">
                      <button
                        disabled={busy || !cart.length}
                        onClick={() =>
                          run(async () => {
                            await save();
                            setToast("Đã lưu bản nháp.");
                          })
                        }
                      >
                        <Save size={17} /> Lưu bản nháp
                      </button>
                      <button
                        className="primary"
                        disabled={busy || !cart.length}
                        onClick={() => run(prepareConfirm)}
                      >
                        <Check size={18} /> Xác nhận bán
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
            {page === "stock" && (
              <>
                <div className="stats">
                  <Stat
                    icon={<Package />}
                    label="Mã kính đang bán"
                    value={String(data.products.filter((p) => p.active).length)}
                  />
                  <Stat
                    icon={<SlidersHorizontal />}
                    label="Tổng tồn kho"
                    value={`${data.products.reduce((s, p) => s + p.on_hand, 0)} miếng`}
                  />
                  <Stat
                    icon={<AlertTriangle />}
                    label="Sắp hết hàng"
                    value={`${data.products.filter((p) => p.active && p.on_hand < 10).length} mã kính`}
                    amber
                  />
                </div>
                <section className="panel stock-panel">
                  {searchBar}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Hãng kính</th>
                          <th>Dòng máy tương thích</th>
                          {admin && <th className="number">Giá vốn</th>}
                          <th className="number">Giá bán</th>
                          <th>Tồn kho</th>
                          {admin && <th>Thao tác</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr
                            key={p.id}
                            className={p.on_hand < 10 ? "low-stock" : ""}
                          >
                            <td>
                              <div className="product-cell">
                                <ProductArt product={p} small />
                                <span>
                                  <b>{p.sku}</b>
                                  <small>{p.name}</small>
                                  <small>
                                    {typeLabels[p.glass_type]}
                                    {!p.active && " · Ngừng bán"}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td>
                              {data.glass_brands.find(
                                (b) => b.id === p.glass_brand_id,
                              )?.name || "Chưa phân loại"}
                            </td>
                            <td>{p.models.join(" / ") || "—"}</td>
                            {admin && (
                              <td className="number">{money(p.fixed_cost)}</td>
                            )}
                            <td className="number">{money(p.sale_price)}</td>
                            <td>
                              <span
                                className={`badge ${p.on_hand < 10 ? "amber" : "teal"}`}
                              >
                                {p.on_hand} miếng
                              </span>
                            </td>
                            {admin && (
                              <td>
                                <div className="actions">
                                  <button
                                    aria-label={`Sửa ${p.sku}`}
                                    onClick={() => editProduct(p)}
                                  >
                                    <Pencil size={15} /> Sửa
                                  </button>
                                  <button
                                    aria-label={`Lịch sử ${p.sku}`}
                                    onClick={() =>
                                      run(async () => {
                                        const rows = await rpc<
                                          {
                                            movement_type: string;
                                            quantity_delta: number;
                                            balance_after: number;
                                            occurred_at: string;
                                          }[]
                                        >("shop_read", {
                                          action: "history",
                                          product_id: p.id,
                                        });
                                        setModal({
                                          title: `Lịch sử kho · ${p.sku}`,
                                          body: (
                                            <div className="detail-lines">
                                              {rows.map((r, k) => (
                                                <div key={k}>
                                                  <span>
                                                    {r.movement_type}
                                                    <small>
                                                      {dateText(r.occurred_at)}
                                                    </small>
                                                  </span>
                                                  <b>
                                                    {r.quantity_delta > 0
                                                      ? "+"
                                                      : ""}
                                                    {r.quantity_delta} → Tồn{" "}
                                                    {r.balance_after}
                                                  </b>
                                                </div>
                                              ))}
                                              {!rows.length && (
                                                <p>Chưa có biến động kho.</p>
                                              )}
                                            </div>
                                          ),
                                        });
                                      })
                                    }
                                  >
                                    <History size={15} />
                                  </button>
                                  <button
                                    className="danger-outline"
                                    aria-label={`Xóa ${p.sku}`}
                                    onClick={() => deleteProduct(p)}
                                  >
                                    <Trash2 size={15} /> Xóa
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!products.length && (
                    <div className="empty">Không có mã kính phù hợp.</div>
                  )}
                  <div className="table-foot">
                    <span>Hiển thị {products.length} mã kính</span>
                    <span>
                      <LockKeyhole size={14} />{" "}
                      {admin
                        ? "Chỉ Admin được xem giá vốn và thay đổi giá bán."
                        : "Giá bán do Admin thiết lập."}
                    </span>
                  </div>
                </section>
                {admin && (
                  <div className="stock-actions">
                    <button onClick={() => inventory("damage")}>
                      <AlertTriangle size={18} /> Ghi nhận kính lỗi
                    </button>
                    <button onClick={() => inventory("adjustment")}>
                      <SlidersHorizontal size={18} /> Điều chỉnh tồn
                    </button>
                    <button onClick={() => inventory("issue")}>Xuất kho</button>
                    <button onClick={() => inventory("opening")}>
                      Tồn đầu kỳ
                    </button>
                    <small>Mỗi lần điều chỉnh đều được lưu lịch sử.</small>
                  </div>
                )}
              </>
            )}
            {(page === "orders" || page === "drafts") && (
              <section className="panel">
                <div className="list-toolbar">
                  <label className="search">
                    <Search size={18} />
                    <input
                      aria-label="Tìm đơn hàng"
                      placeholder="Tìm mã đơn hoặc khách hàng..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label className="date-mini">
                    Từ
                    <input
                      aria-label="Lọc đơn từ ngày"
                      type="date"
                      value={orderFrom}
                      onChange={(e) => setOrderFrom(e.target.value)}
                    />
                  </label>
                  <label className="date-mini">
                    Đến
                    <input
                      aria-label="Lọc đơn đến ngày"
                      type="date"
                      value={orderTo}
                      onChange={(e) => setOrderTo(e.target.value)}
                    />
                  </label>
                  {page === "orders" && admin && (
                    <select
                      aria-label="Trạng thái đơn"
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      {Object.entries(statusLabels)
                        .filter(([s]) => s !== "deleted")
                        .map(([s, l]) => (
                          <option key={s} value={s}>
                            {l}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Thời gian</th>
                        {admin && <th>Người tạo</th>}
                        <th>Trạng thái</th>
                        <th className="number">Tổng tiền</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders
                        .filter(
                          (o) =>
                            (page === "drafts"
                              ? o.status === "draft"
                              : !admin
                                ? o.status !== "draft"
                                : orderFilter === "all" ||
                                  o.status === orderFilter) &&
                            `${o.order_no} ${o.customer_name}`
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (!orderFrom ||
                              o.created_at >=
                                new Date(
                                  orderFrom + "T00:00:00+07:00",
                                ).toISOString()) &&
                            (!orderTo ||
                              o.created_at <
                                new Date(
                                  new Date(
                                    orderTo + "T00:00:00+07:00",
                                  ).getTime() + 86400000,
                                ).toISOString()),
                        )
                        .map((o) => (
                          <tr key={o.id}>
                            <td>
                              <b>{o.order_no}</b>
                            </td>
                            <td>{o.customer_name || "Khách lẻ"}</td>
                            <td>{dateText(o.created_at)}</td>
                            {admin && <td>{o.creator_name}</td>}
                            <td>
                              <div className="order-statuses">
                                <span
                                  className={`badge ${o.status === "draft" ? "amber" : o.status === "cancelled" ? "red" : "teal"}`}
                                >
                                  {statusLabels[o.status]}
                                </span>
                                {o.status !== "draft" &&
                                  o.status !== "cancelled" && (
                                    <span
                                      className={`badge ${o.payment_status === "paid" ? "teal" : o.payment_status === "partial" ? "amber" : "red"}`}
                                    >
                                      {
                                        paymentStatusLabels[
                                          o.payment_status || "unpaid"
                                        ]
                                      }
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="number">{money(o.total_amount)}</td>
                            <td>
                              <button onClick={() => showOrder(o)}>
                                Chi tiết <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!data.orders.length && (
                  <div className="empty">
                    <FileText />
                    <h3>Chưa có đơn hàng</h3>
                    <p>Tạo đơn đầu tiên tại màn Bán hàng.</p>
                    <button onClick={() => navigate("sale")}>
                      Tạo đơn bán hàng
                    </button>
                  </div>
                )}
                <div className="table-foot">
                  Hiển thị tối đa 500 đơn gần nhất. Báo cáo tổng hợp tính toàn
                  bộ giao dịch trong kỳ.
                </div>
              </section>
            )}
            {page === "reports" && admin && (
              <>
                <div className="date-filter">
                  <label>
                    Từ ngày
                    <input
                      aria-label="Từ ngày"
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    Đến ngày
                    <input
                      aria-label="Đến ngày"
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                  <label>
                    Hãng máy
                    <select
                      aria-label="Lọc báo cáo theo hãng máy"
                      value={reportBrand}
                      onChange={(e) => setReportBrand(e.target.value)}
                    >
                      <option value="all">Tất cả hãng máy</option>
                      {[
                        ...new Set(
                          data.products.map((p) => p.brand).filter(Boolean),
                        ),
                      ]
                        .sort((a, b) => a.localeCompare(b, "vi"))
                        .map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <span>Theo ngày Việt Nam · tối đa 366 ngày</span>
                </div>
                {report ? (
                  <>
                    <div className="stats">
                      <Stat
                        icon={<BarChart3 />}
                        label="Doanh thu thuần"
                        value={money(report.revenue)}
                      />
                      <Stat
                        icon={<Package />}
                        label="Giá vốn hàng bán ròng"
                        value={money(report.cost)}
                      />
                      <Stat
                        icon={<ShieldCheck />}
                        label="Lãi gộp quy định"
                        value={money(report.profit)}
                      />
                    </div>
                    <div className="report-grid">
                      <section className="panel report-panel">
                        <h2>Đối chiếu trong kỳ</h2>
                        <dl>
                          <dt>Tiền hoàn / hủy</dt>
                          <dd>{money(report.refunds)}</dd>
                          <dt>Kính lỗi và hàng trả không bán lại</dt>
                          <dd>{money(report.damage)}</dd>
                          <dt>Số miếng đã xác nhận bán (trước trả)</dt>
                          <dd>{report.sold}</dd>
                        </dl>
                      </section>
                      <section className="panel report-panel">
                        <h2>Tồn kho hiện tại</h2>
                        <dl>
                          <dt>Số lượng</dt>
                          <dd>{report.stock} miếng</dd>
                          <dt>Giá trị theo vốn quy định hiện hành</dt>
                          <dd>{money(report.stock_value)}</dd>
                        </dl>
                      </section>
                    </div>
                    <InventoryReport rows={report.inventory} />
                    <div className="info-box">
                      <ShieldCheck size={20} />
                      <p>
                        Số liệu đang áp dụng theo khoảng ngày và hãng máy đã
                        chọn. Lãi gộp tính theo giá vốn cố định tại thời điểm
                        bán, chưa trừ chi phí vận hành và tổn thất kính lỗi.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="panel empty">Đang tải báo cáo…</div>
                )}
              </>
            )}
            {page === "users" && admin && (
              <section className="panel">
                <table>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="profile">
                            <span className="avatar">{u.display_name[0]}</span>
                            <b>{u.display_name}</b>
                          </div>
                        </td>
                        <td>{u.role === "admin" ? "Admin" : "Nhân viên"}</td>
                        <td>
                          <span
                            className={`badge ${u.active ? "teal" : "red"}`}
                          >
                            {u.active ? "Đang hoạt động" : "Đã khóa"}
                          </span>
                        </td>
                        <td>
                          {u.role === "staff" ? (
                            <div className="actions">
                              <button
                                onClick={() =>
                                  setModal({
                                    title: u.active
                                      ? "Khóa tài khoản?"
                                      : "Mở lại tài khoản?",
                                    body: (
                                      <p>
                                        {u.display_name}{" "}
                                        {u.active
                                          ? "sẽ không thể thực hiện giao dịch mới."
                                          : "sẽ có thể đăng nhập và tiếp tục làm việc."}{" "}
                                        Lịch sử giao dịch được giữ nguyên.
                                      </p>
                                    ),
                                    submit: u.active
                                      ? "Khóa tài khoản"
                                      : "Mở tài khoản",
                                    danger: u.active,
                                    onSubmit: async () => {
                                      await write("staff_state", {
                                        id: u.id,
                                        active: !u.active,
                                      });
                                    },
                                  })
                                }
                              >
                                {u.active ? "Khóa" : "Mở khóa"}
                              </button>
                              <button onClick={() => editUserName(u)}>
                                Sửa tên
                              </button>
                              <button onClick={() => manageStaff(u.id)}>
                                Đặt lại mật khẩu
                              </button>
                              <button
                                className="danger-outline"
                                onClick={() => deleteStaff(u)}
                              >
                                Xóa
                              </button>
                            </div>
                          ) : (
                            <div className="actions">
                              <button onClick={() => editUserName(u)}>
                                Sửa tên
                              </button>
                              <button onClick={() => manageStaff(u.id)}>
                                Đổi mật khẩu
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-foot">
                  <LockKeyhole size={14} /> Nhân viên không xem giá vốn, không
                  sửa giá bán hoặc giảm giá.
                </div>
              </section>
            )}
            {page === "audit" && admin && (
              <section className="panel">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Người thực hiện</th>
                      <th>Thao tác</th>
                      <th>Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((l) => (
                      <tr key={l.id}>
                        <td>{dateText(l.created_at)}</td>
                        <td>{l.actor_name}</td>
                        <td>{actionLabels[l.action] || l.action}</td>
                        <td className="log-detail">{auditDetail(l, data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-foot">
                  100 thao tác gần nhất · Lịch sử không thể sửa hoặc xóa trong
                  ứng dụng.
                </div>
              </section>
            )}
            {page === "lookup" && <SharedLookup />}
          </main>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {busy && <div className="busy-bar" />}
      {modal && (
        <div
          className="modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              setModal(null);
              setError("");
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-head">
              <div>
                <h2 id="modal-title">{modal.title}</h2>
                {modal.subtitle && <p>{modal.subtitle}</p>}
              </div>
              <button
                aria-label="Đóng hộp thoại"
                disabled={busy}
                onClick={() => {
                  setModal(null);
                  setError("");
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const message = validateForm(e.currentTarget);
                if (message) {
                  setError(message);
                  return;
                }
                const fd = new FormData(e.currentTarget);
                void run(async () => {
                  await modal.onSubmit?.(fd);
                  setModal(null);
                });
              }}
            >
              <fieldset disabled={busy} className="modal-body">
                {modal.body}
              </fieldset>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <footer>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setModal(null);
                    setError("");
                  }}
                >
                  Đóng
                </button>
                {modal.submit && (
                  <button
                    disabled={busy}
                    type="submit"
                    className={modal.danger ? "danger" : "primary"}
                  >
                    {busy ? "Đang xử lý…" : modal.submit}
                  </button>
                )}
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function Stat({
  icon,
  label,
  value,
  amber = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  amber?: boolean;
}) {
  return (
    <div className={`stat panel ${amber ? "stat-amber" : ""}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function OrderBill({ order, products }: { order: Order; products: Product[] }) {
  return (
    <div className="bill">
      <div className="bill-head">
        <div>
          <h2>OUFEIDUN</h2>
          <small>Kính cường lực điện thoại</small>
        </div>
        <div>
          <b>{order.order_no}</b>
          <small>{dateText(order.confirmed_at || order.created_at)}</small>
        </div>
      </div>
      <section className="bill-customer">
        <p>
          <b>Khách hàng:</b> {order.customer_name || "Khách lẻ"}
        </p>
        {order.customer_phone && (
          <p>
            <b>Điện thoại:</b> {order.customer_phone}
          </p>
        )}
        {order.customer_address && (
          <p>
            <b>Địa chỉ:</b> {order.customer_address}
          </p>
        )}
      </section>
      <table className="bill-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Sản phẩm</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => {
            const p = products.find((p) => p.id === item.product_id),
              name =
                item.product_name_snapshot ||
                item.custom_name ||
                p?.name ||
                "Sản phẩm";
            return (
              <tr key={item.id || item.product_id}>
                <td>{index + 1}</td>
                <td>
                  <b>{name}</b>
                  <small>
                    {item.sku_snapshot || p?.sku}
                    {item.item_kind && item.item_kind !== "sale"
                      ? ` · ${item.item_kind === "gift" ? "Hàng tặng" : "Hàng mẫu"}`
                      : ""}
                    {item.item_note && ` · ${item.item_note}`}
                  </small>
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.unit_sale_price || 0)}</td>
                <td>
                  {money(
                    BigInt(item.unit_sale_price || 0) * BigInt(item.quantity),
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bill-total">
        <span>Tổng cộng</span>
        <b>{money(order.total_amount)}</b>
        <span>Đã thanh toán</span>
        <b>{money(order.paid_amount || 0)}</b>
        <span>Còn phải thu</span>
        <b>{money(order.outstanding_amount ?? order.total_amount)}</b>
      </div>
      {order.note && (
        <p className="bill-note">
          <b>Ghi chú:</b> {order.note}
        </p>
      )}
      <p className="bill-thanks">Cảm ơn quý khách!</p>
      <button
        type="button"
        className="primary no-print"
        onClick={() => window.print()}
      >
        In bill / Lưu PDF
      </button>
    </div>
  );
}
function SharedLookup() {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<SharedLookupItem[]>([]),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState("");
  async function search(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      setMessage("Nhập ít nhất 2 ký tự.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await lookupSharedProducts(query);
      setItems(result);
      if (!result.length) setMessage("Không tìm thấy mã kính phù hợp.");
    } catch {
      setMessage("Không kết nối được dữ liệu tra cứu của website.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="panel shared-lookup">
      <form className="lookup-form" onSubmit={search}>
        <label className="search">
          <Search size={20} />
          <input
            aria-label="Tra cứu mã kính dùng chung"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập dòng máy hoặc SKU, ví dụ iPhone 15"
          />
        </label>
        <button className="primary" disabled={loading}>
          {loading ? "Đang tra…" : "Tra cứu"}
        </button>
      </form>
      {message && <p className="hint">{message}</p>}
      <div className="lookup-results">
        {items.map((item) => (
          <article key={item.id}>
            <div>
              <b>{item.sku}</b>
              <small>{item.name}</small>
            </div>
            <p>
              <Check size={16} /> Dùng chung với {item.compatibleModels.length}{" "}
              dòng máy
            </p>
            <div className="lookup-models">
              {item.compatibleModels.map((model) => (
                <span
                  className={
                    item.matchedModels.includes(model) ? "matched" : ""
                  }
                  key={model}
                >
                  {model}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
