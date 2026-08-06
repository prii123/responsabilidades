import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiRpc, ApiError } from "../../api/client";
import type { Asignacion, Cliente, Profesional } from "../../api/types";

export default function AsignarPage() {
  const clientes = useApiGet<Cliente[]>("clientes", { order: "nombre" });
  const profesionales = useApiGet<Profesional[]>("profesionales", { order: "nombre" });
  const asignaciones = useApiGet<Asignacion[]>("asignaciones", { order: "fecha_asignacion.desc" });

  function nombreCliente(id: number) {
    return clientes.data?.find((c) => c.id_cliente === id)?.nombre ?? String(id);
  }
  function nombreProfesional(id: number) {
    return profesionales.data?.find((p) => p.id_profesional === id)?.nombre ?? String(id);
  }

  const activas = asignaciones.data?.filter((a) => a.estado === "Activa") ?? [];
  const historial = asignaciones.data?.filter((a) => a.estado === "Inactiva") ?? [];
  const idsClientesAsignados = new Set(activas.map((a) => a.id_cliente));
  const clientesSinAsignar = clientes.data?.filter((c) => !idsClientesAsignados.has(c.id_cliente)) ?? [];

  return (
    <div className="page">
      <h1>Asignaciones</h1>
      <p className="page-subtitle">
        La asignación de un cliente a un profesional es <strong>permanente</strong>: dura hasta que se reasigna
        explícitamente, no se repite cada año. Cada año solo hace falta generar los eventos del calendario sobre la
        asignación que ya existe.
      </p>

      <AsignarSection
        clientesSinAsignar={clientesSinAsignar}
        profesionales={profesionales.data ?? []}
        onGuardado={() => asignaciones.recargar()}
      />

      <GenerarEventosSection activas={activas} clientes={clientes.data ?? []} />

      <section className="card">
        <h2>Clientes asignados</h2>
        {activas.length === 0 && <p className="hint-text">Todavía no hay clientes asignados.</p>}
        {activas.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Profesional</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activas.map((a) => (
                <FilaAsignacion
                  key={a.id_asignacion_cliente}
                  asignacion={a}
                  clienteNombre={nombreCliente(a.id_cliente)}
                  profesionalNombre={nombreProfesional(a.id_profesional)}
                  profesionales={profesionales.data ?? []}
                  onReasignado={() => asignaciones.recargar()}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {historial.length > 0 && (
        <section className="card">
          <h2>Historial de reasignaciones</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Profesional</th>
                <th>Desde</th>
                <th>Hasta</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((a) => (
                <tr key={a.id_asignacion_cliente}>
                  <td>{nombreCliente(a.id_cliente)}</td>
                  <td>{nombreProfesional(a.id_profesional)}</td>
                  <td>{a.fecha_asignacion}</td>
                  <td>{a.fecha_fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function AsignarSection({
  clientesSinAsignar,
  profesionales,
  onGuardado,
}: {
  clientesSinAsignar: Cliente[];
  profesionales: Profesional[];
  onGuardado: () => void;
}) {
  const [idCliente, setIdCliente] = useState("");
  const [idProfesional, setIdProfesional] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function asignar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setGuardando(true);
    try {
      await apiRpc("asignar_cliente_profesional", {
        cliente: Number(idCliente),
        profesional: Number(idProfesional),
        anio: Number(anio),
      });
      setOk("Cliente asignado. Los eventos del calendario para ese año se generaron automáticamente.");
      setIdCliente("");
      setIdProfesional("");
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card">
      <h2>Asignar cliente nuevo</h2>
      <p className="page-subtitle">
        Solo para clientes sin profesional todavía (Regla 1: el cliente debe tener al menos una responsabilidad
        activa). Genera de una vez los eventos del año indicado.
      </p>
      <form className="grid-form" onSubmit={asignar}>
        <label>
          Cliente
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} required>
            <option value="">Seleccione…</option>
            {clientesSinAsignar.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profesional
          <select value={idProfesional} onChange={(e) => setIdProfesional(e.target.value)} required>
            <option value="">Seleccione…</option>
            {profesionales.map((p) => (
              <option key={p.id_profesional} value={p.id_profesional}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Año para generar eventos
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} required />
        </label>
        <div className="span-2">
          <button type="submit" disabled={guardando}>
            {guardando ? "Asignando…" : "Asignar y generar eventos"}
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}
    </section>
  );
}

function GenerarEventosSection({ activas, clientes }: { activas: Asignacion[]; clientes: Cliente[] }) {
  const [idCliente, setIdCliente] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function generar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setGuardando(true);
    try {
      const asignacion = activas.find((a) => a.id_cliente === Number(idCliente));
      if (!asignacion) throw new Error("Ese cliente no tiene un profesional asignado");
      const creados = await apiRpc<number>("generar_eventos", {
        asignacion: asignacion.id_asignacion_cliente,
        anio: Number(anio),
      });
      setOk(creados > 0 ? `Se generaron ${creados} eventos nuevos para ${anio}.` : `No había eventos nuevos por generar para ${anio}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "No se pudieron generar los eventos");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card">
      <h2>Generar eventos de un año</h2>
      <p className="page-subtitle">
        Para clientes que ya tienen profesional: al empezar un año nuevo (o al marcar nuevas responsabilidades),
        genera los eventos de ese año sobre la asignación existente, sin reasignar a nadie.
      </p>
      <form className="inline-form" onSubmit={generar}>
        <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} required>
          <option value="">Cliente…</option>
          {activas.map((a) => (
            <option key={a.id_cliente} value={a.id_cliente}>
              {clientes.find((c) => c.id_cliente === a.id_cliente)?.nombre ?? a.id_cliente}
            </option>
          ))}
        </select>
        <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 100 }} required />
        <button type="submit" disabled={guardando}>
          {guardando ? "Generando…" : "Generar eventos"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}
    </section>
  );
}

function FilaAsignacion({
  asignacion,
  clienteNombre,
  profesionalNombre,
  profesionales,
  onReasignado,
}: {
  asignacion: Asignacion;
  clienteNombre: string;
  profesionalNombre: string;
  profesionales: Profesional[];
  onReasignado: () => void;
}) {
  const [reasignando, setReasignando] = useState(false);
  const [nuevoProfesional, setNuevoProfesional] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiRpc("reasignar_profesional", {
        cliente: asignacion.id_cliente,
        nuevo_profesional: Number(nuevoProfesional),
      });
      setReasignando(false);
      setNuevoProfesional("");
      onReasignado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reasignar");
    } finally {
      setGuardando(false);
    }
  }

  if (!reasignando) {
    return (
      <tr>
        <td>{clienteNombre}</td>
        <td>{profesionalNombre}</td>
        <td>{asignacion.fecha_asignacion}</td>
        <td>
          <button className="btn-secondary" onClick={() => setReasignando(true)}>
            Reasignar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{clienteNombre}</td>
      <td colSpan={3}>
        <form className="inline-form" style={{ marginBottom: 0 }} onSubmit={confirmar}>
          <select value={nuevoProfesional} onChange={(e) => setNuevoProfesional(e.target.value)} required autoFocus>
            <option value="">Nuevo profesional…</option>
            {profesionales
              .filter((p) => p.id_profesional !== asignacion.id_profesional)
              .map((p) => (
                <option key={p.id_profesional} value={p.id_profesional}>
                  {p.nombre}
                </option>
              ))}
          </select>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Confirmar"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setReasignando(false)}>
            Cancelar
          </button>
          {error && <span className="form-error">{error}</span>}
        </form>
      </td>
    </tr>
  );
}
