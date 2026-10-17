# Cài đặt Oufeidun Local Server trên Windows

## Máy chủ

1. Kết nối máy chủ với router bằng dây LAN và đặt IP cố định/DHCP reservation.
2. Đảm bảo dịch vụ `MySQL80` đang chạy.
3. Mở `CAI-MAY-CHU-LOCAL.cmd` và chấp nhận cửa sổ UAC.
4. Nhập mật khẩu root MySQL và tạo mật khẩu admin khi cửa sổ yêu cầu. Mật khẩu không hiển thị và không được ghi vào source.
5. Chờ script cài Local API, Caddy HTTPS, Windows Firewall, backup và tác vụ tự chạy.
6. Kiểm tra `https://oufeidun.home.arpa/health` trả `{ "ok": true }`.

Máy chủ được đặt không Sleep khi cắm điện, nhưng màn hình tự tắt sau 5 phút. Có thể khóa bằng `Windows + L`.

## Tạo bộ cài máy con

Sau khi HTTPS đã chạy, tại source chạy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-local-client.ps1
powershell -ExecutionPolicy Bypass -File scripts\export-local-client-kit.ps1 -ServerIp 192.168.0.102
```

Chép toàn bộ `E:\OufeidunServerData\client-kit` sang máy con và chạy `CAI-MAY-CON.cmd`. Script cài chứng chỉ nội bộ, ánh xạ hostname và mở bộ cài ứng dụng.

## Vận hành

- Không mở cổng MySQL `3306` hoặc API nội bộ `8787` trên router/firewall.
- Chỉ cổng HTTPS `443` được mở cho mạng Private/LocalSubnet.
- Không đặt máy chủ ở Sleep hoặc Hibernate trong giờ bán hàng.
- Backup tự chạy lúc 23:00 vào `E:\OufeidunServerData\backups`.
- Gỡ ứng dụng trên máy con không làm mất dữ liệu máy chủ.
- Trước khi phục hồi dữ liệu phải dừng tác vụ `Oufeidun Local API` và tạo thêm một bản backup hiện trạng.
