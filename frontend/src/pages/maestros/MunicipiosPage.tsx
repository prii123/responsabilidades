import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import type { Municipio } from "../../api/types";

export default function MunicipiosPage() {
  const { data, loading, error, recargar } = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const [cod, setCod] = useState("");
  const [nombre, setNombre] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setGuardando(true);
    try {
      await apiPost("municipios", { cod_municipio: cod, nombre });
      setCod("");
      setNombre("");
      recargar();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo crear el municipio");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="page">
      <h1>Municipios</h1>
      <p className="page-subtitle">Base geográfica: se usa en Responsabilidades y Clientes.</p>

      <form className="inline-form" onSubmit={crear}>
        <input placeholder="Código DANE (ej. 11001)" value={cod} onChange={(e) => setCod(e.target.value)} maxLength={5} required />
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <button type="submit" disabled={guardando}>
          Agregar
        </button>
      </form>
      {formError && <p className="form-error">{formError}</p>}

      {loading && <p>Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.cod_municipio}>
                <td>{m.cod_municipio}</td>
                <td>{m.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
