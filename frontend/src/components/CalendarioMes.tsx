import type { EstadoEvento, VEvento } from "../api/types";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const COLOR_PILL: Record<EstadoEvento, string> = {
  Pendiente: "bg-status-pending-soft text-status-pending",
  Vencido: "bg-status-overdue-soft text-status-overdue",
  Realizado: "bg-status-done-soft text-status-done",
  Cancelado: "bg-status-cancelled-soft text-status-cancelled line-through",
  "Realizado vencido": "bg-status-late-soft text-status-late",
};

const COLOR_DOT: Record<EstadoEvento, string> = {
  Pendiente: "bg-status-pending",
  Vencido: "bg-status-overdue",
  Realizado: "bg-status-done",
  Cancelado: "bg-status-cancelled",
  "Realizado vencido": "bg-status-late",
};

const MAX_VISIBLE = 3;
const MAX_DOTS = 4;

export function formatoFecha(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarioMes({
  anio,
  mes,
  eventos,
  diaSeleccionado,
  onDiaClick,
}: {
  anio: number;
  mes: number; // 0-11
  eventos: VEvento[];
  diaSeleccionado: string | null;
  onDiaClick: (fecha: string) => void;
}) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const offset = (primerDia.getDay() + 6) % 7; // Lunes=0 ... Domingo=6
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;

  const eventosPorDia = new Map<number, VEvento[]>();
  for (const ev of eventos) {
    const dia = Number(ev.fecha_limite.slice(8, 10));
    const lista = eventosPorDia.get(dia) ?? [];
    lista.push(ev);
    eventosPorDia.set(dia, lista);
  }

  const hoy = formatoFecha(new Date());

  const celdas = Array.from({ length: totalCeldas }, (_, i) => {
    const numeroDia = i - offset + 1;
    if (numeroDia < 1 || numeroDia > diasEnMes) return null;
    return numeroDia;
  });

  return (
    <div className="cal-grid">
      {DIAS_SEMANA.map((d) => (
        <div key={d} className="cal-weekday">
          {d}
        </div>
      ))}
      {celdas.map((numeroDia, i) => {
        if (numeroDia === null) return <div key={i} className="cal-day cal-day-vacia" />;
        const fecha = formatoFecha(new Date(anio, mes, numeroDia));
        const eventosDia = eventosPorDia.get(numeroDia) ?? [];
        const esHoy = fecha === hoy;
        const seleccionada = fecha === diaSeleccionado;
        return (
          <button
            key={i}
            type="button"
            className={`cal-day ${seleccionada ? "cal-day-seleccionada" : ""}`}
            onClick={() => onDiaClick(fecha)}
          >
            <span className={esHoy ? "cal-day-number cal-day-number-hoy" : "cal-day-number"}>{numeroDia}</span>

            {/* Móvil: solo puntos de color, el detalle se ve tocando el día
                y mirando la lista de abajo. Desde sm: píldoras con nombre. */}
            <div className="cal-day-dots">
              {eventosDia.slice(0, MAX_DOTS).map((ev) => (
                <span key={ev.id_evento} className={`cal-event-dot ${COLOR_DOT[ev.estado_evento]}`} />
              ))}
              {eventosDia.length > MAX_DOTS && <span className="cal-event-dot-more">+{eventosDia.length - MAX_DOTS}</span>}
            </div>

            <div className="cal-day-events">
              {eventosDia.slice(0, MAX_VISIBLE).map((ev) => (
                <span key={ev.id_evento} className={`cal-event-pill ${COLOR_PILL[ev.estado_evento]}`}>
                  {ev.cliente_nombre}
                </span>
              ))}
              {eventosDia.length > MAX_VISIBLE && (
                <span className="cal-event-more">+{eventosDia.length - MAX_VISIBLE} más</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
