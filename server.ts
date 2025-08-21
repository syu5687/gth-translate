/* eslint-disable no-console */
import express from "express";

// ----- メモリキャッシュ（最小構成：再起動で消えます） -----
const CACHE = new Map<string, string>();
const key = (t: string, s: string, d: string) => `${s.toUpperCase()}|${d.toUpperCase()}|${t}`;

const app = express();
app.use(express.json({ limit: "1mb" }));

// ヘルスチェック
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// DeepL バッチ翻訳（最小構成）
async function deeplBatch(texts: string[], source: string, target: string) {
  const url = process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";
  const params = new URLSearchParams();
  texts.forEach(t => params.append("text", t));
  params.append("source_lang", source.toUpperCase());
  params.append("target_lang", target.toUpperCase());
  params.append("preserve_formatting", "1");

  const res = await fetch(url, {
	method: "POST",
	headers: {
	  "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
	  "Content-Type": "application/x-www-form-urlencoded",
	},
	body: params
  });

  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const json = await res.json() as { translations: { text: string }[] };
  return json.translations.map(t => t.text);
}

// POST /api/translate  { source:"JA", target:"EN", keys:["テキスト1","テキスト2"] }
app.post("/api/translate", async (req, res) => {
  try {
	const source = String(req.body?.source || "JA");
	const target = String(req.body?.target || "EN");
	const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(String) : [];

	if (!keys.length) return res.json({ translations: {}, cached: true });

	const result: Record<string, string> = {};
	const misses: string[] = [];

	// キャッシュヒット先出し
	for (const k of keys) {
	  const h = key(k, source, target);
	  if (CACHE.has(h)) result[k] = CACHE.get(h)!;
	  else misses.push(k);
	}

	// ミス分だけ DeepL
	if (misses.length) {
	  const translated = await deeplBatch(misses, source, target);
	  translated.forEach((text, i) => {
		const orig = misses[i];
		const h = key(orig, source, target);
		CACHE.set(h, text);
		result[orig] = text;
	  });
	}

	res.json({ translations: result, cached: misses.length === 0 });
  } catch (e: any) {
	console.error(e);
	res.status(500).json({ error: e?.message || "internal-error" });
  }
});

// Cloud Run が渡す $PORT でリッスン
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => console.log(`translate api :${PORT}`));