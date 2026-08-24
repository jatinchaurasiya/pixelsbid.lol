import { NextResponse } from "next/server";
import { isSafePublicUrl, checkRateLimit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rate = checkRateLimit(`metadata_${ip}`, 40, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let targetUrl = url.trim();

    // Handle @twitter / @x handle
    if (targetUrl.startsWith("@")) {
      const handle = targetUrl.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
      targetUrl = `https://x.com/${handle}`;
      return NextResponse.json({
        success: true,
        title: `@${handle}`,
        description: `Official Twitter / X profile of @${handle}`,
        imageUrl: `https://unavatar.io/x/${handle}`,
        favicon: `https://www.google.com/s2/favicons?domain=x.com&sz=128`,
        targetUrl,
        category: "Community",
      });
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    // SSRF & Protocol Smuggling Check
    const safeCheck = isSafePublicUrl(targetUrl);
    if (!safeCheck.safe || !safeCheck.url) {
      return NextResponse.json({ error: safeCheck.reason || "Invalid destination URL" }, { status: 400 });
    }

    const parsedUrl = safeCheck.url;
    const domain = parsedUrl.hostname.replace(/^www\./, "");
    const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    let fallbackTitle = domain
      .split(".")[0]
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(parsedUrl.href, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PixelsBidBot/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      // Memory DoS Protection: Read at most 256KB of HTML
      const reader = res.body?.getReader();
      let html = "";
      if (reader) {
        let bytesRead = 0;
        const decoder = new TextDecoder();
        while (bytesRead < 256 * 1024) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bytesRead += value.length;
            html += decoder.decode(value, { stream: true });
          }
        }
        reader.cancel().catch(() => {});
      } else {
        html = (await res.text()).slice(0, 256 * 1024);
      }

      // 1. Extract Title
      let title = "";
      const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
      const docTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

      if (ogTitleMatch && ogTitleMatch[1]) {
        title = decodeHtmlEntities(ogTitleMatch[1].trim());
      } else if (twitterTitleMatch && twitterTitleMatch[1]) {
        title = decodeHtmlEntities(twitterTitleMatch[1].trim());
      } else if (docTitleMatch && docTitleMatch[1]) {
        title = decodeHtmlEntities(docTitleMatch[1].trim());
      } else {
        title = fallbackTitle;
      }

      // Clean title from common pipe/dash branding suffixes (e.g. "Acme | The Modern Workflow" -> "Acme")
      if (title.length > 50) {
        title = title.split(/[|•–—]/)[0].trim() || title.slice(0, 50);
      }

      // 2. Extract Description (What the product does)
      let description = "";
      const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
      const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const twitterDescMatch = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i) ||
                               html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i);

      if (ogDescMatch && ogDescMatch[1]) {
        description = decodeHtmlEntities(ogDescMatch[1].trim());
      } else if (metaDescMatch && metaDescMatch[1]) {
        description = decodeHtmlEntities(metaDescMatch[1].trim());
      } else if (twitterDescMatch && twitterDescMatch[1]) {
        description = decodeHtmlEntities(twitterDescMatch[1].trim());
      }

      // 3. Extract Best Icon / Logo
      let imageUrl = "";
      const appleTouchIconMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i) ||
                                  html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i);
      const svgIconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+type=["']image\/svg\+xml["'][^>]+href=["']([^"']+)["']/i) ||
                           html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']image\/svg\+xml["']/i);
      const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                        html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
      const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (svgIconMatch && svgIconMatch[1]) {
        imageUrl = resolveUrl(svgIconMatch[1], targetUrl);
      } else if (appleTouchIconMatch && appleTouchIconMatch[1]) {
        imageUrl = resolveUrl(appleTouchIconMatch[1], targetUrl);
      } else if (iconMatch && iconMatch[1]) {
        imageUrl = resolveUrl(iconMatch[1], targetUrl);
      } else if (ogImageMatch && ogImageMatch[1]) {
        imageUrl = resolveUrl(ogImageMatch[1], targetUrl);
      } else {
        imageUrl = fallbackFavicon;
      }

      // 4. Infer Category if possible
      const textToAnalyze = `${title} ${description} ${domain}`.toLowerCase();
      let inferredCategory = "SaaS";
      if (textToAnalyze.includes("ai") || textToAnalyze.includes("gpt") || textToAnalyze.includes("llm") || textToAnalyze.includes("agent") || textToAnalyze.includes("model")) {
        inferredCategory = "AI";
      } else if (textToAnalyze.includes("dev") || textToAnalyze.includes("api") || textToAnalyze.includes("code") || textToAnalyze.includes("github") || textToAnalyze.includes("terminal") || textToAnalyze.includes("cloud")) {
        inferredCategory = "DevTools";
      } else if (textToAnalyze.includes("seo") || textToAnalyze.includes("marketing") || textToAnalyze.includes("growth") || textToAnalyze.includes("analytics") || textToAnalyze.includes("email")) {
        inferredCategory = "Marketing";
      } else if (textToAnalyze.includes("design") || textToAnalyze.includes("figma") || textToAnalyze.includes("ui") || textToAnalyze.includes("ux") || textToAnalyze.includes("3d") || textToAnalyze.includes("creative")) {
        inferredCategory = "Design";
      } else if (textToAnalyze.includes("crypto") || textToAnalyze.includes("solana") || textToAnalyze.includes("bitcoin") || textToAnalyze.includes("finance") || textToAnalyze.includes("pay") || textToAnalyze.includes("bank")) {
        inferredCategory = "Fintech";
      } else if (textToAnalyze.includes("productivity") || textToAnalyze.includes("notion") || textToAnalyze.includes("task") || textToAnalyze.includes("workflow") || textToAnalyze.includes("notes")) {
        inferredCategory = "Productivity";
      } else if (textToAnalyze.includes("shop") || textToAnalyze.includes("store") || textToAnalyze.includes("ecommerce") || textToAnalyze.includes("product")) {
        inferredCategory = "Ecommerce";
      } else if (textToAnalyze.includes("security") || textToAnalyze.includes("auth") || textToAnalyze.includes("privacy")) {
        inferredCategory = "Security";
      }

      return NextResponse.json({
        success: true,
        title: title || fallbackTitle,
        description: description || `Official website for ${domain}`,
        imageUrl: imageUrl || fallbackFavicon,
        favicon: fallbackFavicon,
        domain,
        targetUrl,
        category: inferredCategory,
      });
    } catch (scrapeErr) {
      console.warn(`[metadata] Scrape fallback for ${targetUrl}:`, scrapeErr);
      return NextResponse.json({
        success: true,
        title: fallbackTitle,
        description: `Official website for ${domain}`,
        imageUrl: fallbackFavicon,
        favicon: fallbackFavicon,
        domain,
        targetUrl,
        category: "SaaS",
      });
    }
  } catch (err) {
    console.error("[metadata] Error:", err);
    return NextResponse.json({ error: "Failed to extract metadata" }, { status: 500 });
  }
}

function resolveUrl(href: string, base: string): string {
  try {
    const clean = decodeHtmlEntities(href.trim());
    return new URL(clean, base).href;
  } catch {
    return href;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
