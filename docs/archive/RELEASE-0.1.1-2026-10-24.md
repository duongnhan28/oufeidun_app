# LOCAL 0.1.1 — điều chỉnh tồn có lý do, build lại 24/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

## Chức năng và ảnh hưởng

- Kho hàng có Điều chỉnh tồn ở đầu trang và Chỉnh tồn tại từng mã. Chọn giảm/tăng theo lượng hoặc nhập tồn thực tế, xem tồn trước/sau, lý do bắt buộc. Không sửa tồn trực tiếp trong form thông tin sản phẩm.
- Dùng transaction/sổ kho/stock_version/idempotency hiện có; chặn ghi đè khi tồn đã thay đổi, retry không trừ/cộng lặp. Không migration MySQL mới, không thay config/data.
- Giữ giá/vốn/price_version và đơn/nháp đã lưu, không sinh doanh thu. Giảm tồn có thể khiến nháp không đủ hàng; lúc bán vẫn kiểm tồn. Giá trị tồn hiện hành thay đổi theo số lượng mới.
- History từng mã có lý do/người, Lịch sử thao tác có adjustment, báo cáo kho/Excel thêm lý do cột 8 và giữ mã đơn cột 7. Kính tính tấm, phụ kiện tính sản phẩm.
- Nhân viên vẫn không nhập hàng/tồn đầu kỳ/import hoặc xem/sửa vốn; được điều chỉnh theo quyền hiện có. Giữ các sửa doanh thu/nháp/ngày/mã/màu/backup trước đó.

## Xác minh

- Verify sau Zod 4.6.6 đạt: 50 data/53 UI/Electron/TypeScript/build/audit production 0. Server unit 7/7, audit production server 0 sau multer 2.5.0/body-parser 2.4.0; MySQL integration thật 1/1 không skip và upload ảnh thật/ảnh giả đều đạt.
- MySQL kiểm lý do trống/khoảng trắng, sai số lượng, giảm/tăng/0, thiếu/stale stock_version, retry, hai yêu cầu cùng version chỉ một thành công, rollback thiếu tồn, tăng đủ rồi bán lại nháp; giá/vốn/đơn/doanh thu và cột lý do đúng.
- UI Admin/staff cho kính 48→45→47→0, mở lại giữ tồn; history/audit và workbook tải thật có lý do, staff không vốn. Đã xem ảnh giao diện.
- Native EXE HTTPS/discovery/MySQL hai vai trò cho phụ kiện 10→7→9→0, thiếu lý do/vượt tồn không ghi, history/audit/Excel lý do đúng. Đọc DB xác nhận chỉ tồn đích thay đổi, giữ giá/vốn và mọi mã không liên quan. Fixture đầu dùng SKU chữ thường trong khi API chuẩn hóa hoa; sửa fixture và chạy lại đầy đủ đạt.
- Native report/customer regression hai vai trò đạt: 7 đơn synthetic/9.740.000đ/phí 30.000, mã đơn/màu, 11 biến động khớp DB/XLSX, khách số 0/An-Ân và không đổi tồn khi xuất.
- LOCAL/Forge Squirrel, cài đè cùng version, installed asar và default launcher đều đạt. Không thay policy Windows toàn máy; chạy script test trong process riêng.
- Logs `.local/stock-adjustment-*-20261024.*`, `.local/release-011-*-20261024.*`. Thiết kế và nguồn advisory: docs/STOCK-ADJUSTMENT-2026-10-24.md.

## Cập nhật tại cửa hàng

Đã thay folder/ZIP `E:\outputt\Oufeidun-Local-0.1.1` sau audit 1.162 checksum trong folder/ZIP, đối chiếu API/migrations/asar/installer, parse PowerShell, loại config riêng và kiểm ba bản hướng dẫn khớp nguồn.

- ZIP: `E:\outputt\Oufeidun-Local-0.1.1.zip`, 373.905.305 byte; SHA256 `84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2`.
- Setup: `02-MAY-CLIENT\Oufeidun-Setup.exe`, 174.963.712 byte; SHA256 `D4A62266ABCA518905E7A7258AA7A975D8AFB6D516304989EBD85C638CB7C6B5`.
- Giữ folder/ZIP ngày 23/10 tại `E:\outputt\_BACKUP\Oufeidun-0.1.1-before-stock-adjustment-20261024-144708`; hash ZIP cũ `9C94B1C9A7D2C19BA6CEDF96118314103299443B45C95753AA2B4628A57E8F2D` không đổi. Bộ 0.2.18 cũng giữ nguyên.

Giải nén ZIP mới, đóng app. Máy chủ chạy `01-MAY-CHU\CAP-NHAT.bat` trước, sau đó cập nhật app máy chủ và mọi máy nhân viên dù vẫn là 0.1.1. Giữ data/config/DB/ảnh/tài khoản; không clean/reset/nhập lại dữ liệu. Xem hướng dẫn ngày 24/10 trong ZIP.

Kiểm thử dùng DB/profile tự tạo, chưa thử trên dữ liệu/hai máy vật lý/router/Google OAuth khách. Installer chưa ký Authenticode thương mại. Bộ trước được giữ lại để phục hồi.
