# Google Drive và màu chứng từ — build lại LOCAL 0.2.18

## Dùng tại cửa hàng

1. Giải nén bộ 0.2.18 mới ngoài folder dữ liệu đang chạy; cập nhật máy chủ bằng `01-MAY-CHU\CAP-NHAT.bat`, kiểm tra rồi cập nhật app các máy. Giữ nguyên DB/account/ảnh/config/CA; không clean-data hoặc cài lại MySQL.
2. Trên máy chủ, chạy `CAI-BACKUP-GOOGLE-DRIVE.bat`, chấp nhận UAC. Tool tìm folder dữ liệu đã cài, tự tải rclone chính thức và kiểm SHA256.
3. Nhập tên cửa hàng không dấu hoặc Enter dùng tên máy. Phần link Drive có thể Enter để dùng Drive của tôi; nếu có thư mục sẵn thì dán link dạng `https://drive.google.com/drive/folders/...` có quyền ghi.
4. Đăng nhập Google của cửa hàng và cấp quyền trong trình duyệt một lần. Tool tạo `Oufeidun-Backup/<tên cửa hàng>`, tạo backup local rồi upload/kiểm tra. Chờ thông báo hoàn tất.
5. Dùng `BACKUP-VA-DAY-LEN-DRIVE.bat` để chạy tay, `KIEM-TRA-BACKUP-DRIVE.bat` để xem kết nối/lần tải thành công/tác vụ/log. Chạy lại bộ cài giữ tài khoản và folder đã cấu hình.

Không cần Google Drive for desktop hoặc nhập đường dẫn ổ đĩa Drive. Cấu hình hiện có lấy từ máy chủ, không gắn cứng ổ C/E. Máy chủ cần bật, không Sleep và có mạng để upload. Chỉ máy chủ cài bộ Drive.

## Dữ liệu và vận hành

- Giữ backup local nguyên bản. Chỉ folder daily/weekly có SHA256SUMS hợp lệ, có SQL và các file khớp checksum mới được upload. SQL/ảnh/config có trong bản local được gửi cùng manifest.
- Rclone dùng `copy` và `check --one-way`; không sync/xóa cloud. Chỉ ghi nhận hoàn tất sau kiểm tra. Bản cũ hỏng được báo và bỏ qua, các bản hợp lệ vẫn được tải.
- Upload sau backup; task `Oufeidun Drive Backup` chạy SYSTEM thử lại mỗi giờ, StartWhenAvailable, chống chạy trùng. Lỗi mạng/quota/token không làm mất bản local; trạng thái thất bại không được đánh dấu đã upload.
- Token/settings/state/log nằm trong `<data>\config\drive-backup`; rclone và script chạy theo lịch trong `<data>\tools\drive-backup`. ACL giới hạn Admin/SYSTEM và tài khoản thiết lập; không đóng gói config riêng hoặc đưa vào Git. Tác vụ luôn truyền đường dẫn config tường minh.
- Các thư mục backup cũ chưa có manifest không bị upload như bản hoàn tất. Hết dung lượng hoặc bị thu hồi quyền Google cần xử lý tài khoản/quota; xem log, không xóa dữ liệu máy chủ để thử lại.

## Màu chữ

- Full viền: đen `#000000`; chống nhìn trộm: vàng đậm `#D6A000`; không viền: xanh nước biển `#0070C0`.
- Tên mã hàng trên Excel, PNG xác nhận và bản in/PDF dùng cùng helper; số tiền/số lượng giữ nguyên. Loại trong danh mục được ưu tiên; chứng từ chỉ có SKU mới suy từ chữ CNT/privacy/không viền. Hàng tặng/mẫu cùng mã dùng cùng màu nhóm, không đổi thứ tự.

## Bằng chứng kiểm thử

- `npm.cmd run verify`: 44 dữ liệu, 49 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng, exit 0 (`.local/verify-018-drive-colors.log`). Đã xem bản in thực tế; XLSX kiểm màu font, PNG kiểm màu khi vẽ chữ, PDF kiểm computed style.
- Tải và chạy rclone v1.75.2 thật, xác minh SHA256 từ nguồn chính thức. `tests/drive-backup.ps1` dùng remote filesystem cô lập để kiểm tra copy/check, chạy lặp, checksum, bản chưa hoàn tất/hỏng/traversal, mất mạng/quota/token giả lập rồi retry, giữ file cloud-only, khóa chạy trùng, đường dẫn có khoảng trắng/ampersand.
- `tests/drive-setup.ps1` kiểm luồng mới/chạy lại, folder tùy chọn, token không in ra output, đăng ký SYSTEM mỗi giờ và hook cho cả đường dẫn backup cũ/mới. OAuth và đăng ký Scheduled Task dùng mock; copy/check dùng rclone thật. Không đăng nhập Google hay upload dữ liệu khách trong phiên kiểm thử.
- `tests/clean-backup.ps1` tạo backup MySQL test thật rồi kiểm hook upload lỗi vẫn giữ backup/PassThru đúng. Cấu hình triển khai và PowerShell parse đạt.
- MySQL integration phát hiện thêm deadlock khi kiểm trùng mã bằng SELECT LOWER/FOR UPDATE. Đã bỏ khóa quét rộng, giữ unique index migration 009 và trả ORDER_CODE_EXISTS/409 khi thua cạnh tranh. Bổ sung 12 cặp đồng thời và chạy 4 lượt integration liên tiếp đạt. API syntax/unit 6/6, LAN 1/1 đạt.
- EXE đóng gói mới qua HTTPS/MySQL kiểm tra XLSX/PNG/PDF đúng ba màu, nháp không trừ kho; staff sửa giá chung/giữ vốn, xác nhận/trả/đổi nháp Admin, báo cáo Excel không lộ vốn, nhập/tồn đầu vắng mặt: đạt. Cài đè 0.2.18 silent exit 0, installed app.asar khớp package.

## Giới hạn

Chưa xác minh OAuth/tải tới tài khoản Google thật của khách, chính sách Workspace, task SYSTEM qua reboot/UAC và hai máy/Wi-Fi vật lý tại cửa hàng. Khách cần hoàn tất bước đăng nhập/cấp quyền và xem kết quả upload thử. Bộ cài chưa ký Authenticode thương mại. Không thay đổi DB/dịch vụ/config hoặc tạo giao dịch trên máy khách trong lần này.

Bộ mới: `E:\outputt\Oufeidun-Local-0.2.18.zip` (373.888.195 byte), SHA256 `8BF5CB3CA40B2EB037F2901327E33043921169EC6B12A999B501D0CBC73FB8DD`. Setup SHA256 `55AF24CDECC58E4F2DA8755928FED6E9F03B055E2FCB1CDB771566E676D4B527`. Audit 1.161 file folder/ZIP, API/migration/asar/installer/PowerShell/loại config riêng đạt. Bản trước giữ ở `E:\outputt\_BACKUP\Oufeidun-0.2.18-before-drive-colors-20261019-223335`; bộ 0.2.17 giữ nguyên. Nhật ký và log tại FEATURE-CHECKLIST.md.
