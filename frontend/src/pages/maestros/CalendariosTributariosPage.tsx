import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import type { Ambito, CalendarioFecha, CalendarioTributario, Municipio, Responsabilidad } from "../../api/types";

const initialCalendario = { nombre: "", anio: String(new Date().getFullYear()), ambito: "Nacional" as Ambito, cod_municipio: "", digitos_nit: "1" as "1" | "2" };
const initialFecha = { id_calendario: "", periodo: "", nit_desde: "0", nit_hasta: "9", fecha_limite: "" };
const initialAsociacion = { id_responsabilidad: "", anio: String(new Date().getFullYear()), id_calendario: "" };

export default function CalendariosTributariosPage() {
  const calendarios = useApiGet<CalendarioTributario[]>("calendarios_tributarios", { order: "anio.desc,nombre" });
  const fechas = useApiGet<CalendarioFecha[]>("calendario_fechas", { order: "id_calendario,fecha_limite" });
  const municipios = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const responsabilidades = useApiGet<Responsabilidad[]>("responsabilidades", { order: "nombre" });

  const [formCal, setFormCal] = useState(initialCalendario);
  const [formFecha, setFormFecha] = useState(initialFecha);
  const [formAsoc, setFormAsoc] = useState(initialAsociacion);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function crearCalendario(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("calendarios_tributarios", {
        nombre: formCal.nombre,
        anio: Number(formCal.anio),
        ambito: formCal.ambito,
        cod_municipio: formCal.ambito === "Municipal" ? formCal.cod_municipio || null : null,
        digitos_nit: Number(formCal.digitos_nit),
      });
      setFormCal(initialCalendario);
      calendarios.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el calendario");
    }
  }

  async function crearFecha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("calendario_fechas", {
        id_calendario: Number(formFecha.id_calendario),
        periodo: formFecha.periodo,
        nit_desde: Number(formFecha.nit_desde),
        nit_hasta: Number(formFecha.nit_hasta),
        fecha_limite: formFecha.fecha_limite,
      });
      setFormFecha({ ...initialFecha, id_calendario: formFecha.id_calendario });
      fechas.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar la fecha");
    }
  }

  async function asociar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      await apiPost("responsabilidad_calendario", {
        id_responsabilidad: Number(formAsoc.id_responsabilidad),
        anio: Number(formAsoc.anio),
        id_calendario: Number(formAsoc.id_calendario),
      });
      setOk("Calendario asociado correctamente.");
      setFormAsoc(initialAsociacion);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asociar el calendario");
    }
  }

  function nombreCalendario(id: number) {
    return calendarios.data?.find((c) => c.id_calendario === id)?.nombre ?? id;
  }

  return (
    <div className="page">
      <h1>Calendarios tributarios</h1>
      <p className="page-subtitle">
        Cada responsabilidad de tipo "Calendario por NIT" necesita un calendario aquí para el año en que se van a generar
        eventos. La fecha límite de cada periodo depende del último dígito (o los dos últimos) del NIT del cliente.
      </p>

      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}

      <section className="card">
        <h2>1. Crear calendario</h2>
        <form className="grid-form" onSubmit={crearCalendario}>
          <label className="span-2">
            Nombre
            <input placeholder='Ej. "DIAN - IVA Bimestral 2027"' value={formCal.nombre} onChange={(e) => setFormCal({ ...formCal, nombre: e.target.value })} required />
          </label>
          <label>
            Año
            <input type="number" value={formCal.anio} onChange={(e) => setFormCal({ ...formCal, anio: e.target.value })} required />
          </label>
          <label>
            Ámbito
            <select value={formCal.ambito} onChange={(e) => setFormCal({ ...formCal, ambito: e.target.value as typeof formCal.ambito })}>
              <option value="Nacional">Nacional</option>
              <option value="Departamental">Departamental</option>
              <option value="Municipal">Municipal</option>
            </select>
          </label>
          {formCal.ambito === "Municipal" && (
            <label>
              Municipio
              <select value={formCal.cod_municipio} onChange={(e) => setFormCal({ ...formCal, cod_municipio: e.target.value })} required>
                <option value="">Seleccione…</option>
                {municipios.data?.map((m) => (
                  <option key={m.cod_municipio} value={m.cod_municipio}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Dígitos del NIT que usa
            <select value={formCal.digitos_nit} onChange={(e) => setFormCal({ ...formCal, digitos_nit: e.target.value as "1" | "2" })}>
              <option value="1">Último dígito (0-9)</option>
              <option value="2">Dos últimos dígitos (00-99)</option>
            </select>
          </label>
          <div className="span-2">
            <button type="submit">Crear calendario</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>2. Cargar fechas por periodo y terminación de NIT</h2>
        <form className="grid-form" onSubmit={crearFecha}>
          <label className="span-2">
            Calendario
            <select value={formFecha.id_calendario} onChange={(e) => setFormFecha({ ...formFecha, id_calendario: e.target.value })} required>
              <option value="">Seleccione…</option>
              {calendarios.data?.map((c) => (
                <option key={c.id_calendario} value={c.id_calendario}>
                  {c.nombre} ({c.anio})
                </option>
              ))}
            </select>
          </label>
          <label>
            Periodo
            <input placeholder='Ej. "Bimestre 1 (Ene-Feb)"' value={formFecha.periodo} onChange={(e) => setFormFecha({ ...formFecha, periodo: e.target.value })} required />
          </label>
          <label>
            NIT desde
            <input type="number" min={0} max={99} value={formFecha.nit_desde} onChange={(e) => setFormFecha({ ...formFecha, nit_desde: e.target.value })} required />
          </label>
          <label>
            NIT hasta
            <input type="number" min={0} max={99} value={formFecha.nit_hasta} onChange={(e) => setFormFecha({ ...formFecha, nit_hasta: e.target.value })} required />
          </label>
          <label>
            Fecha límite
            <input type="date" value={formFecha.fecha_limite} onChange={(e) => setFormFecha({ ...formFecha, fecha_limite: e.target.value })} required />
          </label>
          <div className="span-2">
            <button type="submit">Agregar fecha</button>
          </div>
        </form>

        {fechas.data && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Calendario</th>
                <th>Periodo</th>
                <th>NIT</th>
                <th>Fecha límite</th>
              </tr>
            </thead>
            <tbody>
              {fechas.data.map((f) => (
                <tr key={f.id_calendario_fecha}>
                  <td>{nombreCalendario(f.id_calendario)}</td>
                  <td>{f.periodo}</td>
                  <td>
                    {f.nit_desde}–{f.nit_hasta}
                  </td>
                  <td>{f.fecha_limite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>3. Asociar calendario a una responsabilidad (por año)</h2>
        <form className="grid-form" onSubmit={asociar}>
          <label>
            Responsabilidad
            <select value={formAsoc.id_responsabilidad} onChange={(e) => setFormAsoc({ ...formAsoc, id_responsabilidad: e.target.value })} required>
              <option value="">Seleccione…</option>
              {responsabilidades.data?.map((r) => (
                <option key={r.id_responsabilidad} value={r.id_responsabilidad}>
                  {r.nombre} ({r.codigo_unico})
                </option>
              ))}
            </select>
          </label>
          <label>
            Año
            <input type="number" value={formAsoc.anio} onChange={(e) => setFormAsoc({ ...formAsoc, anio: e.target.value })} required />
          </label>
          <label>
            Calendario
            <select value={formAsoc.id_calendario} onChange={(e) => setFormAsoc({ ...formAsoc, id_calendario: e.target.value })} required>
              <option value="">Seleccione…</option>
              {calendarios.data?.map((c) => (
                <option key={c.id_calendario} value={c.id_calendario}>
                  {c.nombre} ({c.anio})
                </option>
              ))}
            </select>
          </label>
          <div className="span-2">
            <button type="submit">Asociar</button>
          </div>
        </form>
      </section>
    </div>
  );
}
