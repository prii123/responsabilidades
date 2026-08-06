# Frontend — React + Vite + TypeScript

SPA que consume directamente la API de PostgREST (`backend/`). No hay capa de
backend propia: cada página hace `fetch` contra las vistas/RPC del esquema
`api`.

> **AWS Cognito:** todavía no está configurado. El login actual
> (`src/auth/AuthContext.tsx`) llama a `POST /rpc/login` (usuario/contraseña
> guardados en la base de datos) y funciona con el mismo contrato de JWT que
> tendrá Cognito. Cuando el User Pool exista, `AuthContext.tsx` es el único
> archivo que hay que reemplazar (ver el comentario al inicio del archivo).

## Requisitos

- Node.js 20+
- El backend corriendo (`../backend`, ver su README) en `http://localhost:3000`

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:5173`. Usuarios de ejemplo (del seed del backend):

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@responsabilidades.local` | la que definiste en `SEED_ADMIN_PASSWORD` (`.env` del backend) |
| Profesional | `laura.gomez@example.com` | la que definiste en `SEED_PROFESIONAL_PASSWORD` |

## Estructura

```
src/
├── api/
│   ├── client.ts     # fetch wrapper (auth header, manejo de errores de PostgREST)
│   ├── hooks.ts       # useApiGet: carga + loading/error + recargar()
│   └── types.ts       # tipos TS que reflejan las vistas de la API
├── auth/
│   ├── AuthContext.tsx   # login local — reemplazar por Cognito cuando exista
│   └── LoginPage.tsx
├── components/
│   ├── Layout.tsx        # sidebar + navegación por rol
│   ├── EstadoBadge.tsx
│   └── RequireRole.tsx   # oculta rutas de admin al rol profesional
└── pages/
    ├── DashboardPage.tsx
    ├── calendario/
    │   ├── EventosPage.tsx                   # Pasos 9-10: calendario + registrar evidencia
    │   └── EvidenciasPage.tsx                # listado de todas las evidencias registradas
    ├── maestros/                             # Fase A: Municipios, Grupos/Subgrupos,
    │                                          #   Responsabilidades, Profesionales, Clientes,
    │                                          #   Calendarios tributarios, Usuarios (login)
    └── asignaciones/
        ├── ResponsabilidadesClientePage.tsx  # Paso 7
        └── AsignarPage.tsx                    # Paso 8
```

## Build de producción

```bash
npm run build
```

Genera `dist/` — listo para servir como sitio estático (S3+CloudFront, Vercel,
Netlify, Nginx). Antes de desplegar, define `VITE_API_URL` apuntando a la URL
pública real del backend (build-time, no runtime).

**Con Docker:** `Dockerfile` + `docker-compose.yml` en esta carpeta compilan
el build y lo sirven con nginx (incluye fallback de rutas para react-router).
`docker compose up -d --build` con `VITE_API_URL` definido en `.env`. Ver
[`../DEPLOY_AWS.md`](../DEPLOY_AWS.md) para el paso a paso completo en AWS.

## Próximos pasos razonables (no incluidos en este scaffold)

- Reemplazar `useApiGet` por React Query si el manejo de caché/reintentos se
  vuelve una necesidad real.
- Vista de calendario mensual (hoy `EventosPage` es una tabla filtrable).
- Reemplazar el CSS a mano por una librería de componentes (shadcn/ui, MUI) si
  el equipo de diseño lo pide — ver punto abierto en `../PLANEACION.md`.
