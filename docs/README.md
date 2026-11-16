# Tài liệu Oufeidun

Source bàn giao gồm ứng dụng desktop, API LOCAL và công cụ cài đặt/vận hành cửa hàng. Bắt đầu bằng [README của dự án](../README.md), sau đó chọn tài liệu theo công việc.

## Cài đặt và vận hành

| Tài liệu | Nội dung |
| --- | --- |
| [Cài đặt máy chủ Windows](CAI-DAT-LOCAL-SERVER.md) | API, MySQL, HTTPS và vận hành cơ bản |
| [Triển khai LAN/Wi-Fi](HUONG-DAN-TRIEN-KHAI-LAN-WIFI.md) | Kết nối máy chủ/máy nhân viên, discovery và chứng chỉ |
| [Truy cập từ xa qua Tailscale](REMOTE-ACCESS-TAILSCALE.md) | Menu BAT cấu hình máy chủ và laptop, mở app và quay về LAN |
| [Hướng dẫn máy con](HUONG-DAN-CAI-MAY-CON.txt) | Các bước cài máy nhân viên |
| [Gói cập nhật máy chủ 0.1.4](SERVER-UPDATE-0.1.4-2026-11-04.md) | Backup, nâng API và kiểm tra tồn dự kiến |
| [Backup Google Drive](BACKUP-DRIVE-AND-COLORS-2026-10-19.md) | Cấu hình và kiểm tra sao lưu |

Các mẫu BAT/PowerShell giao cho cửa hàng nằm trong `deployment/customer/`. Công cụ chuyển máy chủ nằm trong `deployment/relocate/`. Cấu hình thật, backup và khóa riêng được bàn giao qua kênh riêng.

## Phát triển và phát hành

| Tài liệu | Nội dung |
| --- | --- |
| [Đặc tả nghiệp vụ](../BA-SPEC.md) | Quy tắc và quyết định nghiệp vụ theo thời gian |
| [Checklist nghiệm thu](../FEATURE-CHECKLIST.md) | Phạm vi chức năng và bằng chứng kiểm thử |
| [CI/CD ứng dụng](APP-RELEASE-CICD.md) | Build, tag, Secrets, ký và công bố bản mới |
| [Cơ chế cập nhật online](ONLINE-CLIENT-UPDATES.md) | Feed, chữ ký, tải và xác minh installer |
| [Bàn giao kỹ thuật chi tiết](CLAUDE-HANDOVER-APP.md) | Bản đồ source, kết nối và ghi nhận kiểm tra có ngày đối chiếu |

Release notes dùng bởi workflow nằm trong [releases/](releases/). Version thực tế của desktop và API lần lượt nằm trong `package.json` và `server/package.json`.

## Quy tắc nghiệp vụ cần giữ khi sửa

| Tài liệu | Phạm vi |
| --- | --- |
| [Phân quyền và chi tiết báo cáo](STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md) | Quyền từng nhân viên, vốn và giao dịch sản phẩm |
| [Phiên đăng nhập](SESSION-LIFETIME-2026-11-03.md) | Presence, deadline và thao tác giữa các thiết bị |
| [Gián đoạn kết nối](SESSION-DISCONNECT-2026-10-30.md) | Giữ trạng thái khi mất mạng và xử lý phản hồi cũ |
| [Thay mã sản phẩm](PRODUCT-RENAME-IMPACT-2026-10-28.md) | Alias, snapshot và lịch sử |
| [Danh tính khách hàng](CUSTOMER-IDENTITY-2026-10-21.md) | Số điện thoại tạm và tránh gộp nhầm khách |
| [Điều chỉnh tồn](STOCK-ADJUSTMENT-2026-10-24.md) | Lý do, xung đột và lịch sử |
| [Tồn dự kiến](STOCK-FORECAST-2026-11-03.md) | Số lượng đơn nháp và cảnh báo mềm |
| [Cảnh báo tồn](STOCK-WARNINGS-2026-11-04.md) | Phản hồi khi thêm hàng vượt tồn dự kiến |
| [Ảnh đơn hàng dài](LONG-INVOICE-IMAGES-2026-11-09.md) | Một PNG rõ nét và giới hạn kích thước |
| [Thứ tự báo cáo Excel](REPORT-PRODUCT-ORDER-2026-11-12.md) | Danh sách mẫu và mã mới nằm cuối |
| [Ngày tính doanh thu](REPORT-REVENUE-2026-10-23.md) | Đơn, giao hàng, phí và thu tiền |
| [Màu mã và chứng từ](REPORT-CODE-APP-COLORS-2026-10-20.md) | Nhận diện mã trên UI và file xuất |

## Tài liệu lịch sử

[archive/](archive/) lưu các kế hoạch cũ và báo cáo nghiệm thu/phát hành theo ngày. Những tài liệu này mô tả trạng thái tại thời điểm viết. Đối chiếu README, source và workflow hiện tại khi thao tác.

Các hướng dẫn `BAT-DAU-<version>.txt` cũ được giữ trong `deployment/customer/` để tra cứu các bộ bàn giao và hỗ trợ script staging theo version. Script `stage-customer-client.ps1` còn guard 0.2.16, còn `stage-customer-local.ps1` cần hướng dẫn trùng version. Quy trình phát hành desktop hiện tại là CI/CD được liên kết phía trên.
