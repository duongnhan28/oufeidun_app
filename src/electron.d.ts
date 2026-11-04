export {};

export type AppUpdateStatus = {
  currentVersion: string;
  phase: 'disabled' | 'idle' | 'checking' | 'unpublished' | 'available' | 'current' | 'downloading' | 'downloaded' | 'error';
  version?: string; notes?: string; size?: number; progress?: number; message?: string;
};

declare global {
  interface Window {
    oufeidun?: {
      apiBaseUrl?: string;
      updateStatus?(): Promise<AppUpdateStatus>;
      checkUpdate?(): Promise<AppUpdateStatus>;
      downloadUpdate?(): Promise<AppUpdateStatus>;
      showUpdateFile?(): Promise<boolean>;
      findServer?(): Promise<{connected:boolean;hostName?:string;ip?:string;message?:string}>;
      lookupGlass(query: string): Promise<{ items?: import('./data/client').SharedLookupItem[] }>;
      saveExport?(filename: string, bytes: Uint8Array): Promise<boolean>;
    };
  }
}
