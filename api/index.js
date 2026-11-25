// Punto de entrada de la funcion en Vercel. Es JavaScript a proposito: usa el
// codigo ya compilado por `nest build` (tsc), porque el compilador rapido de
// Vercel no emite los metadatos de tipos que Nest necesita para inyectar.
const { default: handler } = require('../apps/api/dist/src/serverless');

module.exports = handler;
