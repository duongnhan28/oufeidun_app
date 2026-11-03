# Phiên đăng nhập LOCAL sau mất mạng/sleep — 03/11/2026

Người dùng duyệt làm phần đăng xuất trước. Không triển khai tồn dự kiến; chờ khách xác nhận.

## Hành vi mới

- Phiên login có deadline tuyệt đối12h từ lúc nhập đúng mật khẩu, không hết theo giờ17h và không tự kéo dài khi touch. SESSION_MAX_SECONDS mặc định43200; tùy chọn số nguyên300–86400giây. Giữ config khách khi cập nhật; không cần thêm env mới để nhận mặc định.
- SESSION_IDLE_SECONDS mặc định90 chỉ là presence lease: nếu máy khác đăng nhập trong lúc token cũ còn hợp lệ và vừa touch thì báo SESSION_ALREADY_ACTIVE. Khi mất liên lạc quálease, máy khác có thể claim; token mới thay token cũ để chỉ còn một token hợp lệ.
- Máy mất mạng/sleep rồi hoạt động lại giữ token nếu chưa hết deadline/chưa bị thay/thu hồi. Same-device nhập password lại luôn được cấp token mới ngay. Mở lại app sau khi đã đóng vẫn phải login, token chỉ giữ trong memory; không lưu password hoặc phát lại giao dịch.
- Auth touch cập nhật có điều kiện token/active/deleted/deadline; nếu bị đổi token giữa đọc/cập nhật thì401. Cleanup token hết hạn/logout cũng có điều kiện hash, không xóa phiên mới.
- Giữ toàn bộ sửa30/10: lỗi mạng/timeout/5xx không coi là hết phiên, timer thu nhỏ, loại phản hồi cũ, logout lỗi mạng đóng local và bắt lỗi, không đụng token mới.

## Nâng cấp và ảnh hưởng

MySQL013 thêm session_expires_at DATETIME(3) NULL. Không viết lại/xóa account, mật khẩu/quyền, dữ liệu đơn/tiền/tồn. Không biết thời điểm login của token cũ nên token NULL yêu cầu login một lần khi cập nhật, không tự cấp thêm12h. Migration additive/re-run an toàn, không thay deadline phiên mới khi chạy lại. Backup dump tự gồm cột mới; CLEAN giữ toàn bộ app_users theo cơ chế cũ.

LOCAL API/client, không đổi Supabase online hoặc demo. Máy chủ cập nhật API/migration trước rồi cập nhật app mọi máy để có cả client fixes30/10. Chưa tạo installer/ZIP app mới; bộ29/10 chưa chứa các sửa này. Không sửa power plan/Wi-Fi ở máy khách từ máy phát triển.

Log khách tạo02/11 chỉ ghi các sự kiện30/10, có sleep/wake/mất-kết nối mạng. Chưa đủ bằng chứng giải thích mọi lần gần17h. Sửa này xử lý app/session khi gặp gián đoạn; không khẳng định sửa được router/driver hay Windows sleep.

## Kiểm thử

- Unit auth clock trước/sau17h:presence25/89/91/3600/14400s còn deadline đều dùng được; hết hạn/đúngbiên/NULL/malformed/disabled/đổi token trong request vẫn401; same-device login ngay, device khác active409.
- MySQL integration riêng:12h được ghi thật, không gia hạn qua touch; offline2phút/30phút/4giờ; claim sau91s/token cũ không dùng; logout; deadline; NULL legacy; reset password/khóa/mở/xóa qua service thực; migration013 chạy lại hai lần giữ tất cả dòng app_users và business snapshots.
- Hồi quy MySQL nghiệp vụ kho/đơn/giá/khách/rename/chứng từ và phân quyền riêng chạy riêng, không bỏ assertions.
- Electron source LOCAL qua HTTPS có certificate/discovery riêng, MySQL test thật: giả lập thời gian offline bằng session_last_seen, giữ form/token/deadline; ngắt upstream API thật rồi nối lại không login; hết deadline thật về login. Không cho máy phát triển sleep và không truy cập DB/config khách.
- Kết quả/lượt cuối ở FEATURE-CHECKLIST.md, logs .local/session-lifetime-*-20261103.*. Chỉ báo hoàn tất sau verify và native đạt.

## Kết quả cuối

Verify exit0:60data/56UI/Electron smoke/TypeScript/build/production audit0;server production audit0;unit auth10/10;MySQL business/permissions/lifetime không skip đều pass. Build LOCAL và native source qua HTTPS/MySQL pass cả offline/reconnect/giữ form/token/deadline/expiry. Native relogin5vòng,401 muộn và logout mạng lỗi pass. Chưa đóng gói app hoặc nghiệm thu hai máy vật lý tại khách.

Giữ log lượt thất bại:1toast assertion dưới tải song song, đơn đã bán đúng, chạy riêng/full sau pass không sửa assertion;1audit fail do advisory mới. Cập nhật scoped override minimatch11.0.1 dưới ExcelJS4.4.0 và lockfile; test nén glob/XLSX thực pass, production audit sạch. Nguồn [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Không gộp các dev dependency warnings vào tuyên bố production0.
