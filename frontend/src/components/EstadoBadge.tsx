import type { EstadoEvento } from "../api/types";

const CLASES: Record<EstadoEvento, string> = {
  Pendiente: "badge badge-pendiente",
  Realizado: "badge badge-realizado",
  Vencido: "badge badge-vencido",
  Cancelado: "badge badge-cancelado",
  "Realizado vencido": "badge badge-realizado-vencido",
};

export default function EstadoBadge({ estado }: { estado: EstadoEvento }) {
  return <span className={CLASES[estado]}>{estado}</span>;
}
