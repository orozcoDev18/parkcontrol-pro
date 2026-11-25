/** Documento sin puntos, guiones ni espacios: evita que el mismo cliente entre dos veces. */
export function normalizeDocument(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

/** Placa en mayusculas, sin espacios ni guiones: una placa es una sola placa. */
export function normalizePlate(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}
