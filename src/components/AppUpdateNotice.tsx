import { useEffect, useState } from 'react';
import type { AppUpdateStatus } from '../electron';

export default function AppUpdateNotice() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const api = window.oufeidun;
    if (!api?.updateStatus) return;
    let active = true;
    const refresh = async () => {
      try { const value = await api.updateStatus!(); if (active) setStatus(value); } catch { /* Updating must not block sales. */ }
    };
    void refresh(); const timer = setInterval(() => void refresh(), 1500);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!status) return null;
  const busy = status.phase === 'checking' || status.phase === 'downloading';
  async function action(kind: 'checkUpdate' | 'downloadUpdate') {
    setMessage('');
    try { const result = await window.oufeidun?.[kind]?.(); if (result) setStatus(result); }
    catch { setMessage('Không thực hiện được. Vui lòng thử lại.'); }
  }
  return <aside className="app-update-notice" aria-label="Cập nhật ứng dụng">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
      {status.phase === 'available' ? `Có bản mới ${status.version}` : 'Cập nhật ứng dụng'}
    </button>
    {open && <div className="app-update-details">
      <strong>Oufeidun · {status.currentVersion}</strong>
      <p role="status">{status.phase === 'disabled' ? 'Kênh cập nhật chưa được cấu hình.' :
        status.phase === 'unpublished' ? 'Chưa có bản cập nhật được công bố.' :
        status.phase === 'checking' ? 'Đang kiểm tra phiên bản…' :
        status.phase === 'current' ? 'Bạn đang dùng bản mới nhất trên kênh cập nhật.' :
        status.phase === 'available' ? `Có phiên bản ${status.version} (${((status.size || 0) / 1048576).toFixed(1)} MB).` :
        status.phase === 'downloading' ? `Đang tải: ${status.progress || 0}%` :
        status.phase === 'downloaded' ? 'File đã tải và xác minh. Hãy lưu công việc, đóng app rồi mở bộ cài trong thư mục tải.' :
        status.phase === 'error' ? status.message : 'Kiểm tra để tìm phiên bản mới.'}</p>
      {status.notes && <p className="app-update-notes">{status.notes}</p>}
      {status.phase === 'downloading' && <progress aria-label="Tiến độ tải cập nhật" max={100} value={status.progress || 0} />}
      <small>Không thay đổi dữ liệu hoặc cấu hình máy chủ. Bộ cài không tự chạy.</small>
      <div className="actions">
        <button type="button" disabled={busy || ['disabled', 'downloaded'].includes(status.phase)} onClick={() => void action('checkUpdate')}>Kiểm tra phiên bản</button>
        {(status.phase === 'available' || (status.phase === 'error' && status.version)) && <button type="button" onClick={() => void action('downloadUpdate')}>Tải bản cập nhật</button>}
        {status.phase === 'downloaded' && <button type="button" onClick={async () => {
          try { if (!await window.oufeidun?.showUpdateFile?.()) setMessage('Không tìm thấy file hợp lệ. Hãy kiểm tra lại bản cập nhật.'); }
          catch { setMessage('Không mở được thư mục tải.'); }
        }}>Mở thư mục tải</button>}
      </div>
      {message && <p role="alert">{message}</p>}
    </div>}
  </aside>;
}
