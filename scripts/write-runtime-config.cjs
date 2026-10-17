const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] || "default";
const root = path.resolve(__dirname, "..");

function parse(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

const modeFiles =
  mode === "default"
    ? [".env", ".env.local"]
    : [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
const env = Object.assign(
  {},
  ...modeFiles.map((file) => parse(path.join(root, file))),
  process.env,
);

const lookupApiUrl = String(env.VITE_GLASS_LOOKUP_API_URL || "").trim();
let parsed;
try {
  parsed = new URL(lookupApiUrl);
} catch {
  throw new Error("VITE_GLASS_LOOKUP_API_URL khong hop le.");
}
if (
  parsed.protocol !== "https:" &&
  !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname))
) {
  throw new Error("API tra cuu phai dung HTTPS, tru localhost khi phat trien.");
}

const output = path.join(root, "dist", "server-config.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      environment: env.VITE_SERVER_ENV || mode,
      backend: env.VITE_DATA_BACKEND || "supabase",
      apiBaseUrl: env.VITE_DATA_BACKEND === "api" ? String(env.VITE_API_BASE_URL || "") : "",
      lookupApiUrl: parsed.toString(),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`Da tao runtime config ${mode}: ${parsed.host}`);
