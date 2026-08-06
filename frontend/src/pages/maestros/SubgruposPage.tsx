import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import type { GrupoResponsabilidad, SubgrupoResponsabilidad } from "../../api/types";

export default function SubgruposPage() {
  const grupos = useApiGet<GrupoResponsabilidad[]>("grupos_responsabilidad", { order: "nombre" });
  const subgrupos = useApiGet<SubgrupoResponsabilidad[]>("subgrupos_responsabilidad", { order: "nombre" });

  const [nombreGrupo, setNombreGrupo] = useState("");
  const [nombreSubgrupo, setNombreSubgrupo] = useState("");
  const [idGrupo, setIdGrupo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function crearGrupo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("grupos_responsabilidad", { nombre: nombreGrupo });
      setNombreGrupo("");
      grupos.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    }
  }

  async function crearSubgrupo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("subgrupos_responsabilidad", { id_grupo: Number(idGrupo), nombre: nombreSubgrupo });
      setNombreSubgrupo("");
      subgrupos.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el subgrupo");
    }
  }

  function nombreDeGrupo(id: number) {
    return grupos.data?.find((g) => g.id_grupo === id)?.nombre ?? id;
  }

  return (
    <div className="page">
      <h1>Grupo y Subgrupo de Responsabilidad</h1>
      <p className="page-subtitle">
        Grupo = nivel territorial de la obligación (Nacional / Departamental / Municipal). Subgrupo = tipo de tributo, depende del grupo.
      </p>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>Grupos</h2>
        <form className="inline-form" onSubmit={crearGrupo}>
          <input placeholder="Nombre del grupo" value={nombreGrupo} onChange={(e) => setNombreGrupo(e.target.value)} required />
          <button type="submit">Agregar</button>
        </form>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {grupos.data?.map((g) => (
              <tr key={g.id_grupo}>
                <td>{g.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Subgrupos</h2>
        <form className="inline-form" onSubmit={crearSubgrupo}>
          <select value={idGrupo} onChange={(e) => setIdGrupo(e.target.value)} required>
            <option value="">Grupo…</option>
            {grupos.data?.map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                {g.nombre}
              </option>
            ))}
          </select>
          <input placeholder="Nombre del subgrupo" value={nombreSubgrupo} onChange={(e) => setNombreSubgrupo(e.target.value)} required />
          <button type="submit">Agregar</button>
        </form>
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
          </tbody>
        </table>
      </section>
    </div>
  );
}
