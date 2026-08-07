// Microservicio auxiliar, sin lógica de negocio de dominio: firma URLs de S3
// para evidencias (PostgREST no sabe hablar el protocolo de firma de AWS) y
// administra usuarios en el User Pool de Cognito (PostgREST tampoco puede
// llamar la API de administración de Cognito). Toda la lógica de negocio
// real sigue viviendo en Postgres (ver backend/); esto es infraestructura.
//
// Autenticación de las rutas: valida el ID token de Cognito (el mismo que
// usa el frontend contra PostgREST) contra el JWKS del User Pool.

import crypto from "node:crypto";
import express from "express";
import pg from "pg";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const PORT = process.env.PORT || 3001;
const BUCKET = requireEnv("S3_BUCKET");
const REGION = process.env.AWS_REGION || "us-east-1";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const URL_TTL_SECONDS = 300;

const COGNITO_USER_POOL_ID = requireEnv("COGNITO_USER_POOL_ID");
const COGNITO_CLIENT_ID = requireEnv("COGNITO_CLIENT_ID");
const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const ROLES_VALIDOS = ["app_admin", "app_profesional"];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return v;
}

// Credenciales de S3 (usuario IAM responsabilidades-s3-presign, scope: solo
// el bucket de evidencias) y de Cognito (usuario IAM
// responsabilidades-cognito-admin, scope: solo Admin* sobre este User Pool)
// son DISTINTAS a propósito — cada cliente usa las suyas explícitamente, no
// la cadena de credenciales por defecto del proceso.
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  },
});

const cognito = new CognitoIdentityProviderClient({
  region: COGNITO_REGION,
  credentials: {
    accessKeyId: requireEnv("COGNITO_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("COGNITO_SECRET_ACCESS_KEY"),
  },
});

// Rol app_user_sync: conexión directa a Postgres (no vía PostgREST), igual
// que el contenedor "scheduler" con app_maintenance. Ver backend/db/init/sql/03_auth.sql.
const db = new pg.Pool({
  host: requireEnv("DB_HOST"),
  port: Number(process.env.DB_PORT || 5432),
  database: requireEnv("DB_NAME"),
  user: "app_user_sync",
  password: requireEnv("USER_SYNC_PASSWORD"),
});

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: COGNITO_CLIENT_ID,
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Falta el token de autenticación" });
  try {
    const payload = await verifier.verify(token);
    const rol = payload["cognito:groups"]?.[0];
    if (rol !== "app_admin" && rol !== "app_profesional") {
      return res.status(403).json({ message: "Rol no autorizado" });
    }
    req.auth = { ...payload, rol };
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth.rol !== "app_admin") return res.status(403).json({ message: "Requiere rol app_admin" });
  next();
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

// ---------- Administración de usuarios (Cognito) ----------
// PostgREST solo puede leer app.usuarios (api.usuarios): crear/activar/
// desactivar pasa por aquí porque requiere la API de administración de
// Cognito, a la que PostgREST no tiene forma de llamar.

app.post("/usuarios", authenticate, requireAdmin, async (req, res) => {
  const { email, password, rol, id_profesional } = req.body || {};
  if (!email || !password || !rol) return res.status(400).json({ message: "Faltan email, password o rol" });
  if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ message: "Rol inválido" });
  if (rol === "app_profesional" && !id_profesional) {
    return res.status(400).json({ message: "id_profesional es obligatorio para un profesional" });
  }

  try {
    const attrs = [
      { Name: "email", Value: email },
      { Name: "email_verified", Value: "true" },
    ];
    if (id_profesional) attrs.push({ Name: "custom:id_profesional", Value: String(id_profesional) });

    const created = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: attrs,
      MessageAction: "SUPPRESS",
    }));
    const sub = created.User.Attributes.find((a) => a.Name === "sub").Value;

    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID, Username: email, Password: password, Permanent: true,
    }));
    await cognito.send(new AdminAddUserToGroupCommand({
      UserPoolId: COGNITO_USER_POOL_ID, Username: email, GroupName: rol,
    }));

    const { rows } = await db.query(
      "SELECT * FROM app.f_sync_usuario_cognito($1, $2, $3, $4)",
      [sub, email, rol, id_profesional || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(mapCognitoError(err)).json({ message: describeCognitoError(err) });
  }
});

app.patch("/usuarios/:sub", authenticate, requireAdmin, async (req, res) => {
  const { sub } = req.params;
  const { activo, email } = req.body || {};
  if (typeof activo !== "boolean") return res.status(400).json({ message: "Falta activo (boolean)" });
  if (!email) return res.status(400).json({ message: "Falta email" });

  try {
    await cognito.send(
      activo
        ? new AdminEnableUserCommand({ UserPoolId: COGNITO_USER_POOL_ID, Username: email })
        : new AdminDisableUserCommand({ UserPoolId: COGNITO_USER_POOL_ID, Username: email })
    );
    await db.query("SELECT app.f_set_usuario_activo($1, $2)", [sub, activo]);
    res.json({ ok: true });
  } catch (err) {
    res.status(mapCognitoError(err)).json({ message: describeCognitoError(err) });
  }
});

function mapCognitoError(err) {
  if (err.name === "UsernameExistsException") return 409;
  if (err.name === "InvalidPasswordException" || err.name === "InvalidParameterException") return 400;
  return 502;
}

function describeCognitoError(err) {
  if (err.name === "UsernameExistsException") return "Ya existe un usuario con ese correo";
  if (err.name === "InvalidPasswordException") return "La contraseña no cumple la política de Cognito (mínimo 8, mayúscula, minúscula y número)";
  return err.message || "No se pudo completar la operación en Cognito";
}

app.listen(PORT, () => console.log(`presign-service escuchando en :${PORT}`));
