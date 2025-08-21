// gth-translate/server.js
import express from "express";

const app = express();
app.use(express.json());

// CORS（必要なら ON）
/*
import cors from "cors";
app.use(cors());
*/

const PORT = process.env.PORT || 8080;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL =
  process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";

if (!DEEPL_API_KEY) {
  console.warn("[WARN] DEEPL_API_KEY not set");
}

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// バッチ翻訳
app.post("/api/translate", async (req, res) => {
  try {
	const { source = "JA", target = "EN", keys = [] } = req.body || {};
	if (!Array.isArray(keys) || keys.length === 0) {
	  return res.json({ translations: {}, cached: true });
	}

	const body = new URLSearchParams();
	for (const t of keys) body.append("text", String(t));
	body.append("source_lang", String(source).toUpperCase());
	body.append("target_lang", String(target).toUpperCase());
	body.append("preserve_formatting", "1");

	const r = await fetch(DEEPL_API_URL, {
	  method: "POST",
	  headers: {
		Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
		"Content-Type": "application/x-www-form-urlencoded",
	  },
	  body,
	});

	if (!r.ok) {
	  const msg = await r.text().catch(() => "");
	  return res.status(r.status).json({ error: msg || "deepl error" });
	}

	const json = await r.json(); // { translations: [{text: "..."}] }
	const translated = json.translations?.map((t) => t.text) || [];

	// 入力(keys)と同じキーで返す
	const result = {};
	keys.forEach((k, i) => (result[k] = translated[i] ?? ""));

	res.json({ translations: result, cached: false });
  } catch (e) {
	console.error(e);
	res.status(500).json({ error: "internal-error" });
  }
});

app.listen(PORT, () => {
  console.log(`translate api listening on :${PORT}`);
});