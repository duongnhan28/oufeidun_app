# Phát hành LOCAL 0.2.14

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

- [x] Đọc đặc tả/checklist; xác định cần cập nhật cả Local API và client.
- [x] Tăng version app/API, chuẩn bị hướng dẫn nhận lại cấu hình cũ.
- [x] Verify: dữ liệu 22/22, UI 29/29, Electron/build/audit; Local API unit 6/6, MySQL integration 1/1, dependency app/server 0 lỗ hổng.
- [x] Build LOCAL, audit package; Admin/Nhân viên hoàn thành luồng bán hàng trên Electron đóng gói + MySQL cô lập. Installer exit 0, installed config/discovery smoke đạt.
- [x] Tạo bộ máy chủ/client tại E:\outputt; PowerShell parse, API/migration hash và 1.147 checksum đạt. ZIP đọc được.
- [x] Cập nhật nhật ký xác minh và chuẩn bị đường dẫn bộ bàn giao.

Giữ nguyên database, ảnh, account, cấu hình và nhận diện máy chủ. Không chạy
clean-data hoặc cài lại máy chủ trong quá trình phát hành. Không áp dụng migration
Supabase: bộ này dùng MySQL LOCAL cho nghiệp vụ.

## Cập nhật giữ version ngày 08/10/2026

Dùng mã kính thay tên sản phẩm; Excel tự tạo SKU chưa có trong cùng phiếu nhập. Mã cũ giữ nguyên giá; mã mới có giá vốn bằng giá nhập, giá bán/sỉ 0 cần thiết lập. Cập nhật cả API máy chủ và client; không cài lại MySQL hoặc clean-data.

Verify 23 data/30 UI đạt; MySQL integration, unit 6/6, packaged Admin/Staff và Excel tạo SKU đạt. Cài đè cùng version 0.2.14 exit 0, asar đã cài đúng hash, installed HTTPS/discovery/config smoke đạt. 1.147 checksum và nội dung ZIP đạt.

Folder/ZIP E:\outputt\Oufeidun-Local-0.2.14 đã được thay; bản trước ở E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-20261008. Installer SHA256 EBB6A0024C491D2709758861C08A3EC19E236A7C805285AF8E7F278F21CBB89A; ZIP SHA256 3D3C1427EFB717C44904EDBBE0DEF10D5BF26FEEE0FE4D124C68C0F8F7F4B279.
# Cập nhật Excel theo ảnh khách — 08/10/2026

Mẫu Excel mới gồm tám cột: Mã kính, Loại kính, Hãng điện thoại, Hãng kính, Giá bán, Giá sỉ mặc định, Giá vốn cố định, Mã/dòng máy dùng chung. Các máy phân cách bằng dấu phẩy, giữ dấu /. Không có tên sản phẩm. Thêm mã mới hoặc cập nhật danh mục/ba giá mã cũ, giữ tồn/ảnh/trạng thái/lịch sử; mã mới tồn 0. File nhập kho ba cột cũ vẫn dùng được.

Verify đạt 25 data/31 UI, Electron/build/audit; MySQL integration, packaged Admin/Nhân viên, nhập tám cột trên EXE với MySQL/HTTPS, cài đè cùng version và cấu hình/discovery của bản cài đạt. 1.148 file và từng entry ZIP khớp checksum. Không thêm bảng/cột MySQL; migration Supabase 028 chỉ kiểm thử cô lập, chưa áp dụng online.

- Folder: `E:\outputt\Oufeidun-Local-0.2.14`.
- ZIP SHA256: `12E870E253A2EE2A1AAB3B08BD4025077858EEDC7F4A703972493236964FE839`.
- Setup SHA256: `9C83945EE5D81A2ABB6642233274BFC1C85403FF182A32342F04BE05FAAFD772`.
- Bản trước: `E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-excel-20261008`.

Cập nhật cả API máy chủ và app máy nhân viên theo BAT-DAU-O-DAY.txt, dù vẫn version 0.2.14. Không clean/reset dữ liệu hoặc cài lại MySQL. Installer chưa ký Authenticode thương mại; kết nối hai máy thật và UAC/reboot cần kiểm tra tại cửa hàng.
# Bổ sung số lượng Excel và Kho kính — bản mới nhất 08/10/2026

Excel có chín cột, thêm Số lượng ở cuối. Số lượng là lượng nhập thêm, không phải tồn cuối; 0 chỉ cập nhật danh mục/giá. Các máy dùng chung cách nhau bằng dấu phẩy. Tạo phiếu nhập và sổ kho trong cùng transaction; mẫu tám cột và ba cột cũ vẫn được hỗ trợ. Kho kính hiển thị Số lượng tồn ngay cạnh Mã kính.

Verify đạt 25 data/31 UI, Electron/build/audit; MySQL integration và server unit 6/6 đạt. Packaged Admin nhập workbook chín cột, kiểm tra tồn mã mới/cũ và ba giá trên MySQL đạt; Admin/Staff bán hàng, PNG/Excel, hủy Save, xem ảnh và trừ kho đạt. Cài đè cùng version exit 0, installed asar khớp; cấu hình ngoài có BOM/thư mục có khoảng trắng và HTTPS/signed discovery đạt. Đã kiểm tra 1.148 checksum và từng file ZIP tại folder bàn giao cuối.

- Folder: `E:\outputt\Oufeidun-Local-0.2.14`.
- ZIP: `E:\outputt\Oufeidun-Local-0.2.14.zip`, 371.991.746 byte.
- ZIP SHA256: `DA724B0EBD42D3E0C4E10CFFD0CF178FCC56E59B7C5F9A22E7F2F738240B99FE`.
- Setup SHA256: `E1CE67B30B7E6E736653A05855EB5209826B0EDA6C4C250CE1D690C16F80EE18`.
- Bản trước giữ tại `E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-quantity-20261008`.

Cập nhật cả máy chủ và các máy nhân viên theo BAT-DAU-O-DAY.txt; giữ DB/config/ảnh/tài khoản. Không chỉ thay EXE. Mỗi lần nhập file mới cộng kho tiếp; không nhập lại file đã hoàn tất. Retry cùng key chống lặp. Không thêm bảng/cột MySQL. Migration Supabase 029 chỉ kiểm thử cô lập, chưa áp dụng online. Installer chưa ký Authenticode thương mại; UAC/reboot và kết nối hai máy vật lý cần kiểm tra tại cửa hàng.
