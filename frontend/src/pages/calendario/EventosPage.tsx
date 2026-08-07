import { useMemo, useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiRpc, ApiError } from "../../api/client";
import { subirArchivoEvidencia } from "../../api/files";
import type { EstadoEvento, VEvento } from "../../api/types";
import EstadoBadge from "../../components/EstadoBadge";
import CalendarioMes, { formatoFecha } from "../../components/CalendarioMes";
import { useAuth } from "../../auth/AuthContext";

const ESTADOS: EstadoEvento[] = ["Pendiente", "Vencido", "Realizado", "Realizado vencido", "Cancelado"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function EventosPage() {
  const { sesion } = useAuth();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [estado, setEstado] = useState<string>("");
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<VEvento | null>(null);

  const inicioMes = formatoFecha(new Date(anio, mes, 1));
  const finMes = formatoFecha(new Date(anio, mes + 1, 0));

  const query: Record<string, string> = {
    order: "fecha_limite",
    and: `(fecha_limite.gte.${inicioMes},fecha_limite.lte.${finMes})`,
  };
  if (estado) query.estado_evento = `eq.${estado}`;

  const eventos = useApiGet<VEvento[]>("v_eventos", query, [anio, mes, estado]);

  function mesAnterior() {
    setDiaSeleccionado(null);
    if (mes === 0) {
      setMes(11);
      setAnio((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSiguiente() {
    setDiaSeleccionado(null);
    if (mes === 11) {
      setMes(0);
      setAnio((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  function irAHoy() {
    setDiaSeleccionado(null);
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth());
  }

  const eventosMostrados = useMemo(() => {
    if (!eventos.data) return [];
    if (!diaSeleccionado) return eventos.data;
    return eventos.data.filter((ev) => ev.fecha_limite === diaSeleccionado);
  }, [eventos.data, diaSeleccionado]);

  return (
    <div className="page">
      <h1>{sesion?.rol === "app_admin" ? "Calendario de eventos" : "Mi calendario"}</h1>
      <p className="page-subtitle">
        Un evento solo puede pasar a Realizado registrando evidencia (Regla 5). Realizado y Cancelado son estados finales
        (Regla 6).
      </p>

      <div className="inline-form">
        <button type="button" className="btn-secondary" onClick={mesAnterior}>
          ← Mes anterior
        </button>
        <strong style={{ minWidth: 170, textAlign: "center" }}>
          {MESES[mes]} {anio}
        </strong>
        <button type="button" className="btn-secondary" onClick={mesSiguiente}>
          Mes siguiente →
        </button>
        <button type="button" className="btn-secondary" onClick={irAHoy}>
          Hoy
        </button>
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((es) => (
              <option key={es} value={es}>
                {es}
              </option>
            ))}
          </select>
        </label>
      </div>

      {eventos.loading && <p>Cargando…</p>}
      {eventos.error && <p className="form-error">{eventos.error}</p>}

      {eventos.data && (
        <CalendarioMes
          anio={anio}
          mes={mes}
          eventos={eventos.data}
          diaSeleccionado={diaSeleccionado}
          onDiaClick={(fecha) => setDiaSeleccionado((actual) => (actual === fecha ? null : fecha))}
        />
      )}

      <section className="card">
        <div className="section-header">
          <h2>
            Eventos de {MESES[mes]}
            {diaSeleccionado ? ` — ${diaSeleccionado}` : ""}
          </h2>
          {diaSeleccionado && (
            <button className="btn-secondary" onClick={() => setDiaSeleccionado(null)}>
              Ver todo el mes
            </button>
          )}
        </div>

        {eventos.data && (
          <div className="scroll-list">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Obligación</th>
                  <th>Periodo</th>
                  <th>Fecha límite</th>
                  <th>Profesional</th>
                  <th>Sanción</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eventosMostrados.map((ev) => (
                  <tr key={ev.id_evento}>
                    <td>{ev.cliente_nombre}</td>
                    <td>{ev.responsabilidad_nombre}</td>
                    <td>{ev.periodo}</td>
                    <td>{ev.fecha_limite}</td>
                    <td>{ev.profesional_nombre}</td>
                    <td>{ev.sancion ? "⚠" : ""}</td>
                    <td>
                      <EstadoBadge estado={ev.estado_evento} />
                    </td>
                    <td>
                      {(ev.estado_evento === "Pendiente" || ev.estado_evento === "Vencido") && (
                        <button className="btn-secondary" onClick={() => setSeleccionado(ev)}>
                          Registrar evidencia
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {eventosMostrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No hay eventos con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {seleccionado && (
        <EvidenciaModal
          evento={seleccionado}
          onClose={() => setSeleccionado(null)}
          onGuardado={() => {
            setSeleccionado(null);
            eventos.recargar();
          }}
        />
      )}
    </div>
  );
}

function EvidenciaModal({ evento, onClose, onGuardado }: { evento: VEvento; onClose: () => void; onGuardado: () => void }) {
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [horas, setHoras] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"idle" | "subiendo" | "guardando">("idle");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let archivoKey: string | null = null;
      if (archivo) {
        setEstado("subiendo");
        archivoKey = await subirArchivoEvidencia(archivo);
      }

      setEstado("guardando");
      await apiRpc("registrar_evidencia", {
        evento: evento.id_evento,
        observaciones,
        archivo: archivoKey,
        horas: horas ? Number(horas) : null,
      });
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "No se pudo registrar la evidencia");
    } finally {
      setEstado("idle");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h2>Registrar evidencia</h2>
        <p className="page-subtitle">
          {evento.cliente_nombre} — {evento.responsabilidad_nombre} — {evento.periodo} (vence {evento.fecha_limite})
        </p>

        <label>
          Observaciones
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} required />
        </label>
        <label>
          Archivo
          <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Horas dedicadas
          <input type="number" step="0.5" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={estado !== "idle"}>
            {estado === "subiendo" ? "Subiendo archivo…" : estado === "guardando" ? "Guardando…" : "Guardar y marcar Realizado"}
          </button>
        </div>
      </form>
    </div>
  );
}
