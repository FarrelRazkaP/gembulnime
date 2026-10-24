// Server statis frontend Gembulnime (port 5173) + desuProxy.
// API Anime menggunakan Sanka Vollerei API (https://www.sankavollerei.web.id/anime/).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

async function desuProxy(url, res) {
  const target = url.searchParams.get("url") || "";
  if (!target || !/^https?:\/\/[a-z0-9.-]*(desustream|desu\.stream|otakuwatch)\.[a-z0-9]+/i.test(target)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("URL desustream tidak valid");
    return;
  }
  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://otakudesu.blog/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      res.writeHead(upstream.status, { "Content-Type": "text/plain; charset=utf-8" }).end(`Gagal memuat video (${upstream.status})`);
      return;
    }
    let html = await upstream.text();
    const urlObj = new URL(target);
    const base = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1)}`;

    // Inject <base> tag agar aset relatif (seperti playerjs.js) diresolve ke domain desustream
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head><base href="${base}">`);
    } else if (html.includes("<head ")) {
      html = html.replace(/<head[^>]*>/i, `$&<base href="${base}">`);
    } else {
      html = `<base href="${base}">` + html;
    }

    // Hapus CSP meta jika ada agar iframe bisa dimuat tanpa blokir
    html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    }).end(html);
  } catch (e) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" }).end(`Proxy error: ${e.message}`);
  }
}

createServer(async (req, res) => {
  const reqUrl = new URL(req.url, "http://x");
  if (reqUrl.pathname === "/desu") return desuProxy(reqUrl, res);
  const path = decodeURIComponent(reqUrl.pathname);
  const file = normalize(join(ROOT, path === "/" ? "index.html" : path));
  // hanya layani index.html dan assets/, jangan bocorkan folder lain
  if (!file.startsWith(join(ROOT, "assets")) && file !== join(ROOT, "index.html")) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Gembulnime jalan di http://localhost:${PORT}`));
