import { useState, type FormEvent } from "react";
import { useApiGet, usePaginatedApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import type { Municipio, Responsabilidad, SubgrupoResponsabilidad, Tipo, ModoVencimiento } from "../../api/types";

const initialForm = {
  auto_numero: "",
  codigo_dian: "",
  codigo_formulario: "",
  nombre: "",
  id_subgrupo: "",
  cod_municipio: "",
  tipo: "Obligatoria" as Tipo,
  sancion: false,
  modo_vencimiento: "CALENDARIO_NIT" as ModoVencimiento,
};
const PAGE_SIZE = 20;

export default function ResponsabilidadesPage() {
  const responsabilidades = usePaginatedApiGet<Responsabilidad>("responsabilidades", { order: "nombre" }, PAGE_SIZE);
  const subgrupos = useApiGet<SubgrupoResponsabilidad[]>("subgrupos_responsabilidad", { order: "nombre" });
  const municipios = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Responsabilidades</h1>
          <p className="page-subtitle">
            Catálogo de obligaciones. El código único (AutoNúmero-DIAN-Municipio-Formulario) lo calcula la base de
            datos.
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)}>+ Nueva responsabilidad</button>
      </div>

      {responsabilidades.data && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código único</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Sanción</th>
                <th>Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {responsabilidades.data.map((r) => (
                <tr key={r.id_responsabilidad}>
                  <td>
                    <code>{r.codigo_unico}</code>
                  </td>
                  <td>{r.nombre}</td>
                  <td>{r.tipo}</td>
                  <td>{r.sancion ? "⚠ Sí" : "No"}</td>
                  <td>{r.modo_vencimiento === "CALENDARIO_NIT" ? "Calendario por NIT" : "Fecha fija"}</td>
                </tr>
              ))}
              {responsabilidades.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    Todavía no hay responsabilidades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={responsabilidades.page}
        pageCount={responsabilidades.pageCount}
        total={responsabilidades.total}
        pageSize={responsabilidades.pageSize}
        onChange={responsabilidades.setPage}
      />

      {modalAbierto && (
        <NuevaResponsabilidadModal
          subgrupos={subgrupos.data ?? []}
          municipios={municipios.data ?? []}
          onClose={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false);
            responsabilidades.recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevaResponsabilidadModal({
  subgrupos,
  municipios,
  onClose,
  onCreado,
}: {
  subgrupos: SubgrupoResponsabilidad[];
  municipios: Municipio[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("responsabilidades", {
        ...form,
        id_subgrupo: Number(form.id_subgrupo),
      });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la responsabilidad");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nueva responsabilidad" onClose={onClose} wide>
      <form className="grid-form" onSubmit={crear} style={{ marginBottom: 0 }}>
        <label>
          Auto número
          <input value={form.auto_numero} onChange={(e) => setForm({ ...form, auto_numero: e.target.value })} required maxLength={10} autoFocus />
        </label>
        <label>
          Código DIAN
          <input value={form.codigo_dian} onChange={(e) => setForm({ ...form, codigo_dian: e.target.value })} required maxLength={10} />
        </label>
        <label>
          Código formulario
          <input value={form.codigo_formulario} onChange={(e) => setForm({ ...form, codigo_formulario: e.target.value })} required maxLength={10} />
        </label>
        <label className="span-2">
          Nombre
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </label>
        <label>
          Subgrupo
          <select value={form.id_subgrupo} onChange={(e) => setForm({ ...form, id_subgrupo: e.target.value })} required>
            <option value="">Seleccione…</option>
            {subgrupos.map((s) => (
              <option key={s.id_subgrupo} value={s.id_subgrupo}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
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
        <label>
          Tipo
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Tipo })}>
            <option value="Obligatoria">Obligatoria</option>
            <option value="No obligatoria">No obligatoria</option>
          </select>
        </label>
        <label>
          Modo de vencimiento
          <select
            value={form.modo_vencimiento}
            onChange={(e) => setForm({ ...form, modo_vencimiento: e.target.value as ModoVencimiento })}
          >
            <option value="CALENDARIO_NIT">Según calendario tributario (por NIT)</option>
            <option value="FECHA_FIJA">Fecha fija</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={form.sancion} onChange={(e) => setForm({ ...form, sancion: e.target.checked })} />
          Tiene sanción por incumplimiento
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
            {guardando ? "Guardando…" : "Crear responsabilidad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
