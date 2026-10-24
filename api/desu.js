// Vercel Serverless Function Proxy for Desustream
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

export default async function handler(req, res) {
  const target = req.query.url || "";
  if (!target || !/^https?:\/\/[a-z0-9.-]*(desustream|desu\.stream|otakuwatch)\.[a-z0-9]+/i.test(target)) {
    return res.status(400).send("URL desustream tidak valid");
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
      return res.status(upstream.status).send(`Gagal memuat video (${upstream.status})`);
    }

    let html = await upstream.text();
    const urlObj = new URL(target);
    const base = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1)}`;

    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head><base href="${base}">`);
    } else if (html.includes("<head ")) {
      html = html.replace(/<head[^>]*>/i, `$&<base href="${base}">`);
    } else {
      html = `<base href="${base}">` + html;
    }

    html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(html);
  } catch (e) {
    return res.status(502).send(`Proxy error: ${e.message}`);
  }
}
