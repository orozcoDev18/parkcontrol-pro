// La web no llama a la API por su dominio: la sirve ella misma bajo /api. Asi la
// cookie de sesion es del mismo sitio que la pagina y el navegador no la trata
// como de terceros (Safari bloquea esas, y ahi se cae el login en iPhone).
const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
