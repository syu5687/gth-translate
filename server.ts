import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ── ヘルスチェック
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ── 簡易キャッシュ（プロセス存続中のみ）
const CACHE = new Map();
const mkKey = (source, target, text) => `${source}|${target}|${text}`;

async function deeplBatch(texts, source, target) {
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
	  "Content-Type": "application/x-www-form-urlencoded"
	},
	body: params
  });

  if (!res.ok) {
	const msg = await res.text().catch(() => "");
	throw new Error(`DeepL ${res.status}: ${msg}`);
  }
  const json = await res.json();
  return json.translations.map(t => t.text);
}

// ── 翻訳 API
app.post("/api/translate", async (req, res) => {
  try {
	const source = String(req.body?.source || "JA");
	const target = String(req.body?.target || "EN");
	const keys   = Array.isArray(req.body?.keys) ? req.body.keys.map(String) : [];

	if (!keys.length) return res.json({ translations: {}, cached: true });

	const miss = [];
	const out  = {};

	for (const k of keys) {
	  const hk = mkKey(source, target, k);
	  if (CACHE.has(hk)) out[k] = CACHE.get(hk);
	  else miss.push(k);
	}

	if (miss.length) {
	  const trs = await deeplBatch(miss, source, target);
	  trs.forEach((t, i) => {
		const orig = miss[i];
		const hk = mkKey(source, target, orig);
		CACHE.set(hk, t);
		out[orig] = t;
	  });
	}

	res.json({ translations: out, cached: miss.length === 0 });
  } catch (e) {
	console.error(e);
	res.status(500).json({ error: String(e.message || e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`translate API :${PORT}`));