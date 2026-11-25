# Phát hành AppBanHang LOCAL qua GitHub Actions

Repository: `duongnhan28/oufeidun_app`. Workflow: `.github/workflows/app-release.yml`.

## Khi nào chạy?

- Push `main`, pull request hoặc Run workflow: kiểm thử và build bộ cài Windows LOCAL. Main còn kiểm tra ký manifest. Không đưa bản thử lên hosting.
- Push tag `vX.Y.Z`: kiểm thử, build, ký manifest rồi công bố bộ cài lên `https://oufeidun.vn/app-updates/`.
- Tag phải trùng `package.json`; commit phải thuộc lịch sử `main`. Chỉ phát hành số phiên bản lớn hơn feed đang công bố. Không tái sử dụng tag hoặc dựng lại một phiên bản đã phát hành với hash khác.

## Phát hành bản tiếp theo

Source desktop hiện ghi 0.1.8. Khi phát hành, kiểm lại feed có chữ ký để xác định bản đang phân phối. Khi thật sự có thay đổi cần giao khách:

```powershell
npm version 0.1.8 --no-git-tag-version
# Viết docs/releases/0.1.8.md, tối đa 4000 ký tự.
git add package.json package-lock.json docs/releases/0.1.8.md
# Thêm các file source đã sửa cần phát hành vào commit.
git commit -m "Release LOCAL 0.1.8"
git push origin main
# Đợi CI main thành công, sau đó:
git tag v0.1.8
git push origin v0.1.8
```

Xem Actions → AppBanHang CI and LOCAL release. Khi job `sign-and-publish` thành công, app khách kiểm tra feed sẽ thấy phiên bản mới; khách chọn tải rồi cài. App đang ở 0.1.8 sẽ không nhận lại 0.1.8. Khách dùng bản cũ chưa có updater cần cài bộ cài hỗ trợ cập nhật một lần.

## Dữ liệu và cấu hình

CI chỉ đóng gói client `local-mysql` x64, không đóng gói hoặc cài server. Profile mặc định là `https://oufeidun.home.arpa/api/app/v1`, tra kính dùng `https://oufeidun.vn/api/glass-lookup`. Cấu hình riêng của cửa hàng do app giữ trong user data; không đưa password, database, backup hoặc kết nối của khách vào artifact.

Migration DB hoặc cập nhật API server phải có kế hoạch riêng: backup DB, migration tương thích với client cũ, cập nhật server trước rồi mới phát hành client phụ thuộc API mới. Workflow này không chạy migration và không thay đổi server cửa hàng.

## Chữ ký và Secrets

Environment `app-production` chỉ nhận branch `main` và tag `v*`. Secrets: `APP_UPDATE_SIGNING_KEY`, `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_KNOWN_HOSTS`.

Khóa ký Ed25519 phải khớp `electron/update-config.json` và các app đã cài. Giữ bản sao khóa bên ngoài Git; không tạo khóa mới khi chuyển máy hoặc tài khoản. Private key chỉ đưa vào bước ký; SSH key chỉ đưa vào bước phát hành. Đây là chữ ký manifest cập nhật, không phải chứng chỉ nhà phát hành Windows Authenticode.

## Hosting và khôi phục

- Bộ cài nằm trong `/home/hwqrwrir/app-updates/files/<sha256>.exe`; feed trong `stable/local-mysql-win32-x64.json`.
- Upload vào `.ci-incoming/<commit>-<run>-<attempt>`, kiểm tra quota còn đủ file cộng 256 MiB dự phòng, hash và chữ ký trước công bố.
- Dùng chung `/home/hwqrwrir/apps/oufeidun/.deploy-lock` với website. Không xóa khóa của lượt chạy khác. Nếu khóa đang bận quá thời hạn thì phát hành dừng để chạy lại.
- Cài public key pin tại `app-updates/trusted-public-key.pem`; khác khóa sẽ dừng. Private key không lên hosting.
- Đưa installer vào tên hash bất biến trước; sao lưu feed `.before-*`, đổi feed bằng rename cuối cùng. Nếu public feed hoặc trang chủ lỗi ngay sau đổi thì phục hồi feed trước đó.
- Cleanup của website giữ các bộ cài đang được feed hiện tại/lịch sử gần nhất tham chiếu. File không được tham chiếu có thời gian chờ; xem `docs/HOSTING-RETENTION.md` ở repo web. Không xóa toàn bộ thư mục `files`.
- Nếu SSH lỗi, runner bị hủy hoặc phát hành thất bại, staging được giữ để tránh xóa file khi tiến trình remote vẫn chạy; có thể còn lock. Kiểm tra chắc chắn không còn lượt deploy đang chạy trước khi dọn đúng staging/lock; không tự ý xóa khóa đang hoạt động. Sửa lỗi rồi rerun tag, không đổi tag sang commit khác.
- Nếu cần quay về mã nguồn cũ sau một phát hành thành công, tạo **phiên bản cao hơn** chứa bản sửa/hoàn nguyên; updater không hạ phiên bản tự động.

## Chi phí và kiểm chứng

Build chạy trên Windows runner của GitHub, không dùng RAM hosting để build app. Bộ cài artifact chỉ giữ 1 ngày; manifest nhỏ giữ 7 ngày. Runner và artifact vẫn tính vào hạn mức GitHub của tài khoản; workflow không mua thêm dịch vụ. Hosting dùng streaming để hash file, không nạp toàn bộ bộ cài vào RAM.

Kiểm chứng an toàn: push main hoặc Run workflow; xác nhận build/ký thành công và hash feed công khai không đổi. Chọn phiên bản thử cao hơn feed hiện tại khi được giao phát hành thật. Các test release dùng thư mục và khóa giả, kiểm tra chặn downgrade, sai hash/chữ ký, quota, lock, công bố và rollback.
