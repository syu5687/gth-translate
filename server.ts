import express from "express";

const app = express();

// ヘルスチェック用エンドポイント
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

// 確認用のルート
app.get("/", (_req, res) => {
  res.send("DeepL Translate API is running 🚀");
});

// Cloud Run が自動で $PORT を渡してくる
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});