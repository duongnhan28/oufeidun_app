export async function saveDownload(blob: Blob, filename: string) {
  filename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
  if (window.oufeidun?.saveExport) {
    const saved = await window.oufeidun.saveExport(filename, new Uint8Array(await blob.arrayBuffer()));
    return saved;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
