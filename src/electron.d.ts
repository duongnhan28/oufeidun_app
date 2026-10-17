export {};

declare global {
  interface Window {
    oufeidun?: {
      apiBaseUrl?: string;
      findServer?(): Promise<{connected:boolean;hostName?:string;ip?:string;message?:string}>;
      lookupGlass(query: string): Promise<{ items?: import('./data/client').SharedLookupItem[] }>;
      saveExport?(filename: string, bytes: Uint8Array): Promise<boolean>;
    };
  }
}
