import {categoryKey, categoryLabels, searchCategoryLabels, productUnit, quantitySummary, itemQuantitySummary, isAccessory, lineKey, reservedQuantity, availableForLine, allocateDelivery} from './lib/catalog';
import {CustomerSearch} from './components/CustomerSearch';
import {orderItemsForDisplay} from './lib/order-item-order';
import {reportSheets} from './lib/report-sheets';
import {reportTotals} from './lib/report-totals';
import {StockAdjustmentFields} from './components/StockAdjustmentFields';
import {stockAdjustmentTarget} from './lib/stock-adjustment';
import {hasPermission,permissionLabels,type Permission} from './lib/permissions';
import ProductReportDetails from './components/ProductReportDetails';
import AppUpdateNotice from './components/AppUpdateNotice';
import StockForecastPanel from './components/StockForecastPanel';
import {estimateForCart} from './lib/stock-forecast';
import {startSessionHeartbeat} from './lib/session-heartbeat';
import SalesReportTable from './components/SalesReportTable';
import { productExcelColumns, readProductWorkbook } from "./lib/product-excel";
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
  ZoomIn,
  Download,
  UserRound,
} from "lucide-react";
import {
  demo,
  sharedOperations,
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
  forgetOnlineSession,
  releaseOnlineSession,
  touchOnlineSession,
  saveOrderFeatures,
  recordPayment,
  saveCustomer,
  saveOrderBusiness,
  setWholesalePrice,
  setBulkPrice,
  lookupSharedProducts,
  lookupImageSrc,
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
  currentMonthStart,
} from "./types";
import InventoryReport from "./InventoryReport";
import { downloadWorkbook, downloadOrderWorkbook, readInventoryWorkbook } from "./lib/excel";
import {orderProductColor} from './lib/order-product-color';
import { InputError } from "./lib/input-error";
import { createOrderImage, downloadOrderImage } from "./lib/order-image";
import { saveDownload } from "./lib/download";
import { inVietnamDateRange, vietnamDateInput, orderDateValue } from "./lib/order-date";

type Modal = {
  title: string;
  className?: string;
  subtitle?: string;
  body: ReactNode;
  submit?: string;
  danger?: boolean;
  onSubmit?: (data: FormData) => Promise<void>;
};
const actionLabels: Record<string, string> = {
  "product.rename": "Đổi mã sản phẩm",
  product: "Cập nhật sản phẩm",
  inventory: "Ghi nhận kho",
  save_draft: "Lưu bản nháp",
  confirm_order: "Xác nhận bán hàng",
  deliver_order: "Giao bổ sung hàng thiếu",
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
  "product.bulk_price": "Cập nhật bảng giá đồng loạt",
  "order.item_price.update": "Điều chỉnh giá bán trên đơn",
  "customer.price.save": "Lưu giá riêng cho khách sỉ",
};
actionLabels["product.delete"] = "Xóa mã kính";
actionLabels['staff.permissions']='Thay đổi phân quyền';
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
      "deliver_order",
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
  if (log.action === "order.item_price.update" && id) {
    const order = data.orders.find((o) => o.id === id);
    return `${order?.order_no || "Đơn hàng"}${detail.slice(id.length)}`;
  }
  if (log.action === "customer.price.save" && id) {
    const customer = data.customers.find((item) => item.id === id);
    return `${customer?.name || "Khách sỉ"}${detail.slice(id.length)}`;
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

function normalizeProductSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/\bip\s*(?=\d)/g, "iphone ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactProductSearch(value: string) {
  return normalizeProductSearch(value).replace(/\s+/g, "");
}

function containsProductSearch(value: string, query: string) {
  const needle = normalizeProductSearch(query);
  if (!needle) return true;
  return (
    normalizeProductSearch(value).includes(needle) ||
    compactProductSearch(value).includes(compactProductSearch(query))
  );
}

function matchingCompatibleModel(product: Product, query: string) {
  if (!query.trim()) return null;
  return product.models.find((model) => containsProductSearch(model, query)) || null;
}

function productSearchRank(product: Product, query: string) {
  if (!query.trim()) return 0;
  const needle = normalizeProductSearch(query);
  const sku = normalizeProductSearch(product.sku);
  const models = product.models.map(normalizeProductSearch);
  if (sku === needle) return 0;
  if (models.some((model) => model === needle)) return 1;
  if (sku.startsWith(needle)) return 2;
  if (models.some((model) => model.startsWith(needle))) return 3;
  if (containsProductSearch(product.name, query)) return 4;
  return 5;
}

function ProductCompatibility({ product, query }: { product: Product; query: string }) {
  if(product.sku_aliases?.length)return <small className="compatibility-list">Mã cũ: {product.sku_aliases.join(' / ')} · Dùng chung: {product.models.join(' / ')||'Chưa có'}</small>;
  const matched = matchingCompatibleModel(product, query);
  if (matched) {
    return (
      <small className="compatibility-match" title={product.models.join(" / ")}>
        <Search size={12} /> Khớp máy dùng chung: <b>{matched}</b>
      </small>
    );
  }
  return (
    <small className="compatibility-list" title={product.models.join(" / ")}>
      {product.models.length ? `Dùng chung: ${product.models.join(" / ")}` : "Chưa có mã dùng chung"}
    </small>
  );
}

function SupplementalDeliveryFields({ order, products }: { order: Order; products: Product[] }) {
  const pending = order.items.filter((item) => (item.delivered_quantity || 0) < item.quantity);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => allocateDelivery(pending,products,true));
  const added = pending.reduce((sum, item) => sum + BigInt(item.unit_sale_price || 0) * BigInt(quantities[item.id!] || 0), 0n);
  const due = BigInt(order.total_amount) + added - BigInt(order.paid_amount || 0);
  return <>
    <div className="supplemental-items">
      {orderItemsForDisplay(pending,products).map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const missing = item.quantity - (item.delivered_quantity || 0);
        return <div className="supplemental-line" key={item.id}>
          {product && <ProductArt product={product} />}
          <div className="supplemental-product"><b style={{color:orderProductColor(product?.glass_type,item.sku_snapshot||product?.sku)}}>{item.sku_snapshot || product?.sku}</b><small>{item.sku_snapshot || product?.sku} · Tồn {product?.on_hand || 0} {productUnit(product)}</small><span className="badge amber">Còn thiếu {missing} {productUnit(product)}</span><small>Đơn giá {money(item.unit_sale_price || 0)}</small></div>
          <label className="field supplemental-quantity">Giao lần này<input aria-label={`Giao bổ sung ${item.sku_snapshot || product?.sku}`} name={`delivery_${item.id}`} type="number" min={0} max={Math.min(missing, product?.on_hand || 0)} value={quantities[item.id!]} onChange={(event) => setQuantities((previous) => ({ ...previous, [item.id!]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} /><small>{money((BigInt(item.unit_sale_price || 0) * BigInt(quantities[item.id!] || 0)).toString())}</small></label>
        </div>;
      })}
    </div>
    <div className="supplemental-summary"><div><span>Tiền hàng giao lần này</span><strong>{money(added.toString())}</strong></div><div><span>Còn phải thu sau khi giao</span><strong>{money(due.toString())}</strong></div></div>
    <h3 className="supplemental-payment-title">Thu tiền cùng lần giao</h3>
    <p className="hint">Nhập số tiền thực nhận; để 0 nếu khách chưa trả. Có thể thu cả tiền còn nợ trước đó.</p>
    <div className="form-grid">
    {field("Tiền khách trả lần này (đ)", "payment_amount", "0", "number", true, { min: 0, max: due.toString(), step: 1 })}
    <label className="field">Phương thức thanh toán<select name="payment_method"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="cod">COD</option></select></label>
    </div>
  </>;
}

