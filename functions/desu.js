// Cloudflare Pages Function Proxy for Desustream
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url") || "";

  if (!target || !/^https?:\/\/[a-z0-9.-]*desustream\.[a-z0-9]+/i.test(target)) {
    return new Response("URL desustream tidak valid", { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://otakudesu.cloud/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return new Response(`Gagal memuat video (${upstream.status})`, { status: upstream.status });
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

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Proxy error: ${e.message}`, { status: 502 });
  }
}
