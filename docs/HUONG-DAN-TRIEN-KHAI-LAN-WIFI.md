# Hướng dẫn triển khai Oufeidun trong mạng LAN/Wi-Fi

Phiên bản này dùng một máy Windows làm máy chủ. Máy chủ có thể cắm dây LAN, còn máy nhân viên có thể dùng Wi-Fi. Hai loại kết nối hoạt động cùng nhau khi cùng mạng nội bộ hoặc router cho phép hai dải mạng liên lạc với nhau.

## 1. Mô hình sử dụng

```text
Máy nhân viên (Wi-Fi) ─┐
                       ├─ Router/Switch ─ HTTPS cổng 443 ─ Máy chủ (LAN)
Máy nhân viên (LAN) ───┘                              └─ API + MySQL
```

- Dữ liệu bán hàng, kho, khách hàng và tài khoản nằm trên máy chủ.
- Máy nhân viên không kết nối trực tiếp MySQL và không cần cài MySQL hoặc Node.js.
- Màn **Mã dùng chung** cần Internet. Các nghiệp vụ local còn lại chỉ cần mạng nội bộ.
- Máy chủ có thể khóa bằng `Windows + L`, nhưng không được Sleep/Hibernate trong giờ bán hàng.

## 2. Chuẩn bị máy chủ

Máy chủ mới cần:

- Windows 10/11 64-bit, tài khoản có quyền Administrator.
- Ổ `E:` để lưu `E:\OufeidunServerData`.
- MySQL Server 8.0 cài tại đường dẫn mặc định và service `MySQL80` đang chạy.
- Node.js LTS và kết nối Internet trong lần cài đầu để tải Caddy/thư viện.
- Cắm dây LAN, đặt mạng Windows là **Private** và dành IP cố định trên router.

Máy chủ hiện tại dùng:

- IP: `192.168.0.102`
- Tên nội bộ: `oufeidun.home.arpa`
- Cổng client sử dụng: HTTPS `443`
- MySQL `3306` và API `8787` chỉ mở nội bộ trên chính máy chủ.

### Cài máy chủ mới

1. Chép toàn bộ source vào máy chủ.
2. Nhấp phải `CAI-MAY-CHU-LOCAL.cmd`, chọn **Run as administrator**.
3. Nhập mật khẩu root MySQL và tạo mật khẩu Admin Oufeidun tối thiểu 12 ký tự.
4. Chờ cài database, API, HTTPS, firewall, backup và tác vụ tự chạy.
5. Mở `https://oufeidun.home.arpa/health`; kết quả đúng là `{ "ok": true }`.

### Cập nhật máy chủ hiện tại

1. Tạo backup trước khi cập nhật.
2. Copy source API/migration mới vào `E:\OufeidunServerData\app` và chạy migration.
3. Nhấp đúp `KHOI-DONG-LAI-MAY-CHU.cmd` và bấm **Yes** ở cửa sổ UAC. Có thể làm thủ công bằng PowerShell Administrator:

```powershell
cd E:\AppBanHang
powershell -ExecutionPolicy Bypass -File scripts\restart-local-services.ps1
```

4. Kiểm tra lại URL `/health` và thử đăng nhập từ một máy nhân viên.

## 3. Chuẩn bị mạng LAN và Wi-Fi

1. LAN và Wi-Fi phải dùng cùng router hoặc được router định tuyến qua lại.
2. Không dùng Wi-Fi **Guest/Khách**.
3. Tắt `AP Isolation`, `Client Isolation` hoặc tính năng chặn thiết bị Wi-Fi truy cập LAN.
4. Dành IP `192.168.0.102` cho MAC của máy chủ trong mục DHCP Reservation của router.
5. Windows Firewall trên máy chủ chỉ cần cho phép TCP `443` từ mạng nội bộ.

Kiểm tra tại máy nhân viên:

```powershell
ping 192.168.0.102
Test-NetConnection 192.168.0.102 -Port 443
```

`TcpTestSucceeded : True` nghĩa là đường mạng tới ứng dụng đã thông. Một số router chặn ping nhưng vẫn cho cổng 443; kết quả cổng 443 là kiểm tra quan trọng hơn.

## 4. Cài máy nhân viên

Máy nhân viên chỉ cần Windows 10/11 64-bit và kết nối LAN/Wi-Fi nội bộ. Không cần cài MySQL, Node.js hoặc chia sẻ thư mục.

1. Chép file ZIP bộ cài sang máy nhân viên.
2. Đóng hoàn toàn phiên bản Oufeidun đang chạy trên máy, nếu có.
3. Giải nén toàn bộ ZIP ra một thư mục.
4. Nhấp phải `CAI-MAY-CON.cmd`, chọn **Run as administrator** và bấm **Yes**.
5. Script cài chứng chỉ HTTPS nội bộ, ánh xạ `oufeidun.home.arpa` về máy chủ rồi mở `Oufeidun-Setup.exe`.
6. Hoàn tất bộ cài, mở Oufeidun từ Start Menu và đăng nhập bằng tài khoản nhân viên được cấp.
7. Mở `https://oufeidun.home.arpa/health` để kiểm tra kết nối nếu ứng dụng báo mất máy chủ.

Chứng chỉ `root.crt` trong bộ cài chỉ dùng để máy nhân viên tin cậy HTTPS nội bộ của đúng máy chủ Oufeidun. Không lấy chứng chỉ từ nguồn khác.

## 5. Kiểm tra sau cài đặt

- Đăng nhập được từ từng máy bằng tài khoản riêng.
- Chỉ một máy được sử dụng cùng một tài khoản tại một thời điểm.
- Tạo đơn nháp với **mã đơn tự nhập**, đóng/mở lại và thấy đúng mã.
- Tại màn Bán hàng, bấm **Tải ảnh xác nhận** và mở được file PNG.
- Máy khác nhìn thấy đơn và tồn kho mới sau khi tải lại.
- Khóa máy chủ bằng `Windows + L`, máy nhân viên vẫn thao tác được.
- Rút Internet nhưng giữ LAN/Wi-Fi: bán hàng local vẫn hoạt động; riêng Mã dùng chung báo không có kết nối.

## 6. Vận hành và xử lý lỗi

- Backup tự chạy lúc 23:00 tại `E:\OufeidunServerData\backups`.
- Không tắt máy chủ, Sleep hoặc Hibernate trong giờ bán hàng.
- Gỡ/cài lại ứng dụng máy nhân viên không làm mất dữ liệu trên máy chủ.
- Nếu Wi-Fi không kết nối nhưng LAN kết nối được, kiểm tra Wi-Fi Guest và AP/Client Isolation trên router.
- Nếu IP máy chủ thay đổi, đặt lại DHCP Reservation rồi chạy lại `CAI-MAY-CON.cmd` được tạo với IP mới.
- Nếu `/health` không mở ngay trên máy chủ, kiểm tra các Scheduled Task `Oufeidun Local API`, `Oufeidun HTTPS` và service `MySQL80`.
