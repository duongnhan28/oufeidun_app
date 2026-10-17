const path = require('node:path');

const runtime = process.env.OUFEIDUN_RUNTIME_APP;
if (!runtime) throw new Error('Thiếu đường dẫn runtime Oufeidun.');
const { pool, passwordHash, passwordMatches } = require(path.join(runtime, 'src', 'core.cjs'));

async function main() {
  const action = process.argv[2] || process.env.OUFEIDUN_ACCOUNT_ACTION || 'list';
  if (action === 'list') {
    const [rows] = await pool.query(`SELECT login_name,display_name,role,active,
      CASE WHEN deleted_at IS NULL THEN 'Không' ELSE 'Có' END AS da_xoa,
      CASE WHEN session_token_hash IS NULL THEN 'Không' ELSE 'Có' END AS dang_co_phien
      FROM app_users ORDER BY role,login_name`);
    console.table(rows.map(row => ({
      'Tên đăng nhập': row.login_name,
      'Tên hiển thị': row.display_name,
      'Vai trò': row.role,
      'Hoạt động': Boolean(row.active) ? 'Có' : 'Không',
      'Đã xóa': row.da_xoa,
      'Đang có phiên': row.dang_co_phien,
    })));
    return;
  }
  const login = String(process.env.OUFEIDUN_ACCOUNT_LOGIN || '').trim().toLowerCase();
  const password = String(process.env.OUFEIDUN_ACCOUNT_PASSWORD || '');
  const [[user]] = await pool.execute('SELECT * FROM app_users WHERE login_name=? LIMIT 1', [login]);
  if (!user) throw new Error(`Không tìm thấy tài khoản: ${login}`);
  if (action === 'verify') {
    const correct = passwordMatches(password, user.password_hash);
    console.log(correct ? 'MẬT KHẨU ĐÚNG.' : 'MẬT KHẨU KHÔNG ĐÚNG.');
    console.log(`Trạng thái tài khoản: ${user.active && !user.deleted_at ? 'Đang hoạt động' : 'Đang bị khóa/xóa'}.`);
    if (!correct) process.exitCode = 3;
    return;
  }
  if (action === 'reset') {
    const hash = passwordHash(password);
    await pool.execute(`UPDATE app_users SET password_hash=?,active=TRUE,deleted_at=NULL,
      session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?`, [hash, user.id]);
    console.log(`ĐÃ ĐẶT LẠI MẬT KHẨU VÀ MỞ KHÓA: ${login}`);
    return;
  }
  throw new Error('Thao tác không hợp lệ.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
