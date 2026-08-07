import { useState, type FormEvent } from "react";
import { useApiGet, usePaginatedApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import type {
  Ambito,
  CalendarioFecha,
  CalendarioTributario,
  Municipio,
  Responsabilidad,
  ResponsabilidadCalendario,
} from "../../api/types";

const PAGE_SIZE = 20;

export default function CalendariosTributariosPage() {
  // Sin paginar: además de listarse aquí, alimenta los <select> de los
  // modales de esta página, que necesitan ver todos los calendarios.
  const calendarios = useApiGet<CalendarioTributario[]>("calendarios_tributarios", { order: "anio.desc,nombre" });
  const municipios = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const responsabilidades = useApiGet<Responsabilidad[]>("responsabilidades", { order: "nombre" });
  const asociaciones = usePaginatedApiGet<ResponsabilidadCalendario>(
    "responsabilidad_calendario",
    { order: "anio.desc" },
    PAGE_SIZE
  );

  const [modalCalendario, setModalCalendario] = useState(false);
  const [modalAsociar, setModalAsociar] = useState(false);
  const [idCalendarioSeleccionado, setIdCalendarioSeleccionado] = useState<number | null>(null);

  function nombreResponsabilidad(id: number) {
    return responsabilidades.data?.find((r) => r.id_responsabilidad === id)?.nombre ?? String(id);
  }
  function nombreCalendario(id: number) {
    return calendarios.data?.find((c) => c.id_calendario === id)?.nombre ?? String(id);
  }

  const calendarioSeleccionado = calendarios.data?.find((c) => c.id_calendario === idCalendarioSeleccionado) ?? null;

  return (
    <div className="page">
      <h1>Calendarios tributarios</h1>
      <p className="page-subtitle">
        Cada responsabilidad de tipo "Calendario por NIT" necesita un calendario aquí para el año en que se van a
        generar eventos. La fecha límite de cada periodo depende del último dígito (o los dos últimos) del NIT del
        cliente.
      </p>

      <section className="card">
        <div className="section-header">
          <h2>Calendarios</h2>
          <button onClick={() => setModalCalendario(true)}>+ Nuevo calendario</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Año</th>
                <th>Ámbito</th>
                <th>Dígitos NIT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {calendarios.data?.map((c) => (
                <tr key={c.id_calendario}>
                  <td>{c.nombre}</td>
                  <td>{c.anio}</td>
                  <td>{c.ambito}</td>
                  <td>{c.digitos_nit}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => setIdCalendarioSeleccionado(c.id_calendario)}>
                      Ver fechas
                    </button>
                  </td>
                </tr>
              ))}
              {calendarios.data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    Todavía no hay calendarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Responsabilidades asociadas</h2>
          <button onClick={() => setModalAsociar(true)} disabled={!calendarios.data?.length}>
            + Asociar responsabilidad
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Responsabilidad</th>
                <th>Año</th>
                <th>Calendario</th>
              </tr>
            </thead>
            <tbody>
              {asociaciones.data?.map((a) => (
                <tr key={`${a.id_responsabilidad}-${a.anio}`}>
                  <td>{nombreResponsabilidad(a.id_responsabilidad)}</td>
                  <td>{a.anio}</td>
                  <td>{nombreCalendario(a.id_calendario)}</td>
                </tr>
              ))}
              {asociaciones.data?.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-cell">
                    Ninguna responsabilidad tiene calendario asociado todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={asociaciones.page}
          pageCount={asociaciones.pageCount}
          total={asociaciones.total}
          pageSize={asociaciones.pageSize}
          onChange={asociaciones.setPage}
        />
      </section>

      {modalCalendario && (
        <NuevoCalendarioModal
          municipios={municipios.data ?? []}
          onClose={() => setModalCalendario(false)}
          onCreado={() => {
            setModalCalendario(false);
            calendarios.recargar();
          }}
        />
      )}

      {modalAsociar && (
        <AsociarModal
          responsabilidades={responsabilidades.data ?? []}
          calendarios={calendarios.data ?? []}
          onClose={() => setModalAsociar(false)}
          onCreado={() => {
            setModalAsociar(false);
            asociaciones.recargar();
          }}
        />
      )}

      {calendarioSeleccionado && (
        <FechasCalendarioModal calendario={calendarioSeleccionado} onClose={() => setIdCalendarioSeleccionado(null)} />
      )}
    </div>
  );
}

const initialCalendario = {
  nombre: "",
  anio: String(new Date().getFullYear()),
  ambito: "Nacional" as Ambito,
  cod_municipio: "",
  digitos_nit: "1" as "1" | "2",
};

function NuevoCalendarioModal({
  municipios,
  onClose,
  onCreado,
}: {
  municipios: Municipio[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [form, setForm] = useState(initialCalendario);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("calendarios_tributarios", {
        nombre: form.nombre,
        anio: Number(form.anio),
        ambito: form.ambito,
        cod_municipio: form.ambito === "Municipal" ? form.cod_municipio || null : null,
        digitos_nit: Number(form.digitos_nit),
      });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el calendario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo calendario" onClose={onClose} wide>
      <form className="grid-form" onSubmit={crear} style={{ marginBottom: 0 }}>
        <label className="span-2">
          Nombre
          <input
            placeholder='Ej. "DIAN - IVA Bimestral 2027"'
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            autoFocus
          />
        </label>
        <label>
          Año
          <input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} required />
        </label>
        <label>
          Ámbito
          <select value={form.ambito} onChange={(e) => setForm({ ...form, ambito: e.target.value as Ambito })}>
            <option value="Nacional">Nacional</option>
            <option value="Departamental">Departamental</option>
            <option value="Municipal">Municipal</option>
          </select>
        </label>
        {form.ambito === "Municipal" && (
          <label>
            Municipio
            <select value={form.cod_municipio} onChange={(e) => setForm({ ...form, cod_municipio: e.target.value })} required>
              <option value="">Seleccione…</option>
              {municipios.map((m) => (
                <option key={m.cod_municipio} value={m.cod_municipio}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Dígitos del NIT que usa
          <select value={form.digitos_nit} onChange={(e) => setForm({ ...form, digitos_nit: e.target.value as "1" | "2" })}>
            <option value="1">Último dígito (0-9)</option>
            <option value="2">Dos últimos dígitos (00-99)</option>
          </select>
        </label>

        {error && (
          <p className="form-error span-2">
            {error}
          </p>
        )}

        <div className="modal-actions span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear calendario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const initialFecha = { periodo: "", nit_desde: "0", nit_hasta: "9", fecha_limite: "" };

const FECHAS_PAGE_SIZE = 15;

function FechasCalendarioModal({ calendario, onClose }: { calendario: CalendarioTributario; onClose: () => void }) {
  const fechas = usePaginatedApiGet<CalendarioFecha>(
    "calendario_fechas",
    { id_calendario: `eq.${calendario.id_calendario}`, order: "fecha_limite" },
    FECHAS_PAGE_SIZE,
    [calendario.id_calendario]
  );
  const [form, setForm] = useState(initialFecha);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("calendario_fechas", {
        id_calendario: calendario.id_calendario,
        periodo: form.periodo,
        nit_desde: Number(form.nit_desde),
        nit_hasta: Number(form.nit_hasta),
        fecha_limite: form.fecha_limite,
      });
      setForm(initialFecha);
      fechas.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar la fecha");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title={`Fechas — ${calendario.nombre} (${calendario.anio})`} onClose={onClose} wide>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>NIT</th>
              <th>Fecha límite</th>
            </tr>
          </thead>
          <tbody>
            {fechas.data?.map((f) => (
              <tr key={f.id_calendario_fecha}>
                <td>{f.periodo}</td>
                <td>
                  {f.nit_desde}–{f.nit_hasta}
                </td>
                <td>{f.fecha_limite}</td>
              </tr>
            ))}
            {fechas.data?.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-cell">
                  Todavía no hay fechas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={fechas.page} pageCount={fechas.pageCount} total={fechas.total} pageSize={fechas.pageSize} onChange={fechas.setPage} />

      <form className="grid-form" onSubmit={agregar} style={{ marginTop: "1rem", marginBottom: 0 }}>
        <label className="span-2">
          Periodo
          <input
            placeholder='Ej. "Bimestre 1 (Ene-Feb)"'
            value={form.periodo}
            onChange={(e) => setForm({ ...form, periodo: e.target.value })}
            required
            autoFocus
          />
        </label>
        <label>
          NIT desde
          <input type="number" min={0} max={99} value={form.nit_desde} onChange={(e) => setForm({ ...form, nit_desde: e.target.value })} required />
        </label>
        <label>
          NIT hasta
          <input type="number" min={0} max={99} value={form.nit_hasta} onChange={(e) => setForm({ ...form, nit_hasta: e.target.value })} required />
        </label>
        <label className="span-2">
          Fecha límite
          <input type="date" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} required />
        </label>

        {error && (
          <p className="form-error span-2">
            {error}
          </p>
        )}

        <div className="span-2">
          <button type="submit" disabled={guardando}>
            {guardando ? "Agregando…" : "Agregar fecha"}
          </button>
        </div>
      </form>

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

const initialAsociacion = { id_responsabilidad: "", anio: String(new Date().getFullYear()), id_calendario: "" };

function AsociarModal({
  responsabilidades,
  calendarios,
  onClose,
  onCreado,
}: {
  responsabilidades: Responsabilidad[];
  calendarios: CalendarioTributario[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [form, setForm] = useState(initialAsociacion);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function asociar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("responsabilidad_calendario", {
        id_responsabilidad: Number(form.id_responsabilidad),
        anio: Number(form.anio),
        id_calendario: Number(form.id_calendario),
      });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asociar el calendario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Asociar calendario a una responsabilidad" onClose={onClose}>
      <form onSubmit={asociar} className="flex flex-col gap-4">
        <label>
          Responsabilidad
          <select value={form.id_responsabilidad} onChange={(e) => setForm({ ...form, id_responsabilidad: e.target.value })} required autoFocus>
            <option value="">Seleccione…</option>
            {responsabilidades.map((r) => (
              <option key={r.id_responsabilidad} value={r.id_responsabilidad}>
                {r.nombre} ({r.codigo_unico})
              </option>
            ))}
          </select>
        </label>
        <label>
          Año
          <input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} required />
        </label>
        <label>
          Calendario
          <select value={form.id_calendario} onChange={(e) => setForm({ ...form, id_calendario: e.target.value })} required>
            <option value="">Seleccione…</option>
            {calendarios.map((c) => (
              <option key={c.id_calendario} value={c.id_calendario}>
                {c.nombre} ({c.anio})
              </option>
            ))}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Asociar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