function InventoryReceiptFields({
  products,
  canSeeCosts,
  initialProduct,
  onDownloadTemplate,
  onModeChange,
}: {
  products: Product[];
  initialProduct?: Product;
  canSeeCosts: boolean;
  onDownloadTemplate: () => void;
  onModeChange: (mode: "single" | "excel") => void;
}) {
  const [mode, setMode] = useState<"single" | "excel">("single");
  const [query, setQuery] = useState("");
  const filtered = products.filter((product) =>
    !query.trim() || containsProductSearch(`${product.sku} ${(product.sku_aliases||[]).join(' ')} ${product.name} ${product.models.join(" ")}`, query),
  );
  return (
    <div className="inventory-entry">
      <input type="hidden" name="inventory_mode" value={mode} />
      <div className="inventory-mode-tabs" aria-label="Cách nhập hàng">
        <button type="button" className={mode === "single" ? "active" : ""} onClick={() => { setMode("single"); onModeChange("single"); }}>Nhập một mã</button>
        <button type="button" className={mode === "excel" ? "active" : ""} onClick={() => { setMode("excel"); onModeChange("excel"); }}>Nhập bằng Excel</button>
      </div>
      {mode === "single" ? (
        <div className="inventory-single-fields">
          <label className="field full">
            Tìm nhanh mã kính
            <input aria-label="Tìm nhanh mã kính nhập kho" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập mã kính hoặc tên sản phẩm…" autoFocus />
            <small>{filtered.length} mã phù hợp. Kính: tấm; phụ kiện: sản phẩm.</small>
          </label>
          <label className="field full">
            Mã kính cần nhập
            <select aria-label="Mã kính cần nhập" name="product_id" defaultValue={initialProduct?.id} required>
              {filtered.map((product) => (
                <option key={product.id} value={product.id}>{product.sku} · Tồn hiện tại: {product.on_hand}</option>
              ))}
            </select>
          </label>
          {field("Số lượng nhập", "quantity", 1, "number", true, { min: 1, max: 1000000, step: 1 })}
          {canSeeCosts&&field("Đơn giá mua thực tế (đ)", "purchase_price", "", "number", true, { min: 0, step: 1 })}
        </div>
      ) : (
        <div className="inventory-excel-fields">
          <div className="excel-instruction">
            <b>Nhập nhiều mã kính cùng lúc</b>
            <span>{!canSeeCosts?"Mẫu nhân viên chỉ gồm Mã kính và Số lượng. Không dùng file chứa giá/vốn. Mã mới chờ Admin thiết lập vốn và giá.":"Mẫu mới gồm 9 cột, có Số lượng để nhập thêm vào kho cùng lúc với mã kính và giá. Số lượng 0 chỉ cập nhật danh mục. Dòng máy cách nhau bằng dấu phẩy. Mỗi lần nhập file mới sẽ cộng tiếp số lượng; kiểm tra trước khi nhập lại. File 8 cột cũ vẫn chỉ cập nhật danh mục, file 3 cột cũ vẫn nhập kho."}</span>
            <button type="button" onClick={onDownloadTemplate}><Download size={16} /> Tải file Excel mẫu</button>
          </div>
          <label className="field full">
            Chọn file Excel đã điền
            <input name="inventory_excel" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
          </label>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [findingServer,setFindingServer]=useState(false);
  const [serverStatus,setServerStatus]=useState('');
  const [stockView,setStockView]=useState<'actual'|'forecast'>('actual');
  const [data, setData] = useState<Workspace | null>(null),
    [page, setPage] = useState("sale"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const [glassBrand, setGlassBrand] = useState("all");
  const [orderFrom, setOrderFrom] = useState(currentMonthStart()),
    [orderTo, setOrderTo] = useState(today());
  const [customerFilter, setCustomerFilter] = useState<"all" | "retail" | "wholesale">("all");
  const [auditActor, setAuditActor] = useState("all"),
    [auditFrom, setAuditFrom] = useState(currentMonthStart()),
    [auditTo, setAuditTo] = useState(today());
  const [cart, setCart] = useState<Item[]>([]),
    [draft, setDraft] = useState<Order | null>(null),
    [orderCode, setOrderCode] = useState(""),
    [orderedAt, setOrderedAt] = useState(() => vietnamDateInput()),
    [extraCost, setExtraCost] = useState("0"),
    [extraCostNote, setExtraCostNote] = useState(""),
    [customer, setCustomer] = useState(""),
    [phone, setPhone] = useState(""),
    [address, setAddress] = useState(""),
    [customerType, setCustomerType] = useState<"retail" | "wholesale">(
      "retail",
    ),
    [customerId, setCustomerId] = useState<string | null>(null),
    [salespersonId, setSalespersonId] = useState<string>(""),
    [fulfillmentStatus, setFulfillmentStatus] = useState<"complete" | "short">("complete"),
    [missingSummary, setMissingSummary] = useState(""),
    [note, setNote] = useState(""),
    [dirty, setDirty] = useState(false);
  const [stockGroup,setStockGroup]=useState("all");
  const automaticMissingSummary = cart.map((item) => {
    const product = data?.products.find((row) => row.id === item.product_id);
    const missing = product ? Math.max(0, item.quantity - availableForLine(cart,item,product.on_hand)) : 0;
    return missing ? `${product!.sku}: thiếu ${missing} ${productUnit(product)} (đặt ${item.quantity}, tồn ${product!.on_hand})` : "";
  }).filter(Boolean).join("\n");
  const manualMissingSummary = missingSummary && missingSummary.split("\n").every((line) => /^.+: thiếu \d+ (?:miếng|tấm|sản phẩm) \(đặt \d+, tồn \d+\)$/.test(line)) ? "" : missingSummary;
  const effectiveMissingSummary = automaticMissingSummary || manualMissingSummary;
  const [modal, setModal] = useState<Modal | null>(null),
    [orderFilter, setOrderFilter] = useState("all"),
    [from, setFrom] = useState(currentMonthStart()),
    [to, setTo] = useState(today()),
    [report, setReport] = useState<Report | null>(null),
    [reportRevision,setReportRevision]=useState(0),
    [performanceMode, setPerformanceMode] = useState<"fast" | "slow">("fast"),
     [passwordVisible, setPasswordVisible] = useState(false);
  const [orderImagePreview, setOrderImagePreview] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);
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
  useEffect(() => {
    if (!orderImagePreview) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOrderImagePreview(null);
    };
    document.addEventListener("keydown", close);
    return () => {
      URL.revokeObjectURL(orderImagePreview.url);
      document.removeEventListener("keydown", close);
    };
  }, [orderImagePreview]);
  // Operations are shared; cost visibility is a separate capability.
  const canOperate = Boolean(data) && (sharedOperations || data?.me.role === "admin");
  const canSeeCosts = data?.me.role === "admin";
  const permits=(key:Permission)=>(sharedOperations||canSeeCosts)&&hasPermission(data?.me,key);
  const canProducts=permits('manage_products'),canPrices=permits('manage_prices'),canAdjust=permits('adjust_stock'),canReceive=permits('receive_stock'),canReturns=permits('manage_returns'),canReports=permits('view_reports'),canAudit=permits('view_audit');
  const canPage=(id:string)=>id==='users'?canSeeCosts:id==='reports'?canReports:id==='audit'?canAudit:canOperate||['sale','lookup','orders','drafts','stock'].includes(id);
  useEffect(()=>{if(data&&!canPage(page)){setModal(null);setReport(null);setPage('sale');}},[data,page]);
  function editPermissions(user:User){
    setModal({title:'Phân quyền · '+user.display_name,body:<><p>Bán hàng, khách hàng và tra cứu tồn kho luôn được phép. Giá vốn, giá nhập, lợi nhuận và quản trị tài khoản chỉ dành cho Admin.</p>{(Object.entries(permissionLabels) as [Permission,string][]).map(([key,label])=><label className="check" key={key}><input type="checkbox" name={key} defaultChecked={hasPermission(user,key)}/>{label}</label>)}</>,submit:'Lưu phân quyền',onSubmit:async fd=>{await manageStaffAccount({action:'permissions',id:user.id,version:user.permissions_version||1,permissions:Object.fromEntries(Object.keys(permissionLabels).map(key=>[key,fd.get(key)==='on']))});await refresh();setToast('Đã cập nhật phân quyền. Quyền mới được kiểm tra ở yêu cầu tiếp theo.');}});
  }
  function suggestedPrice(
    product: Product,
    type = customerType,
    selectedCustomerId = customerId,
  ) {
    if (type !== "wholesale") return product.sale_price;
    const saved = data?.customer_prices?.find(
      (price) =>
        price.customer_id === selectedCustomerId &&
        price.product_id === product.id,
    );
    return saved?.unit_price || product.wholesale_price || product.sale_price;
  }
  function suggestedPriceLabel(product: Product) {
    if (customerType !== "wholesale") return "Giá lẻ mặc định";
    return data?.customer_prices?.some(
      (price) => price.customer_id === customerId && price.product_id === product.id,
    )
      ? "Giá riêng đã lưu của khách"
      : "Giá sỉ mặc định";
  }
  function suggestedPriceSource(
    product: Product,
    type = customerType,
    selectedCustomerId = customerId,
  ): Item["price_source"] {
    if (type !== "wholesale") return "retail_default";
    return data?.customer_prices?.some(
      (price) => price.customer_id === selectedCustomerId && price.product_id === product.id,
    )
      ? "customer_saved"
      : "wholesale_default";
  }
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
    return startSessionHeartbeat({
      touch: touchOnlineSession,
      expired: (e) => {
        setError(friendly(e));
        setData(null);
      },
      unavailable: () => setToast('Kết nối máy chủ tạm gián đoạn. Ứng dụng sẽ thử lại; hãy kiểm tra kết nối trước khi lưu đơn.'),
    });
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
    if (!data) return;
    let cancelled = false, loading = false;
    const syncOrders = async () => {
      if (loading || busy || modal || document.visibilityState === "hidden") return;
      loading = true;
      try { const latest = await workspace(); if (!cancelled) setData(latest); }
      catch (e) { if (!cancelled) setError(friendly(e)); }
      finally { loading = false; }
    };
    void syncOrders();
    const timer = setInterval(() => { void syncOrders(); }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [!!data, page, busy, !!modal]);
  useEffect(() => {
    if (page !== "reports" || !canReports) return;
    let live = true;
    setReport(null);
    loadReport(from, to, "all")
      .then((r) => {
        if (live) setReport(r);
      })
      .catch((e) => {
        if (live) setError(friendly(e));
      });
    return () => {
      live = false;
    };
  }, [page, from, to, data?.me.id, canReports, canSeeCosts, reportRevision]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      console.error("Không thể hoàn tất thao tác", e);
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
    setOrderCode("");
    setOrderedAt(vietnamDateInput());
    setExtraCost("0");
    setExtraCostNote("");
    setCustomer("");
    setPhone("");
    setAddress("");
    setCustomerType("retail");
    setCustomerId(null);
    setSalespersonId(data?.me.id || "");
    setFulfillmentStatus("complete");
    setMissingSummary("");
    setNote("");
    setDirty(false);
  }
  function openDraft(o: Order) {
    setDraft(o);
    setOrderCode(o.order_no);
    setOrderedAt(vietnamDateInput(o.ordered_at || o.confirmed_at || o.created_at));
    setExtraCost(o.extra_cost || "0");
    setExtraCostNote(o.extra_cost_note || "");
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
    setCustomerId(o.customer_id || null);
    setSalespersonId(o.sales_user_id || o.created_by);
    setFulfillmentStatus(o.fulfillment_status || "complete");
    setMissingSummary(o.missing_summary || "");
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
    const date = orderDateValue(orderedAt);
    if (!/^\d+$/.test(extraCost) || BigInt(extraCost) > 999999999999999n) throw new InputError("Chi phí khác phải là số nguyên từ 0 đến 999.999.999.999.999đ.");
    if (!cart.length) throw new Error("Vui lòng chọn ít nhất một mã kính.");
    const customerName = customer.trim();
    const customerPhone = phone.trim();
    if (!customerName) throw new Error("CUSTOMER_NAME_REQUIRED");
    if (!customerPhone) throw new Error("CUSTOMER_PHONE_REQUIRED");
    const manualOrderCode = orderCode.trim();
    if (!manualOrderCode) throw new Error("ORDER_CODE_REQUIRED");
    if (manualOrderCode.length > 50) throw new Error("Mã đơn hàng không được dài quá 50 ký tự.");
    if (fulfillmentStatus === "short" && !effectiveMissingSummary.trim())
      throw new Error("MISSING_SUMMARY_REQUIRED");
    if (data?.orders.some((order) => order.id !== draft?.id && order.order_no.trim().toLocaleLowerCase("vi") === manualOrderCode.toLocaleLowerCase("vi")))
      throw new Error("ORDER_CODE_EXISTS");
    const stockIssue = fulfillmentStatus === "complete" && cart.find((item) => {
      const product = data?.products.find((p) => p.id === item.product_id);
      return !product || reservedQuantity(cart,item.product_id) > product.on_hand;
    });
    if (stockIssue) {
      const product = data?.products.find(
        (p) => p.id === stockIssue.product_id,
      );
      throw new Error(
        product
          ? `${product.sku} chỉ còn ${product.on_hand} ${productUnit(product)}. Vui lòng giảm số lượng trước khi lưu hoặc xác nhận bán.`
          : "Có sản phẩm không còn tồn tại trong kho. Vui lòng xóa sản phẩm đó khỏi đơn.",
      );
    }
    const {result,data:d}=await write('save_draft',{
      id:draft?.id||null,version:draft?.version,order_code:manualOrderCode,ordered_at:date,
      extra_cost:extraCost,extra_cost_note:extraCostNote,customer_name:customerName,customer_phone:customerPhone,note,
      sale_details:{customer_id:customerId,customer_type:customerType,customer_address:address,customer_note:data?.customers.find(c=>c.id===customerId)?.note||'',sales_user_id:salespersonId||data?.me.id,fulfillment_status:fulfillmentStatus,missing_summary:fulfillmentStatus==='short'?effectiveMissingSummary:''},
      items:cart.map(i=>({product_id:i.product_id,selected_sku:i.sku_snapshot,quantity:i.quantity,custom_name:i.custom_name,price_overridden:Boolean(i.price_overridden),save_customer_price:Boolean(i.save_customer_price),zero_price_confirm:Boolean(i.zero_price_confirm),item_note:i.item_note||'',item_kind:i.item_kind||'sale',unit_sale_price:i.unit_sale_price||'0'})),
    });
    const o = d.orders.find((o) => o.id === result.id)!;
    setCustomerId(o.customer_id||null);
    setDraft(o);
    setCart(o.items);
    setDirty(false);
    return o;
  }
  function selectCustomer(id: string) {
    const selected = data?.customers.find((item) => item.id === id);
    const nextCustomerId = id || null;
    if (!selected) {
      setCustomer("");setPhone("");setAddress("");setDirty(true);
      requestPricingContext(customerType, null);
      return;
    }
    setCustomer(selected.name);
    setPhone(selected.phone);
    setAddress(selected.address);
    requestPricingContext(selected.customer_type, nextCustomerId);
    setDirty(true);
  }
  function applyPricingContext(
    next: "retail" | "wholesale",
    nextCustomerId: string | null,
    resetOverrides: boolean,
  ) {
    setCustomerType(next);
    setCustomerId(nextCustomerId);
    setCart((items) => items.map((item) => {
      const product = data?.products.find((p) => p.id === item.product_id);
      if (!product || item.item_kind && item.item_kind !== "sale" || item.price_overridden && !resetOverrides) return item;
      return { ...item, unit_sale_price: suggestedPrice(product, next, nextCustomerId), price_overridden: false, price_source: suggestedPriceSource(product, next, nextCustomerId), save_customer_price: false, zero_price_confirm: false };
    }));
    setDirty(true);
  }
  function requestPricingContext(
    next: "retail" | "wholesale",
    nextCustomerId = customerId,
  ) {
    const adjusted = cart.filter((item) => item.price_overridden).length;
    if (!adjusted) {
      applyPricingContext(next, nextCustomerId, false);
      return;
    }
    setModal({
      title: "Giữ giá đã chỉnh?",
      subtitle: "Bạn đang đổi khách hàng hoặc loại khách khi đơn đã có giá bán tùy chỉnh.",
      body: (
        <div className="stack">
          <button type="button" className="primary" onClick={() => {
            applyPricingContext(next, nextCustomerId, false);
            setModal(null);
            setToast(`Đã giữ nguyên giá đã chỉnh của ${adjusted} sản phẩm.`);
          }}>Giữ các giá đã chỉnh</button>
          <button type="button" onClick={() => {
            applyPricingContext(next, nextCustomerId, true);
            setModal(null);
            setToast("Đã dùng lại bảng giá theo khách hàng mới.");
          }}>Dùng giá theo khách mới</button>
        </div>
      ),
    });
  }
  function confirmForecast(p: Product, requested: number, proceed: () => void) {
    if (p.draft_quantity === undefined) return false;
    const estimate = estimateForCart(p, cart, data?.orders.find(o=>o.id===draft?.id)||draft);
    const remaining = p.on_hand - estimate.otherDrafts - requested;
    if (remaining >= 0) return false;
    setModal({
      title: "Cảnh báo tồn dự kiến",
      body: <><p><b>{p.sku}</b></p><p>Tồn thực tế: {p.on_hand} {productUnit(p)}. Các nháp khác đã đặt: {estimate.otherDrafts} {productUnit(p)}.</p><p>Đơn này cần {requested} {productUnit(p)}; dự kiến thiếu <b>{-remaining} {productUnit(p)}</b>.</p><p>Hàng còn trong kho có thể đã được đặt hết trong các đơn nháp. Bạn có muốn tiếp tục? Thao tác này chưa giữ hàng hoặc trừ kho.</p></>,
      submit: "Vẫn thêm vào đơn",
      onSubmit: async () => { proceed(); },
    });
    return true;
  }
  function add(p: Product, kind: Item["item_kind"] = "sale", forecastConfirmed = false) {
    if (busy) return;
    const selected = reservedQuantity(cart,p.id);
    if (fulfillmentStatus === "complete" && selected >= p.on_hand) {
      setToast(`${p.sku} chỉ còn ${p.on_hand} ${productUnit(p)} trong kho.`);
      return;
    }
    if (!forecastConfirmed && confirmForecast(p, selected + 1, () => add(p, kind, true))) return;
    setCart((old) => {
      const found = old.find((i) => i.product_id === p.id && (i.item_kind||"sale")===kind);
      return found
        ? old.map((i) =>
            i.product_id === p.id && (i.item_kind||"sale")===kind ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...old,
            {
              product_id: p.id,
              quantity: 1,
              sku_snapshot:old.find(row=>row.product_id===p.id)?.sku_snapshot||p.sku,
              custom_name: null,
              unit_sale_price: kind === "sale" ? suggestedPrice(p) : "0",
              price_overridden: false,
              price_source: suggestedPriceSource(p),
              quoted_price_version: p.price_version,
              item_kind: kind,
              item_note: "",
            },
          ];
    });
    setDirty(true);
  }
  function changeQty(id: string, quantity: number, forecastConfirmed = false) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000)
      return;
    const item = cart.find((i) => lineKey(i) === id);
    const product = data?.products.find((p) => p.id === item?.product_id);
    if (
      fulfillmentStatus === "complete" &&
      product &&
      quantity + reservedQuantity(cart,product.id) - (item?.quantity||0) > product.on_hand &&
      quantity >= (item?.quantity || 0)
    ) {
      setToast(`${product.sku} chỉ còn ${product.on_hand} ${productUnit(product)} trong kho.`);
      return;
    }
    if (product && item && quantity > item.quantity && !forecastConfirmed && confirmForecast(product, quantity + reservedQuantity(cart,product.id) - item.quantity, () => changeQty(id, quantity, true))) return;
    setCart((c) =>
      c.map((i) => (lineKey(i) === id ? { ...i, quantity } : i)),
    );
    setDirty(true);
  }
  function editLine(i: Item, p: Product) {
    const basePrice = suggestedPrice(p);
    const currentPrice = i.unit_sale_price || basePrice;
    const sameTypeSaleCount = cart.filter((item) => {
      const product = data?.products.find((row) => row.id === item.product_id);
      return categoryKey(product?.glass_type||"") === categoryKey(p.glass_type) && (item.item_kind || "sale") === "sale";
    }).length;
    const glassTypeName = typeLabels[p.glass_type] || p.glass_type;
    setModal({
      title: "Giá bán và loại hàng",
      subtitle:
        "Chọn sửa giá trong đơn hoặc lưu giá danh mục dùng chung cho các đơn sau và mọi máy.",
      body: (
        <div className="form-grid">
          <div className="field"><span>Mã kính</span><b style={{color:orderProductColor(p.glass_type,p.sku)}}>{i.sku_snapshot||p.sku}</b>{i.sku_snapshot&&i.sku_snapshot!==p.sku&&<small>Mã hiện tại: {p.sku}</small>}</div>
          <label className="field">
            Giá bán thực tế (đ)
            <input
              name="unit_sale_price"
              type="number"
              min="0"
              max="999999999999999"
              step="1"
              defaultValue={currentPrice}
              required
            />
            <small>{suggestedPriceLabel(p)}: {money(basePrice)}</small>
          </label>
          <label className="field full">
            Phạm vi áp dụng giá
            <select name="price_scope" defaultValue="line">
              <option value="line">Chỉ sản phẩm {p.sku}</option>
              <option value="glass_type">
                Toàn bộ {glassTypeName} trong đơn ({sameTypeSaleCount} sản phẩm)
              </option>
              {canPrices && <option value="catalog_retail">Lưu giá lẻ chung cho toàn bộ {glassTypeName}</option>}
              {canPrices && <option value="catalog_wholesale">Lưu giá sỉ chung cho toàn bộ {glassTypeName}</option>}
            </select>
            <small>Lưu giá chung cập nhật danh mục và hàng bán cùng nhóm trong đơn này. Giữ mức giá lẻ/sỉ còn lại, giá riêng của khách và đơn đã bán. Giá riêng của khách vẫn được ưu tiên khi lên đơn mới. {canOperate ? "Các máy tự tải danh mục mỗi 10 giây khi đang mở." : ""}</small>
          </label>
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
          {customerType === "wholesale" && (
            <label className="check full">
              <input type="checkbox" name="save_customer_price" />
              Lưu giá này cho khách sỉ ở những lần sau
            </label>
          )}
          <label className="check full">
            <input type="checkbox" name="zero_price_confirm" />
            Tôi xác nhận nếu giá bán thực tế bằng 0đ
          </label>
          <div className="hint full">
            Mã kính: <b style={{color:orderProductColor(p.glass_type,p.sku)}}>{i.sku_snapshot||p.sku}</b>{i.sku_snapshot&&i.sku_snapshot!==p.sku&&<small>Mã hiện tại: {p.sku}</small>}. Hàng tặng và hàng mẫu vẫn trừ tồn nhưng
            thành tiền bằng 0đ.
          </div>
        </div>
      ),
      submit: "Áp dụng",
      onSubmit: async (fd) => {
        const kind = String(fd.get("item_kind")) as Item["item_kind"];
        const priceInput = String(fd.get("unit_sale_price") || "").trim();
        if (!/^\d{1,15}$/.test(priceInput))
          throw new Error("Giá bán phải là số nguyên từ 0 trở lên.");
        const enteredPrice = BigInt(priceInput).toString();
        if (kind === "sale" && enteredPrice === "0" && !fd.has("zero_price_confirm"))
          throw new Error("ZERO_PRICE_CONFIRM_REQUIRED");
        if(cart.some(row=>lineKey(row)!==lineKey(i)&&row.product_id===p.id&&(row.item_kind||"sale")===kind))throw new Error("Đơn đã có dòng loại hàng này. Hãy sửa số lượng ở dòng đó.");
        const scope = String(fd.get("price_scope"));
        const catalogPrice = scope === "catalog_retail" || scope === "catalog_wholesale";
        if (catalogPrice && kind !== "sale")
          throw new InputError("Chỉ lưu giá chung từ dòng hàng bán; hàng tặng/mẫu giữ giá 0đ.");
        const bulkPrice = scope === "glass_type" || catalogPrice;
        if (catalogPrice) {
          await setBulkPrice({ glass_type: p.glass_type, price_field: scope === "catalog_wholesale" ? "wholesale_price" : "sale_price", unit_price: enteredPrice });
          // Publish the known successful write immediately. A failed read must not
          // leave the cart unchanged while the catalog has already been updated.
          setData(d => d ? { ...d, products: d.products.map(product => product.active && categoryKey(product.glass_type) === categoryKey(p.glass_type)
            ? { ...product, [scope === "catalog_wholesale" ? "wholesale_price" : "sale_price"]: enteredPrice } : product) } : d);
        }
        setCart((c) =>
          c.map((x) => {
            const targetProduct = data?.products.find((product) => product.id === x.product_id);
            const isCurrent = lineKey(x) === lineKey(i);
            const isSameTypeSale =
              bulkPrice &&
              categoryKey(targetProduct?.glass_type||"") === categoryKey(p.glass_type) &&
              (x.item_kind || "sale") === "sale";
            if (isCurrent) {
              return {
                  ...x,
                  item_kind: kind,
                  item_note: String(fd.get("item_note") || "").trim(),
                  unit_sale_price: kind === "sale" ? enteredPrice : "0",
                  price_overridden: kind === "sale" && (catalogPrice || enteredPrice !== basePrice),
                  price_source: kind === "sale" && (catalogPrice || enteredPrice !== basePrice) ? "manual" : kind === "sale" ? suggestedPriceSource(p) : "free_item",
                  save_customer_price: kind === "sale" && fd.has("save_customer_price"),
                  zero_price_confirm: kind === "sale" && enteredPrice === "0" && fd.has("zero_price_confirm"),
                };
            }
            if (isSameTypeSale && targetProduct) {
              const targetBasePrice = suggestedPrice(targetProduct);
              return {
                ...x,
                unit_sale_price: enteredPrice,
                price_overridden: catalogPrice || enteredPrice !== targetBasePrice,
                price_source: catalogPrice || enteredPrice !== targetBasePrice ? "manual" : suggestedPriceSource(targetProduct),
                save_customer_price: false,
                zero_price_confirm: enteredPrice === "0" && fd.has("zero_price_confirm"),
              };
            }
            return x;
          }),
        );
        setDirty(true);
        if (bulkPrice)
          setToast(catalogPrice ? `Đã lưu giá ${scope === "catalog_wholesale" ? "sỉ" : "lẻ"} chung ${money(enteredPrice)} cho toàn bộ ${glassTypeName}; áp dụng cho các đơn sau và mọi máy.` : `Đã áp dụng giá ${money(enteredPrice)} cho toàn bộ ${glassTypeName} trong đơn.`);
      },
    });
  }
  function rename(i: Item, p: Product) {
    editLine(i, p);
  }
  async function prepareConfirm() {
    const o = await save();
    showConfirm(o, data!.products, true);
  }
  async function confirmSavedDraft(id: string) {
    if (draft?.id === id && dirty)
      throw new InputError("Đơn nháp này đang có thay đổi chưa lưu ở màn Bán hàng. Vui lòng lưu thay đổi trước khi xác nhận.");
    const latest = await refresh();
    const order = latest.orders.find(row => row.id === id);
    if (!order || order.status !== "draft")
      throw new InputError("Đơn này không còn là bản nháp. Vui lòng kiểm tra lại danh sách đơn hàng.");
    showConfirm(order, latest.products, draft?.id === id);
  }
  function showConfirm(o: Order, products: Product[], clearConfirmedCart: boolean) {
    const isShort = o.fulfillment_status === "short";
    const deliveries = o.items.map((item) => {
      const product = products.find((row) => row.id === item.product_id);
      return { item, product, quantity: isShort ? Math.min(item.quantity, availableForLine(o.items,item,product?.on_hand||0)) : item.quantity };
    });
    const deliveryTotal = deliveries.reduce((sum, row) => sum + BigInt(row.item.unit_sale_price || 0) * BigInt(row.quantity), BigInt(o.extra_cost || 0)).toString();
    setModal({
      title: "Xác nhận bán hàng",
      subtitle:
        "Xác nhận sẽ trừ tồn kho. Có thể ghi nhận chưa trả, trả một phần hoặc toàn bộ.",
      body: (
        <>
          <p><b>Đơn: {o.order_no}</b> · {o.customer_name}</p>
          <div className="confirm-total">
            <span>{o.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm</span>
            <strong>{money(deliveryTotal)}</strong>
          </div>
          {isShort && (
            <div className="return-grid delivery-grid">
              <b>Sản phẩm</b><b>Khách đặt</b><b>Giao lần này</b>
              {orderItemsForDisplay(deliveries.map(row=>({...row,product_id:row.item.product_id,item_kind:row.item.item_kind,sku_snapshot:row.item.sku_snapshot})),products).map(({ item, product, quantity }) => (
                <div className="return-input" key={item.id}>
                  <span><b style={{color:orderProductColor(product?.glass_type,product?.sku)}}>{product?.sku}</b><small>{product?.sku} · Tồn {product?.on_hand || 0}</small></span>
                  <b>{item.quantity}</b>
                  <input aria-label={`Giao ${product?.sku}`} name={`delivery_${item.id}`} type="number" min={0} max={Math.min(item.quantity, product?.on_hand || 0)} defaultValue={quantity} />
                </div>
              ))}
              <p className="hint full">Kho và doanh thu chỉ ghi nhận số lượng giao lần này. Phần còn lại được giữ trên đơn để giao bổ sung.</p>
            </div>
          )}
          <button type="button" onClick={() => run(() => previewOrderConfirmationImage(o))}><Eye size={16} /> Xem ảnh cho khách kiểm tra trước khi xác nhận</button>
          <label className="field">
            Phương thức thanh toán
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
            deliveryTotal,
            "number",
            true,
            { min: 0, max: deliveryTotal, step: 1 },
          )}
          <p className="hint">
            Số tiền trên là khoản thực nhận khi chốt đơn. Nhập 0đ nếu đã đi đơn
            nhưng khách chưa thanh toán; các lần thu tiếp theo được ghi trong
            chi tiết đơn.
          </p>
        </>
      ),
      submit: "Xác nhận và trừ kho",
      onSubmit: async (fd) => {
        await write("confirm_order", {
          id: o.id,
          version: o.version,
          payment_method: fd.get("payment_method"),
          deliveries: isShort ? deliveries.map(({ item }) => ({ order_item_id: item.id, quantity: Number(fd.get(`delivery_${item.id}`) || 0) })) : undefined,
        });
        const paid = String(fd.get("paid_amount") || "0");
        if (BigInt(paid) > 0n)
          await recordPayment({
            order_id: o.id,
            amount: paid,
            method: fd.get("payment_method"),
            note: "Thanh toán khi xác nhận đơn",
          });
        await refresh();
        if (clearConfirmedCart) clearCart();
        setToast("Đã xác nhận đơn và cập nhật tình trạng thanh toán.");
      },
    });
  }
  function manageGlassBrands() {
    setModal({
      title: "Thương hiệu",
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
    if(!canProducts)return;
    setModal({
      title: p ? "Chỉnh sửa mã kính" : "Thêm sản phẩm",
      subtitle: "Thông tin sản phẩm được lưu chung cho tất cả máy.",
      body: (
        <div className="form-grid product-form">
          {field("Mã kính", "sku", p?.sku, "text", true, { maxLength: 50 })}
          <label className="field">
            Loại kính
            <select aria-label="Loại kính" name="glass_type" defaultValue={categoryKey(p?.glass_type || "clear")}>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">Hãng điện thoại
            <input name="brand" aria-label="Hãng điện thoại" list="phone-brand-options" defaultValue={p?.brand || "Apple"} required maxLength={100} placeholder="Chọn hoặc nhập hãng mới" />
            <datalist id="phone-brand-options">
              {[...new Set(["Apple", "Samsung", "OPPO", "Vivo", "Xiaomi", "Realme", "Honor", "Huawei", ...data!.products.map(product => product.brand)])].filter(Boolean).sort((a,b) => a.localeCompare(b)).map(brand => <option key={brand} value={brand} />)}
            </datalist>
            <small>Chọn hãng có sẵn hoặc gõ hãng mới. Hãng được lưu cùng sản phẩm.</small>
          </label>
          <label className="field">
            Thương hiệu
            <select
              aria-label="Thương hiệu"
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
              Thêm hãng mới bằng nút “Thương hiệu” trên trang Kho hàng.
            </small>
          </label>
          {field(
            "Giá bán (đ)",
            "sale_price",
            p?.sale_price || "0",
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1, readOnly:!canPrices },
          )}
          {field(
            "Giá sỉ mặc định (đ)",
            "wholesale_price",
            p?.wholesale_price || p?.sale_price || "0",
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1, readOnly:!canPrices },
          )}
          {canSeeCosts && field(
            "Giá vốn cố định (đ)",
            "fixed_cost",
            p?.fixed_cost || "0",
            "number",
            true,
            { min: 0, max: 999999999999999, step: 1 },
          )}
          {!p && !canSeeCosts && <small className="hint full">Mã mới chưa có tồn kho. Admin cần thiết lập giá vốn trước khi xác nhận bán.</small>}
          {!p && canSeeCosts &&
            field(
              "Số lượng nhập ban đầu",
              "initial_quantity",
              0,
              "number",
              true,
              { min: 0, max: 1000000, step: 1 },
            )}
          {!p && canSeeCosts && (
            <small className="hint full">
              Kính tính theo tấm; phụ kiện tính theo sản phẩm. Nếu lớn hơn 0, ứng dụng sẽ tự tạo phiếu Tồn đầu kỳ khi lưu.
            </small>
          )}
          <label className="field full">
            Mã/dòng máy dùng chung · mỗi dòng một mã
            <textarea
              name="models"
              defaultValue={p?.models.join("\n")}
              rows={3}
            />
            <small>
              Ví dụ mã chính SAM A12 có thể nhập A13, A14, A15. Khi bán hàng,
              tìm A13 vẫn hiển thị sản phẩm SAM A12 để thay thế.
            </small>
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
            <input type="checkbox" name="zero_confirm" /> Tôi xác nhận nếu giá bán {canSeeCosts ? "hoặc giá vốn " : ""}bằng 0đ
          </label>
        </div>
      ),
      submit: "Lưu sản phẩm",
      onSubmit: async (fd) => {
        const initialQuantity = p || !canSeeCosts ? 0 : Number(fd.get("initial_quantity"));
        if (
          !Number.isSafeInteger(initialQuantity) ||
          initialQuantity < 0 ||
          initialQuantity > 1000000
        )
          throw new Error(
            "Số lượng nhập ban đầu phải là số nguyên từ 0 đến 1.000.000.",
          );
        if (
          (fd.get("sale_price") === "0" || (canSeeCosts && fd.get("fixed_cost") === "0")) &&
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
          const saved = await write("product", {
            id: p?.id || null,
            version: p?.version,
            sku: fd.get("sku"),
            name: p?.name || String(fd.get("sku") || "").trim().toUpperCase(),
            brand: String(fd.get("brand") || "").trim(),
            glass_brand_id: fd.get("glass_brand_id") || null,
            glass_type: fd.get("glass_type"),
            sale_price: fd.get("sale_price"),
            wholesale_price: fd.get("wholesale_price"),
            ...(canSeeCosts?{fixed_cost:fd.get("fixed_cost")}:{}),
            models: String(fd.get("models"))
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            active: fd.has("active"),
            image_path: imagePath,
          });
          if (initialQuantity > 0) {
            await write("inventory", {
              type: "opening",
              reason: "Tồn đầu khi tạo mã kính",
              items: [
                {
                  product_id: saved.result.id,
                  quantity: initialQuantity,
                },
              ],
            });
          }
          await refresh();
        } catch (e) {
          if (uploaded) await removeImage(uploaded);
          throw e;
        }
        setToast(
          initialQuantity > 0
            ? `Đã lưu sản phẩm và nhập tồn ban đầu ${initialQuantity} ${productUnit({glass_type:String(fd.get("glass_type"))})}.`
            : "Đã lưu sản phẩm.",
        );
      },
    });
  }
  function bulkPricing() {
    if(!canPrices)return;
    setModal({
      title: "Chỉnh giá đồng loạt",
      subtitle: "Áp dụng cùng giá cho toàn bộ mã kính đang kinh doanh thuộc nhóm đã chọn. Giá mới sẽ tự hiển thị khi lên đơn.",
      body: <div className="form-grid">
        <label className="field full">Nhóm kính<select name="glass_type" defaultValue="clear">{Object.entries(categoryLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {field("Giá bán lẻ mới (đ)", "sale_price", "0", "number", true, { min: 0, max: 999999999999999, step: 1 })}
        {field("Giá bán sỉ mới (đ)", "wholesale_price", "0", "number", true, { min: 0, max: 999999999999999, step: 1 })}
        {canSeeCosts && field("Giá vốn quy định mới (đ)", "fixed_cost", "0", "number", true, { min: 0, max: 999999999999999, step: 1 })}
        <label className="check full"><input type="checkbox" name="confirm" required /> Tôi xác nhận cập nhật đồng loạt các mã kính thuộc nhóm này</label>
      </div>,
      submit: "Áp dụng bảng giá",
      onSubmit: async (fd) => {
        const result = await setBulkPrice({ glass_type: fd.get("glass_type"), sale_price: fd.get("sale_price"), wholesale_price: fd.get("wholesale_price"), ...(canSeeCosts?{fixed_cost:fd.get("fixed_cost")}: {}) });
        await refresh();
        setToast(`Đã cập nhật giá cho ${result.updated} mã kính.`);
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
              Mã <b style={{color:orderProductColor(p.glass_type,p.sku)}}>{p.sku}</b> vẫn còn {p.on_hand} {productUnit(p)}. Hãy điều chỉnh tồn
              kho về 0 trước khi xóa.
            </div>
          ) : (
            <p>
              Bạn có chắc muốn xóa{" "}
              <b>
                {p.sku}
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
    if(kind==='receipt'&&!canReceive||kind==='opening'&&!canSeeCosts||!['receipt','opening'].includes(kind)&&!canAdjust)return;
    const titles: Record<string, string> = {
      receipt: "Nhập hàng",
      opening: "Tồn đầu kỳ",
      issue: "Xuất kho",
      damage: "Ghi nhận kính lỗi",
      adjustment: "Điều chỉnh tồn kho",
    };
    const balances = new Map(
      data!.products.map((p) => [p.id, p.stock_version]),
    );
    setModal({
      title: titles[kind],
      subtitle:
        kind === "receipt"
          ? "Chọn nhập một mã hoặc nhập nhiều mã bằng file Excel."
          : "Thao tác được ghi vào lịch sử kho.",
      body: (
        <>
          {kind === "receipt" ? (
            <InventoryReceiptFields canSeeCosts={canSeeCosts} products={data!.products} initialProduct={p} onDownloadTemplate={() => run(downloadInventoryTemplate)} onModeChange={mode => setModal(current => current ? { ...current, submit: mode === "excel" ? "Nhập file Excel" : "Xác nhận ghi kho" } : null)} />
          ) : kind === "adjustment" ? (
            <StockAdjustmentFields products={data!.products} initialProduct={p} />
          ) : (
            <>
              <label className="field">
                Mã kính
                <select name="product_id" defaultValue={p?.id}>
                  {data!.products.map((product) => (
                    <option key={product.id} value={product.id}>{product.sku} (tồn {product.on_hand})</option>
                  ))}
                </select>
              </label>
              {field(kind === "adjustment" ? "Số lượng thực đếm" : "Số lượng", "quantity", kind === "adjustment" ? p?.on_hand || 0 : 1, "number", true, { min: kind === "adjustment" ? 0 : 1, max: 1000000, step: 1 })}
            </>
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
        const inventoryMode = String(fd.get("inventory_mode") || "single");
        const id = String(fd.get("product_id"));
        const adjustmentProduct=data!.products.find(product=>product.id===id);
        const adjustedQuantity=kind==='adjustment'?stockAdjustmentTarget(adjustmentProduct?.on_hand??-1,String(fd.get('adjustment_mode')),String(fd.get('adjustment_amount'))):Number(fd.get('quantity'));
        if(kind==='adjustment'&&!String(fd.get('reason')||'').trim())throw new InputError('Vui lòng nhập lý do điều chỉnh tồn kho.');
        let items: Record<string, unknown>[] = [{
          product_id: id,
          quantity: adjustedQuantity,
          stock_version: balances.get(id),
          ...(kind === "receipt" && canSeeCosts ? { purchase_price: fd.get("purchase_price") } : {}),
        }];
        const excelFile = fd.get("inventory_excel");
        if (kind === "receipt" && inventoryMode === "excel" && excelFile instanceof File && excelFile.size) {
          const catalog = canSeeCosts ? await readProductWorkbook(excelFile) : null;
          if (catalog) {
            await write("import_products", { items: catalog, reason: fd.get("reason") });
            const quantity = catalog.reduce((sum, row) => sum + row.quantity, 0);
            setToast(`Đã nhập ${catalog.length} mã kính và cập nhật giá. ${quantity ? `Đã cộng ${quantitySummary(catalog.map(row=>({quantity:row.quantity||0,unit:productUnit({glass_type:row.glass_type})})))} vào kho.` : "Tồn kho được giữ nguyên."}`);
            return;
          }
          const rows = await readInventoryWorkbook(excelFile,!canSeeCosts);
          items = rows.map((row) => ({ sku: row.sku, quantity: row.quantity,...(canSeeCosts?{purchase_price:row.purchase_price}:{}) }));
        }
        if (kind === "receipt" && inventoryMode === "excel" && !(excelFile instanceof File && excelFile.size)) throw new Error("Vui lòng chọn file Excel đã điền.");
        if (canSeeCosts && kind === "receipt" && inventoryMode === "single" && String(fd.get("purchase_price") || "") === "") throw new Error("Vui lòng nhập đơn giá mua.");
        await write("inventory", {
          type: kind,
          reason: fd.get("reason"),
          items,
        });
        setToast(kind === "receipt" && inventoryMode === "excel" ? "Đã cập nhật kho. Mã mới được tạo tự động; hãy thiết lập giá bán trước khi bán." : "Đã cập nhật kho.");
      },
    });
  }
  function editCustomer(customerRow?: Workspace["customers"][number]) {
    setModal({
      title: customerRow ? "Sửa khách hàng" : "Thêm khách hàng",
      subtitle: "Thông tin đã lưu có thể chọn lại khi tạo đơn tiếp theo.",
      body: <div className="form-grid">
        {field("Tên khách hàng", "name", customerRow?.name || "", "text", true, { maxLength: 200 })}
        {field("Số điện thoại", "phone", customerRow?.phone || "", "tel", true, { maxLength: 30 })}
        <label className="field">Loại khách<select name="customer_type" defaultValue={customerRow?.customer_type || "retail"}><option value="retail">Khách lẻ</option><option value="wholesale">Khách sỉ</option></select></label>
        {field("Địa chỉ", "address", customerRow?.address || "", "text", false, { maxLength: 500 })}
        {field("Ghi chú", "note", customerRow?.note || "", "text", false, { maxLength: 1000 })}
      </div>,
      submit: "Lưu khách hàng",
      onSubmit: async (fd) => {
        await saveCustomer({ id: customerRow?.id, name: fd.get("name"), phone: fd.get("phone"), customer_type: fd.get("customer_type"), address: fd.get("address"), note: fd.get("note") });
        await refresh();
        setToast("Đã lưu thông tin khách hàng.");
      },
    });
  }
  function deleteCustomer(customerRow: Workspace["customers"][number]) {
    setModal({
      title: "Xóa khách hàng?",
      body: <p>Khách <b>{customerRow.name}</b> sẽ không còn trong danh sách chọn nhanh. Đơn hàng cũ vẫn giữ nguyên thông tin.</p>,
      submit: "Xóa khách hàng",
      danger: true,
      onSubmit: async () => { await saveCustomer({ action: "delete", id: customerRow.id }); await refresh(); setToast("Đã xóa khách hàng khỏi danh sách."); },
    });
  }
  async function exportOrder(o: Order) {
    await downloadOrderWorkbook({
      orderNo: o.order_no,
      customerName: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address || "",
      sales: o.sales_name || o.creator_name,
      orderedAt: dateText(o.ordered_at || o.confirmed_at || o.created_at),
      note: o.note,
      extraCost: Number(o.extra_cost || 0),
      extraCostNote: o.extra_cost_note || "",
      fulfillment: o.fulfillment_status === "short" ? "Còn thiếu hàng" : "Đủ hàng",
      missingSummary: o.missing_summary || "",
      items: o.items.map((item) => ({
        product_id:item.product_id,
        kind:item.item_kind||"sale",
        glassType:data?.products.find(p=>p.id===item.product_id)?.glass_type,
        unit:productUnit(data?.products.find(p=>p.id===item.product_id)),
        sku: item.sku_snapshot || data?.products.find((p) => p.id === item.product_id)?.sku || "",
        name: item.sku_snapshot || data?.products.find((p) => p.id === item.product_id)?.sku || "",
        quantity: item.quantity,
        deliveredQuantity: o.status === "draft" ? undefined : Number(item.delivered_quantity ?? item.quantity),
        missingQuantity: o.status === "draft" ? undefined : Number(item.missing_quantity ?? Math.max(0, item.quantity - Number(item.delivered_quantity ?? item.quantity))),
        unitPrice: Number(item.unit_sale_price || 0),
        note: item.item_note || "",
        models: item.models_snapshot ?? data?.products.find(p => p.id === item.product_id)?.models ?? [],
      })),
    });
  }
  function orderConfirmationData(o: Order) {
    return {
      orderNo: o.order_no,
      customerName: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address || "",
      sales: o.sales_name || o.creator_name,
      orderedAt: dateText(o.ordered_at || o.confirmed_at || o.created_at),
      note: o.note,
      extraCost: Number(o.extra_cost || 0),
      extraCostNote: o.extra_cost_note || "",
      fulfillment: o.fulfillment_status === "short" ? "Còn thiếu hàng" : "Đủ hàng",
      missingSummary: o.missing_summary || "",
      items: o.items.map((item) => ({
        product_id:item.product_id,
        kind:item.item_kind||"sale",
        glassType:data?.products.find(p=>p.id===item.product_id)?.glass_type,
        unit:productUnit(data?.products.find(p=>p.id===item.product_id)),
        sku: item.sku_snapshot || data?.products.find((p) => p.id === item.product_id)?.sku || "",
        name: item.sku_snapshot || data?.products.find((p) => p.id === item.product_id)?.sku || "",
        quantity: item.quantity,
        deliveredQuantity: o.status === "draft" ? undefined : Number(item.delivered_quantity ?? item.quantity),
        missingQuantity: o.status === "draft" ? undefined : Number(item.missing_quantity ?? Math.max(0, item.quantity - Number(item.delivered_quantity ?? item.quantity))),
        unitPrice: Number(item.unit_sale_price || 0),
        note: item.item_note || "",
        models: item.models_snapshot ?? data?.products.find(p => p.id === item.product_id)?.models ?? [],
      })),
    };
  }
  async function exportOrderConfirmationImage(o: Order) {
    return downloadOrderImage(orderConfirmationData(o));
  }
  async function exportCurrentOrderWorkbook() {
    const visibleItems = cart.map((item) => {
      const product = data?.products.find((row) => row.id === item.product_id);
      return {
        product_id:item.product_id,
        kind:item.item_kind||"sale",
        glassType:data?.products.find(p=>p.id===item.product_id)?.glass_type,
        unit:productUnit(data?.products.find(p=>p.id===item.product_id)),
        sku: item.sku_snapshot||product?.sku || "",
        name: item.sku_snapshot||product?.sku || "",
        quantity: item.quantity,
        unitPrice: Number(item.unit_sale_price || 0),
        note: item.item_note || "",
        models: product?.models || [],
      };
    });
    const order = await save();
    return downloadOrderWorkbook({
      ...orderConfirmationData(order),
      items: visibleItems,
    });
  }
  async function previewOrderConfirmationImage(o: Order) {
    const image = await createOrderImage(orderConfirmationData(o));
    setOrderImagePreview({
      blob: image.blob,
      url: URL.createObjectURL(image.blob),
      filename: image.filename,
    });
  }
  async function exportReport() {
    if (!report) return;
    await downloadWorkbook(`bao-cao-${from}-${to}.xlsx`, reportSheets(report,canSeeCosts,data?.products));
  }
  async function downloadInventoryTemplate() {
    if(!canSeeCosts){await downloadWorkbook("Nhap-kho-so-luong.xlsx",[{name:"Nhập kho",columns:["Mã kính","Số lượng"],rows:[]}]);return;}
    await downloadWorkbook("mau-nhap-kho-oufeidun.xlsx", [
      {
        name: "Nhập kho",
        columns: productExcelColumns,
        rows: [],
      },
      {
        name: "Hướng dẫn",
        columns: ["Nội dung", "Ví dụ"],
        rows: [
          ["Mỗi mã một dòng. Mã mới tự tạo, mã cũ cập nhật loại/hãng/dòng máy và cả ba giá theo file. Giữ ảnh/trạng thái/lịch sử.", ""],
          ["Các máy dùng chung ngăn bằng dấu phẩy; không tách dấu /. Có thể để trống nếu chưa có máy tương thích.", "iPhone 15, iPhone 16, OPPO A58/A60"],
          ["Loại kính: Kính trong, Chống nhìn trộm, Kính full viền, Không viền cao cấp, Kính nhám, Khác.", "Kính trong"],
          ["Hãng điện thoại/hãng kính mới tự lưu. Bỏ trống hãng kính = chưa phân loại; bỏ trống hãng điện thoại = other.", "Apple"],
          ["Ba cột giá bắt buộc, nguyên đồng không âm; giá 0 được lưu đúng bằng 0. Công thức cần kết quả đã lưu. Tối đa 100 mã/file, 10 MB.", "25.000"],
          ["Số lượng là lượng nhập thêm (không phải tồn cuối), nguyên từ 0 đến 1.000.000. Điền 0 nếu chỉ sửa danh mục/giá; không bỏ trống. Mỗi lần nhập file mới cộng tiếp số lượng.", 10],
          ["Tự tạo phiếu nhập và lịch sử kho. Mẫu không có giá mua nên phiếu để trống giá mua, giữ riêng giá vốn cố định.", ""],
          ["File cũ tám cột không có số lượng vẫn chỉ cập nhật danh mục. File ba cột Mã kính/Số lượng/Giá nhập vẫn nhập kho như trước.", ""],
        ],
      },
    ]);
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
            Phương thức nhận tiền đợt này
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
    const canEdit = canOperate || o.created_by === data!.me.id;
    const due = BigInt(o.outstanding_amount ?? o.total_amount);
    setModal({
      title: o.order_no,
      subtitle: `${statusLabels[o.status]} · Sales: ${o.sales_name || o.creator_name} · Đặt: ${dateText(o.ordered_at || o.confirmed_at || o.created_at)}`,
      body: (
        <>
          {!canEdit && <p className="hint">Đơn do {o.creator_name} tạo. Bạn chỉ có quyền xem, in và tải chứng từ của đơn này.</p>}
          <div className="order-customer">
            <div>
              <span>Tên khách hàng</span>
              <b>{o.customer_name || "Chưa cập nhật"}</b>
            </div>
            <div>
              <span>Số điện thoại</span>
              <b>{o.customer_phone || "Chưa cập nhật"}</b>
            </div>
            <div className="order-customer-address">
              <span>Địa chỉ</span>
              <b>{o.customer_address || "Chưa cập nhật"}</b>
            </div>
          </div>
          <div className="order-finance-summary">
            <div>
              <span
                className={`badge ${o.payment_status === "paid" ? "teal" : o.payment_status === "partial" ? "amber" : "red"}`}
              >
                {paymentStatusLabels[o.payment_status || "unpaid"]}
              </span>
              <small>
                {o.payment_status === "paid"
                  ? "Đã thu đủ"
                  : o.payment_status === "partial"
                    ? `Đã thu ${money(o.paid_amount || 0)} · Còn ${money(due)}`
                    : "Chưa ghi nhận thanh toán"}
              </small>
            </div>
            <div>
              <span>Tổng đơn</span>
              <strong>{money(o.total_amount)}</strong>
              <small>Tiền sản phẩm: {money(BigInt(o.total_amount) - BigInt(o.extra_cost || 0))}</small>
              <small>Chi phí khác: {money(o.extra_cost || 0)}{o.extra_cost_note ? ` · ${o.extra_cost_note}` : ""}</small>
            </div>
          </div>
          <div className="order-section-heading">
            <b>Sản phẩm</b>
            <span>{itemQuantitySummary(o.items,data!.products)}</span>
          </div>
          {o.fulfillment_status === "short" && <div className="excel-instruction"><b>Còn thiếu hàng</b><span style={{ whiteSpace: "pre-wrap" }}>{o.missing_summary || "Còn sản phẩm chưa giao đủ."}</span><small>Ghi chú thiếu ngoài các dòng hàng không tự tính tiền hoặc trừ kho.</small></div>}
          <div className="detail-lines order-product-lines">
            {orderItemsForDisplay(o.items,data!.products).map((i) => {
              const p = data!.products.find((p) => p.id === i.product_id);
              return (
                <div className="order-detail-product" key={i.id}>
                  {p && <button className="order-product-photo" aria-label={`Xem ảnh ${p.sku}`} onClick={() => setModal({ title: `Ảnh sản phẩm · ${p.sku}`, className: "product-photo-modal", body: <div className="product-photo-preview"><ProductArt product={p} /></div> })} type="button"><ProductArt product={p} /></button>}
                  <span className="order-detail-product-info">
                    <b style={{color:orderProductColor(p?.glass_type,i.sku_snapshot||p?.sku)}}>{i.sku_snapshot || p?.sku}</b>{p&&i.sku_snapshot&&i.sku_snapshot!==p.sku&&<small>Mã hiện tại: {p.sku}</small>}
                    <small>
                      {i.sku_snapshot || p?.sku} · Đặt {i.quantity} {productUnit(p)} · Đã giao {i.delivered_quantity || 0} · Còn thiếu {Math.max(0, i.quantity - (i.delivered_quantity || 0))}
                      {i.item_kind && i.item_kind !== "sale"
                        ? ` · ${i.item_kind === "gift" ? "Hàng tặng" : "Hàng mẫu"}`
                        : ""}
                      {i.item_note && ` · ${i.item_note}`}
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
          {!!o.deliveries?.length && (
            <details className="order-history-details" open={o.fulfillment_status === "short"}>
              <summary>Lịch sử giao hàng ({o.deliveries.length} lần)</summary>
              <div>
                {o.deliveries.map((delivery) => (
                  <div className="delivery-history-batch" key={delivery.id}>
                    <div className="return-row">
                      <span>
                        <b>Lần {delivery.sequence_no}</b> · {dateText(delivery.delivered_at)}
                        <small>{delivery.delivery_kind === "initial" ? "Giao khi xác nhận đơn" : "Giao bổ sung"} · {delivery.actor_name}</small>
                      </span>
                      <b>{itemQuantitySummary(delivery.items.map(item=>({product_id:o.items.find(row=>row.id===item.order_item_id)?.product_id||"",quantity:item.quantity})),data!.products)} · {money(delivery.total_amount)}</b>
                    </div>
                    <div className="delivery-history-items">
                      {orderItemsForDisplay(delivery.items.map(item=>({...item,product_id:o.items.find(row=>row.id===item.order_item_id)?.product_id,item_kind:o.items.find(row=>row.id===item.order_item_id)?.item_kind})),data!.products).map((item) => (
                        <div key={item.order_item_id}>
                          <span>{item.sku || "Mã kính"}</span>
                          <b>{item.quantity} {productUnit(data!.products.find(p=>p.id===o.items.find(row=>row.id===item.order_item_id)?.product_id))} × {money(item.unit_price)} = {money(item.amount)}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          {!!o.payments?.length && (
            <details className="order-history-details">
              <summary>Lịch sử thanh toán ({o.payments.length})</summary>
              <div>
                {o.payments.map((p) => (
                  <div className="return-row" key={p.id}>
                    <span>
                      {paymentLabels[p.method]} · {dateText(p.paid_at)}
                      <small>{p.note || p.actor_name}</small>
                    </span>
                    <b>{money(p.amount)}</b>
                  </div>
                ))}
              </div>
            </details>
          )}
          {!!o.returns?.length && (
            <details className="order-history-details">
              <summary>Lịch sử trả hàng ({o.returns.length})</summary>
              <div>
                {o.returns.map((record) => (
                  <div className="return-row" key={record.id}>
                    <span>
                      {record.return_no} · {dateText(record.posted_at)}
                      <small>{record.reason}</small>
                    </span>
                    <b>Hoàn {money(record.refund_amount)}</b>
                    {canReturns && <button type="button" onClick={() => {
                      setModal(null);
                      abandon(() => { void run(async () => {
                        const {result,data:updated} = await write("exchange", {return_id:record.id});
                        const exchange = updated.orders.find(order => order.id === result.id);
                        if (!exchange) throw new Error("Không tải được đơn đổi hàng. Vui lòng tải lại danh sách.");
                        if (exchange.status === "draft") openDraft(exchange); else showOrder(exchange);
                        setToast("Đã mở đơn đổi hàng liên kết với phiếu trả.");
                      }); });
                    }}>Tạo đơn đổi</button>}
                  </div>
                ))}
              </div>
            </details>
          )}
          {o.note && <p className="hint">{o.note}</p>}
          <div className="actions">
            <button type="button" onClick={() => run(() => previewOrderConfirmationImage(o))}><Eye size={16} /> Xem ảnh xác nhận</button>
            <button type="button" onClick={() => run(async () => { if (await exportOrderConfirmationImage(o)) setToast("Đã tải ảnh xác nhận đơn hàng."); })}><Download size={16} /> Tải ảnh PNG</button>
            {canEdit && ['draft','confirmed','partially_returned','returned'].includes(o.status) && <button type="button" onClick={() => setModal({
              title: "Sửa ngày giờ đặt đơn",
              subtitle: "Chỉ sửa ngày đặt trên đơn; lịch sử giao hàng, hoàn hàng và thu tiền giữ thời gian thực tế.",
              body: field("Ngày giờ đặt đơn (giờ Việt Nam)","ordered_at",vietnamDateInput(o.ordered_at || o.confirmed_at || o.created_at),"datetime-local",true,{min:"2000-01-01T00:00",max:"2100-12-31T23:59"}),
              submit: "Xác nhận ngày giờ",
              onSubmit: async fd => { const {data: refreshed} = await write("order_date",{id:o.id,version:o.version,ordered_at:orderDateValue(String(fd.get('ordered_at')))}); showOrder(refreshed.orders.find(row=>row.id===o.id)!); setToast("Đã cập nhật ngày giờ đặt đơn."); },
            })}>Sửa ngày giờ đặt đơn</button>}
            <button type="button" onClick={() => showBill(o)}>
              In / lưu PDF
            </button>
            {canEdit && o.status !== "draft" && due > 0n && (
              <button
                type="button"
                className="primary"
                onClick={() => addOrderPayment(o)}
              >
                Thu thêm
              </button>
            )}
            {canEdit && o.status === "confirmed" && o.fulfillment_status === "short" && o.items.some(item => item.quantity > (item.delivered_quantity || 0)) && (
              <button type="button" className="primary" onClick={() => deliverMissingOrder(o)}>
                Giao bổ sung
              </button>
            )}
            {canEdit && o.status === "confirmed" && o.fulfillment_status === "short" && o.items.every(item => item.quantity <= (item.delivered_quantity || 0)) && <button type="button" className="primary" onClick={() => setModal({
              title: "Xác nhận đã xử lý phần còn thiếu?",
              body: <><p style={{ whiteSpace: "pre-wrap" }}>{o.missing_summary}</p><p>Các dòng hàng trong đơn đã giao đủ. Chỉ xác nhận khi ghi chú còn thiếu đã được xử lý. Thao tác này đổi tình trạng thành Đủ hàng, không ghi nhận giao hàng, thu tiền hoặc trừ kho.</p></>,
              submit: "Đã xử lý, chuyển Đủ hàng",
              onSubmit: async () => { await write("resolve_shortage", { id: o.id, version: o.version }); setToast("Đã cập nhật tình trạng Đủ hàng."); },
            })}>Hoàn tất phần còn thiếu</button>}
            {o.status === "draft" && canEdit ? (
              <>
                <button type="button" className="primary" onClick={() => run(() => confirmSavedDraft(o.id))}>
                  <Check size={16} /> Xác nhận bán
                </button>
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
              canReturns &&
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
  function deliverMissingOrder(o: Order) {
    const pending = o.items.filter((item) => (item.delivered_quantity || 0) < item.quantity);
    setModal({
      title: `Giao bổ sung · ${o.order_no}`,
      className: "supplemental-modal",
      subtitle: "Chỉ số lượng giao thực tế được trừ kho và cộng vào doanh thu.",
      body: <SupplementalDeliveryFields order={o} products={data!.products} />,
      submit: "Xác nhận giao bổ sung",
      onSubmit: async (fd) => {
        const items = pending.map((item) => ({ order_item_id: item.id, quantity: Number(fd.get(`delivery_${item.id}`) || 0) })).filter((item) => item.quantity > 0);
        if (!items.length) throw new Error("Vui lòng chọn ít nhất một sản phẩm có số lượng giao lớn hơn 0.");
        await write("deliver_order", { id: o.id, version: o.version, items, payment_amount: String(fd.get("payment_amount") || "0"), payment_method: String(fd.get("payment_method") || "cash") });
        const updated = await refresh();
        const order = updated.orders.find((row) => row.id === o.id);
        setToast(order?.fulfillment_status === "complete" ? "Đã giao đủ hàng và hoàn thành đơn." : "Đã ghi nhận đợt giao bổ sung.");
      },
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
        "Tiền hoàn tính theo giá bán gốc. Chỉ số lượng bán lại được mới cộng vào kho.",
      body: (
        <>
          <div className="return-grid">
            <b>Sản phẩm</b>
            <b>Trả</b>
            <b>Bán lại được</b>
            {orderItemsForDisplay(o.items,data!.products)
              .filter((i) => (i.delivered_quantity || 0) > (i.returned_quantity || 0))
              .map((i) => (
                <div className="return-input" key={i.id}>
                  <span>
                    <b style={{color:orderProductColor(data?.products.find(p=>p.id===i.product_id)?.glass_type,i.sku_snapshot||'')}}>{i.sku_snapshot || data?.products.find(p => p.id === i.product_id)?.sku}</b>
                    <small>
                      {i.sku_snapshot} · còn trả được{" "}
                      {(i.delivered_quantity || 0) - (i.returned_quantity || 0)}
                    </small>
                  </span>
                  <input
                    aria-label={`Trả ${i.sku_snapshot}`}
                    name={`qty_${i.id}`}
                    type="number"
                    min={0}
                    max={(i.delivered_quantity || 0) - (i.returned_quantity || 0)}
                    defaultValue={0}
                  />
                  <input
                    aria-label={`Nhập lại ${i.sku_snapshot}`}
                    name={`stock_${i.id}`}
                    type="number"
                    min={0}
                    max={(i.delivered_quantity || 0) - (i.returned_quantity || 0)}
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
    const target = id ? data?.users.find((user) => user.id === id) : undefined;
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
          {field(
            "Nhập lại mật khẩu",
            "password_confirm",
            "",
            "password",
            true,
            {
              minLength: 12,
              autoComplete: "new-password",
              placeholder: "Nhập lại đúng mật khẩu ở trên",
            },
          )}
        </>
      ),
      submit: self ? "Đổi mật khẩu" : "Lưu tài khoản",
      onSubmit: async (fd) => {
        if (fd.get("password") !== fd.get("password_confirm"))
          throw new Error("PASSWORD_CONFIRM_MISMATCH");
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
          await forgetOnlineSession();
          setData(null);
          setToast("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
          return;
        }
        await refresh();
        setToast(
          id && target
            ? `Đã đặt lại mật khẩu cho tài khoản “${target.display_name}”.`
            : "Đã tạo tài khoản nhân viên.",
        );
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
    try {
      await releaseOnlineSession();
    } finally {
      clearCart();
      setData(null);
      setModal(null);
      setReport(null);
      setError("");
    }
  }
  const products =
    data?.products.filter(
      (p) =>
        (page === "stock" || p.active) &&
        (filter === "all" || categoryKey(p.glass_type) === categoryKey(filter)) &&
        (page !== "stock" || stockGroup === "all" || (stockGroup === "accessory" ? isAccessory(p) : !isAccessory(p))) &&
        (glassBrand === "all" || p.glass_brand_id === glassBrand) &&
        [p.sku, p.name, ...(p.sku_aliases||[]), ...p.models].some((value) =>
          containsProductSearch(value, query),
        ),
    ).sort((a, b) => productSearchRank(a, query) - productSearchRank(b, query)) || [];
  const businessLogs = (data?.logs || []).filter((log) =>
    log.action === "confirm_order" || log.action === "deliver_order" ||
    log.action === "product.rename" ||
    (log.action === "inventory" && /^(receipt|opening|adjustment):/.test(log.detail || "")),
  );
  const auditActors = Array.from(
    new Set(businessLogs.map((log) => log.actor_name)),
  ).sort((a, b) => a.localeCompare(b, "vi"));
  const filteredLogs = businessLogs.filter((log) => {
    const occurredAt = new Date(log.created_at).getTime();
    const fromTime = auditFrom
      ? new Date(`${auditFrom}T00:00:00+07:00`).getTime()
      : Number.NEGATIVE_INFINITY;
    const toTime = auditTo
      ? new Date(`${auditTo}T00:00:00+07:00`).getTime() + 86_400_000
      : Number.POSITIVE_INFINITY;
    return (
      (auditActor === "all" || log.actor_name === auditActor) &&
      occurredAt >= fromTime &&
      occurredAt < toTime
    );
  });
  const nav = [
    ["sale","Bán hàng",ShoppingCart],["lookup","Mã dùng chung",Search],
    ["orders","Đơn hàng",FileText],["drafts","Đơn nháp",FileText],
    ["customers","Khách hàng",UserRound],["stock","Kho hàng",Package],
    ["reports","Báo cáo",BarChart3],["users","Nhân viên",Users],
    ["audit","Lịch sử thao tác",History],
  ] as const;
  const navigate = (next: string) => {
    setPage(next);
    setQuery("");
    setFilter("all");
    setGlassBrand("all");
    setError("");
  };
  const title = nav.find((n) => n[0] === page)?.[1] || "Bán hàng";
  const subtitles: Record<string, string> = {
    sale: "Chọn kính và lưu đơn nháp trước khi chốt bán",
    lookup: "Tra mã kính và xem toàn bộ dòng máy dùng chung",
    stock: "Quản lý kính, phụ kiện, giá bán và số lượng tồn",
    orders: "Theo dõi đơn hàng và lịch sử bán",
    drafts: "Tiếp tục xử lý những đơn khách chưa chốt",
    reports: "Theo dõi kết quả bán hàng theo khoảng thời gian",
    customers: "Lưu thông tin khách sỉ, khách lẻ để dùng lại khi lên đơn",
    users: "Mỗi nhân viên một tài khoản, đúng quyền thao tác",
    audit: "Lịch sử bán hàng và nhập hàng",
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
      {page === "stock" && <select aria-label="Lọc nhóm hàng" value={stockGroup} onChange={e=>{setStockGroup(e.target.value);setFilter("all");}}><option value="all">Tất cả sản phẩm</option><option value="glass">Kính</option><option value="accessory">Phụ kiện</option></select>}
      {page === "stock" && (
        <select
          aria-label="Lọc loại kính"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả phân loại</option>
          {Object.entries(searchCategoryLabels).map(([key, label]) => (
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
        <option value="all">Tất cả thương hiệu</option>
        {data?.glass_brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
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
            {window.oufeidun?.apiBaseUrl?.startsWith('shop:') && (
              <div>
                <button type="button" disabled={busy||findingServer} onClick={async()=>{
                  setFindingServer(true);setServerStatus('');
                  try{const result=await window.oufeidun?.findServer?.();setServerStatus(result?.connected?'Đã kết nối máy chủ.':result?.message||'Không tìm thấy máy chủ.');}
                  catch{setServerStatus('Không thể tìm máy chủ. Vui lòng kiểm tra kết nối mạng.');}
                  finally{setFindingServer(false);}
                }}>{findingServer?'Đang tìm máy chủ…':'Tìm máy chủ trong Wi-Fi / LAN'}</button>
                {serverStatus&&<p role="status">{serverStatus}</p>}
              </div>
            )}
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
            <p className="login-foot">
              <LockKeyhole size={13} /> Quyền truy cập được cấp bởi chủ cửa hàng
            </p>
            <AppUpdateNotice />
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
              {nav.filter(([id]) => canPage(id)).map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={page === id ? "active" : ""}
                  aria-label={label}
                  title={label}
                  onClick={() => navigate(id)}
                >
                  <Icon size={21} />
                  <span>{label}</span>
                  {(id === "drafts" || (canOperate && id === "orders")) &&
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
                  <small>{canSeeCosts ? "Admin" : "Nhân viên"}</small>
                </span>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  abandon(() => {
                    void run(logout);
                  })
                }
              >
                <LogOut size={19} /> Đăng xuất
              </button>
              <AppUpdateNotice />
            </div>
          </aside>
          <main className={`app-main app-main-${page}`}>
            <header className="page-header">
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
                      if(page==='reports')setReportRevision(value=>value+1);
                      setToast("Đã tải lại dữ liệu.");
                    })
                  }
                >
                  <RefreshCw size={18} />
                </button>
                {page === "stock" && canOperate && (
                  <>
                    <button disabled={!canProducts} onClick={manageGlassBrands}>
                      <Package size={18} /> Thương hiệu
                    </button>
                    {canReceive && <button onClick={() => inventory("receipt")}>
                      <ArrowDownToLine size={18} /> Nhập hàng
                    </button>}
                    <button disabled={!canAdjust} onClick={() => inventory("adjustment")}><SlidersHorizontal size={18} /> Điều chỉnh tồn</button>
                    <button disabled={!canPrices} onClick={bulkPricing}>
                      <SlidersHorizontal size={18} /> Bảng giá đồng loạt
                    </button>
                    <button disabled={!canProducts} className="primary" onClick={() => editProduct()}>
                      <Plus size={18} /> Thêm sản phẩm
                    </button>
                  </>
                )}
                {page === "sale" && draft && (
                  <button onClick={() => abandon(clearCart)}>
                    <Plus size={18} /> Đơn mới
                  </button>
                )}
                {page === "users" && canSeeCosts && (
                  <button className="primary" onClick={() => manageStaff()}>
                    <Plus size={18} /> Thêm nhân viên
                  </button>
                )}
                {page === "customers" && (
                  <button className="primary" onClick={() => editCustomer()}>
                    <Plus size={18} /> Thêm khách hàng
                  </button>
                )}
              </div>
            </header>
            {page === "sale" && (
              <div className="sale-layout">
                <section className="catalog">
                  <div className="catalog-controls">
                    {searchBar}
                    <div className="chips">
                      {[["all", "Tất cả"], ...Object.entries(searchCategoryLabels)].map(([k, v]) => (
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
                  </div>
                  <div className="product-grid">
                    {products.map((p) => (
                      <article key={p.id} className="product-card">
                        <button
                          className="art-button"
                          aria-label={`Thêm ${p.sku}`}
                          disabled={
                            busy ||
                            !p.on_hand ||
                            (cart.find((i) => i.product_id === p.id)
                              ?.quantity || 0) >= p.on_hand
                          }
                          onClick={() => add(p)}
                        >
                          <ProductArt product={p} />
                        </button>
                        <div className="product-info">
                          <strong style={{color:orderProductColor(p.glass_type,p.sku)}}>{p.sku}</strong>
                          
                          <ProductCompatibility product={p} query={query} />
                          <span
                            className={`badge ${p.on_hand < 10 ? "amber" : "teal"}`}
                          >
                            Tồn: {p.on_hand} {productUnit(p)}
                          </span>
                          {p.on_hand === 0 && <span className="badge red">Hết hàng</span>}
                          {p.on_hand > 0 && p.draft_quantity !== undefined && p.on_hand-p.draft_quantity <= 0 && <span className="badge red product-stock-warning">{p.on_hand===p.draft_quantity?'Hết tồn dự kiến':'Thiếu tồn dự kiến'} — {p.draft_quantity} {productUnit(p)} đang trong đơn nháp</span>}
                          {p.draft_quantity!==undefined&&<small className="product-forecast">Trong nháp: {p.draft_quantity} · Dự kiến: {p.on_hand-p.draft_quantity} {productUnit(p)}</small>}
                          <div className="product-price">
                            <span><b>{money(suggestedPrice(p))}</b><small>{suggestedPriceLabel(p)}</small></span>
                            <button
                              aria-label={`Chọn ${p.sku}`}
                              disabled={
                                busy ||
                                !p.on_hand ||
                                (cart.find((i) => i.product_id === p.id)
                                  ?.quantity || 0) >= p.on_hand
                              }
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
                  <div className="cart-scroll-body">
                  <div className="customer-fields customer-expanded">
                    <label className="customer-wide">
                      <span>Mã đơn hàng <em className="required-mark">*</em></span>
                      <input
                        aria-label="Mã đơn hàng"
                        aria-required="true"
                        required
                        placeholder="Ví dụ: 803 hoặc OFD-803"
                        maxLength={50}
                        value={orderCode}
                        onChange={(e) => { setOrderCode(e.target.value); setDirty(true); }}
                      />
                    </label>
                    <label className="customer-wide"><span>Ngày giờ đặt đơn (giờ Việt Nam)</span><input aria-label="Ngày giờ đặt đơn" type="datetime-local" required min="2000-01-01T00:00" max="2100-12-31T23:59" value={orderedAt} onChange={e=>{setOrderedAt(e.target.value);setDirty(true);}} /></label>
                    {!!data.customers.length && (
                      <label className="customer-wide">
                        <span>Tìm khách hàng đã lưu</span><CustomerSearch customers={data.customers} selectedId={customerId} onSelect={selectCustomer} />
                      </label>
                    )}
                    <label className="customer-wide">
                      <span>
                        Tên khách hàng <em className="required-mark">*</em>
                      </span>
                      <input
                        aria-label="Tên khách hàng"
                        aria-required="true"
                        required
                        placeholder="Nhập tên khách hàng"
                        maxLength={200}
                        value={customer}
                        onChange={(e) => {
                          setCustomer(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label>
                      <span>Loại khách</span>
                      <select
                        aria-label="Loại khách"
                        value={customerType}
                        onChange={(e) => {
                          requestPricingContext(e.target.value as "retail" | "wholesale");
                        }}
                      >
                        <option value="retail">Khách lẻ</option>
                        <option value="wholesale">Khách sỉ</option>
                      </select>
                    </label>
                    <label>
                      <span>
                        Số điện thoại <em className="required-mark">*</em>
                      </span>
                      <input
                        aria-label="Số điện thoại"
                        aria-required="true"
                        required
                        type="tel"
                        inputMode="tel"
                        placeholder="Nhập số điện thoại"
                        maxLength={30}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label className="customer-wide">
                      <span>Địa chỉ giao hàng / xuất bill</span>
                      <textarea
                        aria-label="Địa chỉ giao hàng"
                        placeholder="Nhập địa chỉ khách hàng (tùy chọn)"
                        maxLength={500}
                        rows={2}
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label className="customer-wide">
                      <span>Nhân viên bán hàng (Sales)</span>
                      <select aria-label="Nhân viên bán hàng" value={salespersonId || data.me.id} onChange={(e) => { setSalespersonId(e.target.value); setDirty(true); }}>
                        {(data.salespeople?.length ? data.salespeople : [data.me]).map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Tình trạng hàng</span>
                      <select aria-label="Tình trạng hàng" value={fulfillmentStatus} onChange={(e) => { setFulfillmentStatus(e.target.value as "complete" | "short"); setDirty(true); }}>
                        <option value="complete">Đủ hàng</option>
                        <option value="short">Còn thiếu hàng</option>
                      </select>
                    </label>
                    {fulfillmentStatus === "short" && <label className="customer-wide shortage-summary"><span>Sản phẩm còn thiếu</span><textarea aria-label="Sản phẩm còn thiếu" required readOnly={Boolean(automaticMissingSummary)} rows={3} placeholder="Nếu chưa giao hết dù kho còn hàng, nhập phần dự kiến giao sau" value={effectiveMissingSummary} onChange={(e) => { setMissingSummary(e.target.value); setDirty(true); }} /><small>Tự cập nhật mã và số lượng thiếu theo lượng đặt, tồn kho.</small></label>}
                  </div>
                  <div className="cart-items">
                    {cart.length ? (
                      orderItemsForDisplay(cart,data!.products).map((i) => {
                        const p = data.products.find(
                          (p) => p.id === i.product_id,
                        )!;
                        return (
                          <div className="cart-item" key={lineKey(i)}>
                            <button className="cart-product-photo" aria-label={`Xem ảnh ${p.sku}`} onClick={() => setModal({ title: `Ảnh sản phẩm · ${p.sku}`, className: "product-photo-modal", body: <div className="product-photo-preview"><ProductArt product={p} /></div> })}><ProductArt product={p} /><span>Xem ảnh</span></button>
                            <div className="cart-line">
                              <div className="line-name">
                                <b style={{color:orderProductColor(p.glass_type,p.sku)}}>{i.sku_snapshot||p.sku}</b>{i.sku_snapshot&&i.sku_snapshot!==p.sku&&<small>Mã hiện tại: {p.sku}</small>}
                                <button
                                  aria-label={`Bỏ ${p.sku}`}
                                  onClick={() => {
                                    setCart((c) =>
                                      c.filter(
                                        (x) => lineKey(x) !== lineKey(i),
                                      ),
                                    );
                                    setDirty(true);
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="line-tags">
                                {customerType === "wholesale" && (
                                  <span className="badge teal">Khách sỉ</span>
                                )}
                                {customerType === "wholesale" &&
                                  i.item_kind === "sale" && (
                                    <span className="badge amber">
                                      Giá sỉ
                                    </span>
                                  )}
                                {i.price_overridden && i.item_kind === "sale" && (
                                  <span className="badge red">Giá đã chỉnh</span>
                                )}
                                {i.item_kind && i.item_kind !== "sale" && (
                                  <span className="badge amber">
                                    {i.item_kind === "gift"
                                      ? "Hàng tặng"
                                      : "Hàng mẫu"}
                                  </span>
                                )}
                              </div>
                              {i.item_note && (
                                <small className="line-note">{i.item_note}</small>
                              )}
                              <span>{money(i.unit_sale_price)}</span>
                              <button
                                className="line-edit-button"
                                aria-label={`Tùy chỉnh ${p.sku}`}
                                onClick={() => rename(i, p)}
                              >
                                <Pencil size={14} /> Giá bán, loại hàng
                              </button>
                              <div className="gift-line-actions"><button type="button" aria-label={`Thêm hàng tặng ${p.sku}`} onClick={()=>add(p,"gift")}>+ Hàng tặng</button><button type="button" aria-label={`Thêm hàng mẫu ${p.sku}`} onClick={()=>add(p,"sample")}>+ Hàng mẫu</button></div>
                              <div className="line-bottom">
                                <div className="stepper">
                                  <button
                                    aria-label={`Giảm ${p.sku}`}
                                    onClick={() =>
                                      changeQty(lineKey(i), i.quantity - 1)
                                    }
                                    disabled={i.quantity === 1}
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    aria-label={`Số lượng ${p.sku}`}
                                    type="number"
                                    min={1}
                                    max={fulfillmentStatus === "complete" ? p.on_hand : 1000000}
                                    value={i.quantity}
                                    onChange={(e) =>
                                      changeQty(lineKey(i), Number(e.target.value))
                                    }
                                  />
                                  <button
                                    aria-label={`Tăng ${p.sku}`}
                                    onClick={() =>
                                      changeQty(lineKey(i), i.quantity + 1)
                                    }
                                    disabled={fulfillmentStatus === "complete" && i.quantity >= p.on_hand}
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
                              <div className={`cart-stock-status ${i.quantity > availableForLine(cart,i,p.on_hand) ? "short" : ""}`}>Có thể giao {Math.min(i.quantity, availableForLine(cart,i,p.on_hand))} / {i.quantity} {productUnit(p)}{i.quantity > availableForLine(cart,i,p.on_hand) && <b>Thiếu {i.quantity - availableForLine(cart,i,p.on_hand)} {productUnit(p)}</b>}</div>
                              {p.draft_quantity!==undefined&&cart.find(x=>x.product_id===p.id)===i&&(()=>{const estimate=estimateForCart(p,cart,data.orders.find(o=>o.id===draft?.id)||draft);return <div className={`cart-stock-status ${estimate.remaining<0?'short':''}`}>Nháp khác: {estimate.otherDrafts} · Dự kiến sau đơn này: {estimate.remaining} {productUnit(p)}{estimate.remaining<0&&<b>Dự kiến thiếu {-estimate.remaining} {productUnit(p)}. Vẫn có thể lưu nháp.</b>}</div>})()}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-cart">
                        <ShoppingCart size={38} />
                        <h3>Chưa có sản phẩm</h3>
                        <p>Chọn sản phẩm bên trái để tạo đơn.</p>
                      </div>
                    )}
                  </div>
                  <div className="order-extra-fields">
                    <label className="field">Chi phí khác (đ)<input aria-label="Chi phí khác (đ)" type="number" min={0} max="999999999999999" step={1} value={extraCost} onChange={e=>{setExtraCost(e.target.value);setDirty(true);}} /></label>
                    <label className="field">Nội dung chi phí khác<input aria-label="Nội dung chi phí khác" placeholder="Ví dụ: VAT, in ấn…" maxLength={1000} value={extraCostNote} onChange={e=>{setExtraCostNote(e.target.value);setDirty(true);}} /></label>
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
                  </div>
                  <div className="cart-summary">
                    <div>
                      <span>Số lượng</span>
                      <b>{itemQuantitySummary(cart,data!.products)}</b>
                    </div>
                    <div className="total">
                      <strong>Tổng tiền</strong>
                      <b>{money(amount(cart) + (/^\d+$/.test(extraCost) ? BigInt(extraCost) : 0n))}</b>
                    </div>
                    <div><span>Tiền sản phẩm</span><b>{money(amount(cart))}</b></div>
                    <div><span>Chi phí khác</span><b>{money(/^\d+$/.test(extraCost) ? extraCost : 0)}</b></div>
                    <p className="hint">
                      <ShieldCheck size={15} /> Đơn nháp chưa trừ tồn kho
                    </p>
                    <div className="cart-actions">
                      <button
                        disabled={busy || !cart.length}
                        onClick={() => run(async () => { const order = await save(); if (await exportOrderConfirmationImage(order)) setToast("Đã tải ảnh đơn hàng để gửi khách xác nhận."); })}
                      >
                        <Download size={17} /> Tải ảnh xác nhận
                      </button>
                      <button
                        disabled={busy || !cart.length}
                        onClick={() => run(async () => { if (await exportCurrentOrderWorkbook()) setToast("Đã tải file Excel đơn hàng để gửi khách xác nhận."); })}
                      >
                        <Download size={17} /> Tải Excel
                      </button>
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
                <div className="stats stock-summary-stats">
                  <Stat
                    icon={<Package />}
                    label="Số mã sản phẩm đang bán"
                    value={String(products.filter((p) => p.active).length)}
                  />
                  <Stat
                    icon={<SlidersHorizontal />}
                    label="Tổng tồn kho"
                    value={quantitySummary(products.map(p=>({quantity:p.on_hand,unit:productUnit(p)})))}
                  />
                  <Stat
                    icon={<AlertTriangle />}
                    label="Tồn kính" value={`${products.filter(p=>!isAccessory(p)).reduce((sum,p)=>sum+p.on_hand,0)} tấm`} />
                  <Stat icon={<Package />} label="Tồn phụ kiện" value={`${products.filter(isAccessory).reduce((sum,p)=>sum+p.on_hand,0)} sản phẩm`} />
                  <Stat icon={<AlertTriangle />} label="Sắp hết hàng"
                    value={`${products.filter((p) => p.active && p.on_hand < 10).length} mã sản phẩm`}
                    amber
                  />
                  {sharedOperations&&<Stat icon={<Package/>} label="Trong đơn nháp" value={quantitySummary(products.map(p=>({quantity:p.draft_quantity||0,unit:productUnit(p)})))}/>}
                  {sharedOperations&&<Stat icon={<SlidersHorizontal/>} label="Tồn dự kiến" value={quantitySummary(products.map(p=>({quantity:p.on_hand-(p.draft_quantity||0),unit:productUnit(p)})))} amber={products.some(p=>p.on_hand<(p.draft_quantity||0))}/>}
                </div>
                {sharedOperations&&<div className="list-toolbar"><button className={stockView==='actual'?'primary':''} onClick={()=>setStockView('actual')}>Danh mục và tồn thực tế</button><button className={stockView==='forecast'?'primary':''} onClick={()=>setStockView('forecast')}>Tồn dự kiến</button></div>}
                {stockView==='forecast'&&sharedOperations?<><section className="panel">{searchBar}</section><StockForecastPanel products={products}/></>:<section className="panel stock-panel">
                  {searchBar}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Mã sản phẩm</th>
                          <th className="stock-quantity">Số lượng tồn</th>
                          <th>Thương hiệu</th>
                          <th>Dòng máy tương thích</th>
                          {canSeeCosts && <th className="number">Giá vốn</th>}
                          <th className="number">Giá bán</th>
                          <th className="number">Giá sỉ</th>
                          {canOperate && <th>Thao tác</th>}
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
                                  <b style={{color:orderProductColor(p.glass_type,p.sku)}}>{p.sku}</b>
                                  {p.cost_configured===false&&<small className="badge amber">Chưa thiết lập vốn</small>}
                                  
                                  <small>
                                    {typeLabels[p.glass_type]}
                                    {!p.active && " · Ngừng bán"}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td className="stock-quantity">
                              <span
                                className={`badge ${p.on_hand < 10 ? "amber" : "teal"}`}
                              >
                                {p.on_hand} {productUnit(p)}
                              </span>
                              {p.draft_quantity!==undefined&&<small>Trong nháp: {p.draft_quantity} · Dự kiến: {p.on_hand-p.draft_quantity}</small>}
                            </td>
                            <td>
                              {data.glass_brands.find(
                                (b) => b.id === p.glass_brand_id,
                              )?.name || "Chưa phân loại"}
                            </td>
                            <td>{p.models.join(" / ") || "—"}</td>
                            {canSeeCosts && (
                              <td className="number">{money(p.fixed_cost)}</td>
                            )}
                            <td className="number">{money(p.sale_price)}</td>
                            <td className="number">{money(p.wholesale_price || p.sale_price)}</td>

                            {canOperate && (
                              <td>
                                <div className="actions">
                                  <button
                                    disabled={!canProducts} aria-label={`Sửa ${p.sku}`}
                                    onClick={() => editProduct(p)}
                                  >
                                    <Pencil size={15} /> Sửa
                                  </button>
                                  <button
                                    disabled={!canAdjust} aria-label={`Điều chỉnh tồn ${p.sku}`}
                                    onClick={() => inventory('adjustment',p)}
                                  ><SlidersHorizontal size={15} /> Chỉnh tồn</button>
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
                                            reason?: string;
                                            actor_name?: string;
                                            sku?: string;
                                            current_sku?: string;
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
                                                    {r.reason&&<small>Lý do: {r.reason}</small>}
                                                    <small>Mã lúc ghi: {r.sku||p.sku}</small>
                                                    {r.current_sku&&r.current_sku!==r.sku&&<small>Mã hiện tại: {r.current_sku}</small>}
                                                    {r.actor_name&&<small>Người thực hiện: {r.actor_name}</small>}
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
                                    disabled={!canProducts} aria-label={`Xóa ${p.sku}`}
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
                    <span>Hiển thị {products.length} mã sản phẩm</span>
                    <span>
                      <LockKeyhole size={14} />{" "}
                      {canSeeCosts ? "Bạn có quyền xem giá vốn." : "Giá vốn và giá nhập chỉ hiển thị cho Admin."}
                    </span>
                  </div>
                </section>
                }
                {canOperate && (
                  <div className="stock-actions">
                    <button disabled={!canAdjust} onClick={() => inventory("damage")}>
                      <AlertTriangle size={18} /> Ghi nhận kính lỗi
                    </button>
                    <button disabled={!canAdjust} onClick={() => inventory("issue")}>Xuất kho</button>
                    {canSeeCosts && <button onClick={() => inventory("opening")}>
                      Tồn đầu kỳ
                    </button>}
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
                  {page === "orders" && canOperate && (
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
                        {canOperate && <th>Sales</th>}
                        <th>Trạng thái</th>
                        <th>Hàng hóa</th>
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
                              : !canOperate
                                ? o.status !== "draft"
                                : orderFilter === "all" ||
                                  o.status === orderFilter) &&
                            `${o.order_no} ${o.customer_name}`
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            inVietnamDateRange(o.ordered_at || o.confirmed_at || o.created_at, orderFrom, orderTo),
                        )
                        .map((o) => (
                          <tr key={o.id}>
                            <td>
                              <b>{o.order_no}</b>
                            </td>
                            <td>{o.customer_name || "Khách lẻ"}</td>
                            <td>{dateText(o.ordered_at || o.confirmed_at || o.created_at)}</td>
                            {canOperate && <td>{o.sales_name || o.creator_name}</td>}
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
                            <td><span className={`badge ${o.fulfillment_status === "short" ? "red" : "teal"}`}>{o.fulfillment_status === "short" ? "Còn thiếu" : "Đủ hàng"}</span></td>
                            <td className="number">{money(o.total_amount)}</td>
                            <td>
                              <div className="actions"><button disabled={busy} onClick={() => showOrder(o)}>Chi tiết <ChevronRight size={14} /></button><button disabled={busy} aria-label={`Tải Excel ${o.order_no}`} onClick={() => run(() => exportOrder(o))}><Download size={14} /> Excel</button></div>
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
            {page === "customers" && canOperate && (
              <section className="panel">
                <div className="list-toolbar customer-filter-toolbar">
                  <label>
                    <span>Loại khách hàng</span>
                    <select
                      aria-label="Lọc theo loại khách hàng"
                      value={customerFilter}
                      onChange={(event) => setCustomerFilter(event.target.value as "all" | "retail" | "wholesale")}
                    >
                      <option value="all">Tất cả ({data.customers.length})</option>
                      <option value="retail">Khách lẻ ({data.customers.filter((item) => item.customer_type === "retail").length})</option>
                      <option value="wholesale">Khách sỉ ({data.customers.filter((item) => item.customer_type === "wholesale").length})</option>
                    </select>
                  </label>
                </div>
                <div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Loại khách</th><th>Số điện thoại</th><th>Địa chỉ</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>
                  {data.customers.filter((item) => customerFilter === 'all' || item.customer_type === customerFilter).map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td><span className={`badge ${item.customer_type === "wholesale" ? "amber" : "teal"}`}>{item.customer_type === "wholesale" ? "Khách sỉ" : "Khách lẻ"}</span></td><td>{item.phone}</td><td>{item.address || "—"}</td><td>{item.note || "null"}</td><td><div className="actions"><button onClick={() => editCustomer(item)}><Pencil size={15} /> Sửa</button><button className="danger-outline" onClick={() => deleteCustomer(item)}><Trash2 size={15} /> Xóa</button></div></td></tr>)}
                </tbody></table></div>
                {!data.customers.length && <div className="empty"><Users /><h3>Chưa có khách hàng đã lưu</h3><p>Thông tin khách sẽ tự lưu khi tạo đơn, hoặc thêm thủ công bằng nút phía trên.</p></div>}
              </section>
            )}
            {page === "reports" && canReports && (
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
                  <span>Theo ngày đặt đơn · chỉ đơn đã bán · không phụ thuộc thanh toán · tối đa 366 ngày</span>
                  <button className="primary" disabled={!report||busy} onClick={() => run(exportReport)}><Download size={17} /> Tải báo cáo Excel</button>
                </div>
                {report ? (
                  <>
                    <div className="stats">
                      <Stat icon={<FileText />} label="Tổng đơn hàng bán ra" value={String(report.order_count || 0)} />
                      <Stat
                        icon={<BarChart3 />}
                        label="Doanh thu thuần"
                        value={money(reportTotals(report).revenue)}
                      />
                      {canSeeCosts && (<Stat
                        icon={<Package />}
                        label="Giá vốn hàng bán ròng"
                        value={money(report.cost)}
                      />)}
                      {canSeeCosts && (<Stat
                        icon={<ShieldCheck />}
                        label="Lãi gộp quy định"
                        value={money(report.profit)}
                      />)}
                    </div>
                    <div className="report-grid">
                      <section className="panel report-panel">
                        <h2>Đối chiếu trong kỳ</h2>
                        <dl>
                          <dt>Tiền hoàn / hủy</dt>
                          <dd>{money(report.refunds)}</dd>
                          <dt>Tiền sản phẩm sau trả hàng</dt><dd>{money(reportTotals(report).products)}</dd>
                          <dt>Chi phí khác trong đơn</dt><dd>{money(reportTotals(report).fees)}</dd>
                          <dt>Tổng giá trị gồm chi phí khác</dt><dd>{money(reportTotals(report).revenue)}</dd>
                          {canSeeCosts && <><dt>Kính lỗi và hàng trả không bán lại</dt>
                          <dd>{money(report.damage)}</dd></>}
                          <dt>Số lượng đã giao sau trả hàng</dt>
                          <dd>{report.sold}</dd>
                        </dl>
                      </section>
                      <section className="panel report-panel">
                        <h2>Tồn kho hiện tại</h2>
                        <dl>
                          <dt>Số lượng</dt>
                          <dd>{quantitySummary(data!.products.map(p=>({quantity:p.on_hand,unit:productUnit(p)})))}</dd>
                          {canSeeCosts && <><dt>Tổng giá vốn</dt>
                          <dd>{money(report.stock_value)}</dd></>}
                        </dl>
                      </section>
                    </div>
                    <InventoryReport rows={report.inventory} products={data?.products} />
                    {canSeeCosts&&!!report.unconfigured_products&&<p role="status">Có {report.unconfigured_products} mã còn tồn chưa thiết lập vốn; giá trị tồn theo vốn hiện chưa đầy đủ.</p>}
                    <SalesReportTable report={report} canSeeCosts={canSeeCosts} products={data?.products} onDetails={p=>setModal({title:"Bán hàng chi tiết · "+p.sku,className:"product-report-modal",body:<ProductReportDetails product={p} from={from} to={to}/>} )} />
                    <section className="panel sales-performance"><div className="list-toolbar"><h2>Khả năng bán ra của sản phẩm</h2><select aria-label="Xếp hạng bán hàng" value={performanceMode} onChange={(e) => setPerformanceMode(e.target.value as "fast" | "slow")}><option value="fast">Bán chạy nhất</option><option value="slow">Bán chậm nhất</option></select></div><div className="performance-bars">{[...(report.sales || [])].sort((a,b) => performanceMode === "fast" ? b.quantity-a.quantity : a.quantity-b.quantity).slice(0,10).map((row) => { const max=Math.max(1,...(report.sales || []).map((item) => item.quantity)); return <div className="performance-row" key={`${performanceMode}-${row.sku}-${row.sale_price}`}><span><b style={{color:orderProductColor(row.glass_type||data?.products.find(p=>p.sku===row.sku)?.glass_type,row.sku)}}>{row.sku}</b></span><i><em style={{width:`${Math.max(3,row.quantity/max*100)}%`}} /></i><strong>{row.quantity} {productUnit(data!.products.find(p=>p.sku===row.sku))}</strong></div>})}{!(report.sales || []).length && <div className="empty">Chưa có dữ liệu bán hàng trong kỳ đã chọn.</div>}</div></section>
                    <section className="panel" style={{marginTop:22}}><div className="list-toolbar"><h2>Chi tiết biến động kho</h2></div><div className="table-scroll"><table><thead><tr><th>Thời gian</th><th>Mã sản phẩm</th><th>Giao dịch</th><th className="number">Số lượng</th><th className="number">Tồn sau</th><th>Sales</th><th>Đơn hàng</th><th>Lý do / ghi chú</th><th>Mã hiện tại</th></tr></thead><tbody>{(report.movements || []).map((row, index) => <tr key={`${row.occurred_at}-${row.sku}-${index}`}><td>{dateText(row.occurred_at)}</td><td><b style={{color:orderProductColor(row.glass_type||data?.products.find(p=>p.sku===row.sku)?.glass_type,row.sku)}}>{row.sku}</b></td><td>{row.movement_type}</td><td className="number">{row.quantity_delta > 0 ? "+" : ""}{row.quantity_delta}</td><td className="number">{row.balance_after}</td><td>{row.sales}</td><td>{row.order_no || "—"}</td><td className="log-detail">{row.reason || "—"}</td><td>{row.current_sku||row.sku}</td></tr>)}</tbody></table></div></section>
                    <div className="info-box">
                      <ShieldCheck size={20} />
                      <p>
                        Số liệu đang áp dụng theo khoảng ngày và hãng máy đã
                        chọn. {canSeeCosts ? "Lãi gộp tính theo giá vốn cố định tại thời điểm bán, chưa trừ chi phí vận hành và tổn thất kính lỗi." : "Giá vốn, giá nhập và lợi nhuận chỉ hiển thị cho Admin."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="panel empty">Đang tải báo cáo…</div>
                )}
              </>
            )}
            {page === "users" && canSeeCosts && (
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
                              <button onClick={()=>editPermissions(u)}>Phân quyền</button>
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
                          ) : canSeeCosts ? (
                            <div className="actions">
                              <button onClick={() => editUserName(u)}>
                                Sửa tên
                              </button>
                              <button onClick={() => manageStaff(u.id)}>
                                Đổi mật khẩu
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-foot">
                  <LockKeyhole size={14} /> Admin cấp quyền riêng từng nhân viên. Tài khoản mới chỉ có quyền bán hàng cơ bản; giá vốn, giá nhập và lợi nhuận chỉ Admin được xem.
                </div>
              </section>
            )}
            {page === "audit" && canAudit && (
              <section className="panel">
                <div className="audit-toolbar">
                  <label>
                    Người thực hiện
                    <select
                      aria-label="Lọc lịch sử theo người thực hiện"
                      value={auditActor}
                      onChange={(e) => setAuditActor(e.target.value)}
                    >
                      <option value="all">Tất cả nhân viên</option>
                      {auditActors.map((actorName) => (
                        <option key={actorName} value={actorName}>
                          {actorName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Từ ngày
                    <input
                      aria-label="Lọc lịch sử từ ngày"
                      type="date"
                      value={auditFrom}
                      onChange={(e) => setAuditFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    Đến ngày
                    <input
                      aria-label="Lọc lịch sử đến ngày"
                      type="date"
                      value={auditTo}
                      onChange={(e) => setAuditTo(e.target.value)}
                    />
                  </label>
                  <span>{filteredLogs.length} kết quả</span>
                </div>
                <div className="table-scroll">
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
                      {filteredLogs.map((l) => (
                        <tr key={l.id}>
                          <td>{dateText(l.created_at)}</td>
                          <td>{l.actor_name}</td>
                          <td>{l.action === "inventory" ? (l.detail?.startsWith("adjustment:") ? "Điều chỉnh tồn" : l.detail?.startsWith("opening:") ? "Nhập hàng ban đầu" : "Nhập hàng") : actionLabels[l.action] || l.action}</td>
                          <td className="log-detail">{auditDetail(l, data)}</td>
                        </tr>
                      ))}
                      {!filteredLogs.length && (
                        <tr>
                          <td className="empty-table" colSpan={4}>
                            Không có lịch sử phù hợp với bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-foot">
                  Đang tìm trong {businessLogs.length} lần bán hàng và nhập hàng gần nhất · Lịch sử
                  không thể sửa hoặc xóa trong ứng dụng.
                </div>
              </section>
            )}
            {page === "lookup" && <SharedLookup products={data.products} />}
          </main>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {error && (
        <aside className="alert-popup" role="alert" aria-live="assertive">
          <span className="alert-popup-icon" aria-hidden="true">
            <AlertTriangle size={19} />
          </span>
          <span className="alert-popup-content">
            <strong>Chưa thể thực hiện</strong>
            <span>{error}</span>
          </span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </aside>
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
            className={`modal ${modal.className || ""}`}
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
      {orderImagePreview && (
        <div
          className="image-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOrderImagePreview(null);
          }}
        >
          <div
            className="image-lightbox-dialog order-confirmation-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Xem trước ảnh xác nhận đơn hàng"
          >
            <div className="image-lightbox-head">
              <div>
                <b>Xem trước ảnh xác nhận</b>
                <small>{orderImagePreview.filename}</small>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Đóng ảnh xác nhận"
                onClick={() => setOrderImagePreview(null)}
              >
                <X size={22} />
              </button>
            </div>
            <img src={orderImagePreview.url} alt="Ảnh xác nhận đơn hàng sẽ gửi cho khách" />
            <div className="order-confirmation-preview-actions">
              <button type="button" onClick={() => setOrderImagePreview(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => run(async () => {
                  await saveDownload(orderImagePreview.blob, orderImagePreview.filename);
                })}
              >
                <Download size={17} /> Tải ảnh PNG
              </button>
            </div>
          </div>
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
          <small>{dateText(order.ordered_at || order.confirmed_at || order.created_at)}</small>
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
          {orderItemsForDisplay(order.items,products).map((item, index) => {
            const p = products.find((p) => p.id === item.product_id),
              name =
                item.sku_snapshot || p?.sku || "Mã kính";
            return (
              <tr key={item.id || item.product_id}>
                <td>{index + 1}</td>
                <td>
                  <b style={{color:orderProductColor(p?.glass_type,name)}}>{name}</b>
                  <small>
                    Dùng chung: {(item.models_snapshot ?? p?.models ?? []).join(', ') || 'Chưa có'}
                    {item.item_kind && item.item_kind !== "sale"
                      ? ` · ${item.item_kind === "gift" ? "Hàng tặng" : "Hàng mẫu"}`
                      : ""}
                    {item.item_note && ` · ${item.item_note}`}
                  </small>
                </td>
                <td>{order.status === 'draft' ? item.quantity : (item.delivered_quantity ?? item.quantity)} {productUnit(p)}</td>
                <td>{money(item.unit_sale_price || 0)}</td>
                <td>
                  {money(
                    BigInt(item.unit_sale_price || 0) * BigInt(order.status === 'draft' ? item.quantity : (item.delivered_quantity ?? item.quantity)),
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bill-total">
        <span>Tiền sản phẩm</span><b>{money(BigInt(order.total_amount) - BigInt(order.extra_cost || 0))}</b>
        <span>Chi phí khác{order.extra_cost_note ? ` · ${order.extra_cost_note}` : ''}</span><b>{money(order.extra_cost || 0)}</b>
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
function SharedLookup({products}:{products:Product[]}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<SharedLookupItem[]>([]),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState<{
      src: string;
      alt: string;
      sku: string;
    } | null>(null);
  useEffect(() => {
    if (!preview) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", close);
    };
  }, [preview]);
  async function search(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      setMessage("Nhập ít nhất 2 ký tự.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const local=products.filter(p=>p.active&&p.sku_aliases?.length&&[p.sku,...p.sku_aliases,...p.models].some(value=>containsProductSearch(value,query))).map(p=>({id:p.id,sku:p.sku,name:p.sku,glassTypes:[p.glass_type],images:[],matchedModels:[],compatibleModels:p.models,previousSkus:p.sku_aliases} as SharedLookupItem));
      let remote:SharedLookupItem[]=[];
      try{remote=await lookupSharedProducts(query);}catch(e){if(!local.length)throw e;}
      const merged=new Map<string,SharedLookupItem>();
      for(const item of [...local,...remote]){
        const p=products.find(p=>p.sku===item.sku||p.sku_aliases?.includes(item.sku));
        const value=p?.sku_aliases?.length?{...item,sku:p.sku,previousSkus:p.sku_aliases}:item;
        merged.set(value.sku.toLocaleUpperCase('vi'),value);
      }
      const result=[...merged.values()];
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
            <div className="lookup-result-main">
              <div className="lookup-images">
                {item.images.slice(0, 2).map((source, index) => (
                  <button
                    type="button"
                    className="lookup-image-button"
                    key={source}
                    aria-label={`Phóng to ảnh bao bì ${index + 1} của mã kính ${item.sku}`}
                    title="Bấm để xem ảnh lớn"
                    onClick={() =>
                      setPreview({
                        src: lookupImageSrc(source),
                        alt: `Ảnh bao bì ${index + 1} của mã kính ${item.sku}`,
                        sku: item.sku,
                      })
                    }
                  >
                    <img
                      src={lookupImageSrc(source)}
                      alt={`Ảnh bao bì ${index + 1} của mã kính ${item.sku}`}
                      loading="lazy"
                    />
                    <ZoomIn size={17} aria-hidden="true" />
                  </button>
                ))}
                {!item.images.length && (
                  <div className="lookup-image-empty">Chưa có ảnh</div>
                )}
              </div>
              <div className="lookup-result-content">
                <div>
                  <b>{item.sku}</b>
                  {!!item.previousSkus?.length&&<small>Mã cũ: {item.previousSkus.join(', ')}</small>}
                  
                </div>
                <p>
                  <Check size={16} /> Dùng chung với{" "}
                  {item.compatibleModels.length} dòng máy
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
              </div>
            </div>
          </article>
        ))}
      </div>
      {preview && (
        <div
          className="image-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div
            className="image-lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Ảnh lớn mã kính ${preview.sku}`}
          >
            <div className="image-lightbox-head">
              <div>
                <b>{preview.sku}</b>
                <small>Ảnh bao bì sản phẩm</small>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Đóng ảnh lớn"
                onClick={() => setPreview(null)}
              >
                <X size={22} />
              </button>
            </div>
            <img src={preview.src} alt={preview.alt} />
          </div>
        </div>
      )}
    </section>
  );
}
