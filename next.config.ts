import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cache Components : les données sont dynamiques par défaut, on met explicitement
  // en cache ce qui doit l'être avec `use cache` + `cacheTag`. Active aussi le PPR.
  cacheComponents: true,

  // En développement, Next.js bloque par défaut les requêtes vers ses ressources
  // internes (/_next/*) venant d'une autre origine que `localhost`. Sans cette
  // liste, ouvrir le site depuis l'IP réseau — un téléphone sur le même Wi-Fi,
  // par exemple — sert le HTML mais bloque le JavaScript client : plus aucune
  // interactivité (simulateur, cartes, menus). N'a aucun effet en production.
  allowedDevOrigins: ['192.168.1.73', '192.168.*.*', '10.*.*.*', '*.local'],

  images: {
    remotePatterns: [],
  },
}

export default nextConfig
