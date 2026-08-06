// Microservicio mínimo, sin lógica de negocio: lo único que hace es firmar
// URLs de S3 para que el navegador suba/descargue archivos de evidencia
// directamente (PostgREST no puede hacer esto — no sabe hablar el protocolo
// de firma de AWS). Toda la lógica de negocio real sigue viviendo en
// Postgres (ver backend/); esto es infraestructura, no una app.
//
// Reutiliza el mismo JWT que emite api.login (backend/db/init/sql/03_auth.sql):
// valida la firma con el mismo secreto y exige que el rol sea app_admin o
// app_profesional antes de firmar cualquier URL.

import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = requireEnv("APP_JWT_SECRET");
const BUCKET = requireEnv("S3_BUCKET");
const REGION = process.env.AWS_REGION || "us-east-1";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const URL_TTL_SECONDS = 300;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return v;
}

const s3 = new S3Client({ region: REGION });
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Falta el token de autenticación" });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (payload.role !== "app_admin" && payload.role !== "app_profesional") {
      return res.status(403).json({ message: "Rol no autorizado" });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

function sanitizeFilename(name) {
  const base = String(name || "archivo").split(/[/\\]/).pop();
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150) || "archivo";
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/presign-upload", authenticate, async (req, res) => {
  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ message: "Falta filename" });

  const key = `evidencias/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: URL_TTL_SECONDS });
  res.json({ uploadUrl, key });
});

app.post("/presign-download", authenticate, async (req, res) => {
  const { key } = req.body || {};
  if (!key || !key.startsWith("evidencias/")) return res.status(400).json({ message: "key inválida" });

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: URL_TTL_SECONDS });
  res.json({ url });
});

app.listen(PORT, () => console.log(`presign-service escuchando en :${PORT}`));
