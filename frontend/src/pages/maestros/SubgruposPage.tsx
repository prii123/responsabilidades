import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import type { Ambito, GrupoResponsabilidad, SubgrupoResponsabilidad } from "../../api/types";

export default function SubgruposPage() {
  const grupos = useApiGet<GrupoResponsabilidad[]>("grupos_responsabilidad", { order: "nombre" });
  const subgrupos = useApiGet<SubgrupoResponsabilidad[]>("subgrupos_responsabilidad", { order: "nombre" });

  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalSubgrupo, setModalSubgrupo] = useState(false);

  function nombreDeGrupo(id: number) {
    return grupos.data?.find((g) => g.id_grupo === id)?.nombre ?? id;
  }

  return (
    <div className="page">
      <h1>Grupo y Subgrupo de Responsabilidad</h1>
      <p className="page-subtitle">
        Grupo = nivel territorial de la obligación (Nacional / Departamental / Municipal). Subgrupo = tipo de tributo,
        depende del grupo.
      </p>

      <section className="card">
        <div className="section-header">
          <h2>Grupos</h2>
          <button onClick={() => setModalGrupo(true)}>+ Nuevo grupo</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {grupos.data?.map((g) => (
              <tr key={g.id_grupo}>
                <td>{g.nombre}</td>
                <td>{g.tipo}</td>
              </tr>
            ))}
            {grupos.data?.length === 0 && (
              <tr>
                <td colSpan={2} className="empty-cell">
                  Todavía no hay grupos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Subgrupos</h2>
          <button onClick={() => setModalSubgrupo(true)} disabled={!grupos.data?.length}>
            + Nuevo subgrupo
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Subgrupo</th>
            </tr>
          </thead>
          <tbody>
            {subgrupos.data?.map((s) => (
              <tr key={s.id_subgrupo}>
                <td>{nombreDeGrupo(s.id_grupo)}</td>
                <td>{s.nombre}</td>
              </tr>
            ))}
            {subgrupos.data?.length === 0 && (
              <tr>
                <td colSpan={2} className="empty-cell">
                  Todavía no hay subgrupos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {modalGrupo && (
        <NuevoGrupoModal
          onClose={() => setModalGrupo(false)}
          onCreado={() => {
            setModalGrupo(false);
            grupos.recargar();
          }}
        />
      )}

      {modalSubgrupo && (
        <NuevoSubgrupoModal
          grupos={grupos.data ?? []}
          onClose={() => setModalSubgrupo(false)}
          onCreado={() => {
            setModalSubgrupo(false);
            subgrupos.recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevoGrupoModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Ambito | "">("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("grupos_responsabilidad", { nombre, tipo });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo grupo" onClose={onClose}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Ambito)} required>
            <option value="">Seleccione…</option>
            <option value="Nacional">Nacional</option>
            <option value="Departamental">Departamental</option>
            <option value="Municipal">Municipal</option>
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NuevoSubgrupoModal({
  grupos,
  onClose,
  onCreado,
}: {
  grupos: GrupoResponsabilidad[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [idGrupo, setIdGrupo] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("subgrupos_responsabilidad", { id_grupo: Number(idGrupo), nombre });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el subgrupo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo subgrupo" onClose={onClose}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label>
          Grupo
          <select value={idGrupo} onChange={(e) => setIdGrupo(e.target.value)} required autoFocus>
            <option value="">Seleccione…</option>
            {grupos.map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre del subgrupo
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
