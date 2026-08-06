export type EstadoActivo = "Activa" | "Inactiva";

export type EstadoEvento =
  | "Pendiente"
  | "Realizado"
  | "Vencido"
  | "Cancelado"
  | "Realizado vencido";

export type Tipo = "Obligatoria" | "No obligatoria";
export type Ambito = "Nacional" | "Departamental" | "Municipal";
export type ModoVencimiento = "CALENDARIO_NIT" | "FECHA_FIJA";
export type Rol = "app_admin" | "app_profesional";

export interface Municipio {
  cod_municipio: string;
  nombre: string;
}

export interface GrupoResponsabilidad {
  id_grupo: number;
  nombre: string;
  tipo: Ambito;
}

export interface SubgrupoResponsabilidad {
  id_subgrupo: number;
  id_grupo: number;
  nombre: string;
}

export interface Responsabilidad {
  id_responsabilidad: number;
  auto_numero: string;
  codigo_dian: string;
  codigo_formulario: string;
  codigo_unico: string;
  nombre: string;
  id_subgrupo: number;
  cod_municipio: string;
  tipo: Tipo;
  sancion: boolean;
  modo_vencimiento: ModoVencimiento;
  activo: boolean;
}

export interface Profesional {
  id_profesional: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export interface Cliente {
  id_cliente: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  nit: number;
  digito_verificacion: number;
  cod_municipio: string | null;
  activo: boolean;
}

export interface CalendarioTributario {
  id_calendario: number;
  nombre: string;
  anio: number;
  ambito: Ambito;
  cod_municipio: string | null;
  digitos_nit: 1 | 2;
}

export interface CalendarioFecha {
  id_calendario_fecha: number;
  id_calendario: number;
  periodo: string;
  nit_desde: number;
  nit_hasta: number;
  fecha_limite: string;
}

export interface ResponsabilidadCalendario {
  id_responsabilidad: number;
  anio: number;
  id_calendario: number;
}

export interface ResponsabilidadCliente {
  id_responsabilidad_cliente: number;
  id_cliente: number;
  id_responsabilidad: number;
  anio: number;
  estado: EstadoActivo;
}

export interface Asignacion {
  id_asignacion_cliente: number;
  id_cliente: number;
  id_profesional: number;
  fecha_asignacion: string;
  fecha_fin: string | null;
  estado: EstadoActivo;
}

export interface Evento {
  id_evento: number;
  id_responsabilidad_cliente: number;
  id_asignacion_cliente: number;
  periodo: string;
  fecha_limite: string;
  estado_evento: EstadoEvento;
}

export interface VEvento {
  id_evento: number;
  id_responsabilidad_cliente: number;
  id_asignacion_cliente: number;
  id_cliente: number;
  cliente_nombre: string;
  nit: number;
  id_responsabilidad: number;
  responsabilidad_nombre: string;
  codigo_unico: string;
  tipo: Tipo;
  sancion: boolean;
  anio: number;
  id_profesional: number;
  profesional_nombre: string;
  periodo: string;
  fecha_limite: string;
  estado_evento: EstadoEvento;
}

export interface Evidencia {
  id_evidencia: number;
  id_evento: number;
  id_profesional: number;
  observaciones: string | null;
  archivo_evidencia: string | null;
  fecha_realizacion: string;
  horas_dedicadas: number | null;
  estado: string;
}

export interface VEvidencia {
  id_evidencia: number;
  id_evento: number;
  id_profesional: number;
  profesional_nombre: string;
  observaciones: string | null;
  archivo_evidencia: string | null;
  fecha_realizacion: string;
  horas_dedicadas: number | null;
  estado: string;
  periodo: string;
  fecha_limite: string;
  estado_evento: EstadoEvento;
  id_cliente: number;
  cliente_nombre: string;
  id_responsabilidad: number;
  responsabilidad_nombre: string;
  anio: number;
}

export interface DashboardResumen {
  id_profesional: number;
  profesional_nombre: string;
  pendientes: number;
  vencidos: number;
  realizados: number;
  cancelados: number;
}

export interface Usuario {
  id_usuario: number;
  email: string;
  rol: Rol;
  id_profesional: number | null;
  activo: boolean;
}

export interface LoginResponse {
  token: string;
  rol: Rol;
  email: string;
  id_profesional: number | null;
}
