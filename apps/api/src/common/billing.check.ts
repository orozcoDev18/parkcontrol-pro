// Autocomprobacion del cobro: `npm run check`.
import assert from 'node:assert/strict';
import { durationMinutes, hourlyCharge, movementCharge, GRACE_MINUTES } from './billing';

const t0 = new Date('2026-01-01T08:00:00Z');
assert.equal(durationMinutes(t0, new Date('2026-01-01T09:30:00Z')), 90);
assert.equal(durationMinutes(t0, t0), 0);
assert.equal(durationMinutes(new Date('2026-01-01T09:00:00Z'), t0), 0, 'salida antes de entrada no es negativa');

assert.equal(hourlyCharge(GRACE_MINUTES, 3000), 0, 'dentro de la gracia no se cobra');
assert.equal(hourlyCharge(GRACE_MINUTES + 1, 3000), 3000, 'pasada la gracia se cobra 1 hora');
assert.equal(hourlyCharge(60, 3000), 3000);
assert.equal(hourlyCharge(61, 3000), 6000, 'la hora empezada se cobra completa');
assert.equal(hourlyCharge(180, 2500), 7500);

assert.equal(movementCharge({ coveredByPlan: true, minutes: 600, hourlyRate: 3000 }), 0);
assert.equal(movementCharge({ coveredByPlan: false, minutes: 600, hourlyRate: 3000 }), 30000);

console.log('billing OK');
