/** Minutos de gracia antes de cobrar la primera hora. */
export const GRACE_MINUTES = 10;

export function durationMinutes(entryAt: Date, exitAt: Date): number {
  return Math.max(0, Math.round((exitAt.getTime() - entryAt.getTime()) / 60000));
}

/**
 * Cobro por horas: se redondea hacia arriba y se cobra minimo 1 hora
 * pasados los minutos de gracia.
 */
export function hourlyCharge(minutes: number, hourlyRate: number): number {
  if (minutes <= GRACE_MINUTES) return 0;
  const hours = Math.max(1, Math.ceil(minutes / 60));
  return Math.round(hours * hourlyRate * 100) / 100;
}

/** Lo que se le cobra a un movimiento al salir. Con plan vigente y cupo, no se cobra. */
export function movementCharge(opts: {
  coveredByPlan: boolean;
  minutes: number;
  hourlyRate: number;
}): number {
  return opts.coveredByPlan ? 0 : hourlyCharge(opts.minutes, opts.hourlyRate);
}
