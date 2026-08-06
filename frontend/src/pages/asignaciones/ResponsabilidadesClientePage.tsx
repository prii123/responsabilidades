import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPatch, apiPost, ApiError } from "../../api/client";
import type { Cliente, Responsabilidad, ResponsabilidadCliente } from "../../api/types";

export default function ResponsabilidadesClientePage() {
  const clientes = useApiGet<Cliente[]>("clientes", { order: "nombre" });
  const responsabilidades = useApiGet<Responsabilidad[]>("responsabilidades", { order: "nombre" });

  const [idCliente, setIdCliente] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);

  const marcadas = useApiGet<ResponsabilidadCliente[]>(
    "responsabilidades_cliente",
    idCliente ? { id_cliente: `eq.${idCliente}`, anio: `eq.${anio}` } : { id_cliente: "eq.0" },
    [idCliente, anio]
  );

  function estadoDe(idResponsabilidad: number): ResponsabilidadCliente | undefined {
    return marcadas.data?.find((rc) => rc.id_responsabilidad === idResponsabilidad);
  }

  async function alternar(r: Responsabilidad) {
    setError(null);
    const actual = estadoDe(r.id_responsabilidad);
    try {
      if (!actual) {
        await apiPost("responsabilidades_cliente", {
          id_cliente: Number(idCliente),
          id_responsabilidad: r.id_responsabilidad,
          anio: Number(anio),
          estado: "Activa",
        });
      } else {
        await apiPatch(
          "responsabilidades_cliente",
          { id_responsabilidad_cliente: `eq.${actual.id_responsabilidad_cliente}` },
          { estado: actual.estado === "Activa" ? "Inactiva" : "Activa" }
        );
      }
      marcadas.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar");
    }
  }

  function onSelectCliente(e: FormEvent<HTMLSelectElement>) {
    setIdCliente(e.currentTarget.value);
  }

  return (
    <div className="page">
      <h1>Responsabilidades del cliente</h1>
      <p className="page-subtitle">
        Paso 7: marca las responsabilidades RUT vigentes del cliente para el año. Esto es lo que la Regla 1 exige antes de
        poder asignarlo a un profesional.
      </p>

      <div className="inline-form">
        <select value={idCliente} onChange={onSelectCliente} required>
          <option value="">Seleccione un cliente…</option>
          {clientes.data?.map((c) => (
            <option key={c.id_cliente} value={c.id_cliente}>
              {c.nombre} (NIT {c.nit}-{c.digito_verificacion})
            </option>
          ))}
        </select>
        <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 100 }} />
      </div>

      {error && <p className="form-error">{error}</p>}

      {idCliente && responsabilidades.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Responsabilidad</th>
              <th>Tipo</th>
              <th>Sanción</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {responsabilidades.data.map((r) => {
              const actual = estadoDe(r.id_responsabilidad);
              return (
                <tr key={r.id_responsabilidad}>
                  <td>{r.nombre}</td>
                  <td>{r.tipo}</td>
                  <td>{r.sancion ? "⚠ Sí" : "No"}</td>
                  <td>{actual ? actual.estado : "No marcada"}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => alternar(r)}>
                      {!actual ? "Marcar" : actual.estado === "Activa" ? "Desactivar" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
