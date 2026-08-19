/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

// En GitHub Actions el nombre del repo se deduce solo; en local vale el fallback.
// Así no hay que tocar nada si el repositorio se llama de otra forma.
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'nalitos';

const nextConfig = {
  // Exportación 100% estática: genera la carpeta /out lista para GitHub Pages.
  output: 'export',
  trailingSlash: true,
  images: {
    // next/image necesita un servidor para optimizar; en estático lo desactivamos.
    unoptimized: true,
  },
  // Solo aplicamos basePath/assetPrefix al construir para GitHub Pages
  // (así `npm run dev` y `npm run build` locales siguen funcionando en la raíz).
  basePath: isGithubPages ? `/${REPO_NAME}` : '',
  assetPrefix: isGithubPages ? `/${REPO_NAME}/` : '',
};

module.exports = nextConfig;
