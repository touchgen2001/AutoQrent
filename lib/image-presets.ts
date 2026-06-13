export const IMAGE_PRESETS = {
  landingHero: {
    sizes: "(max-width: 640px) 88vw, (max-width: 1024px) 64vw, 420px",
    quality: 78,
  },
  vehicleDetailCover: {
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 85vw, 768px",
    quality: 72,
  },
  vehicleCard: {
    sizes: "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1536px) 31vw, 24vw",
    quality: 68,
  },
  showroomDealerLogo: {
    sizes: "96px",
    quality: 66,
  },
  trustLogo: {
    sizes: "(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 220px",
    quality: 68,
  },
  socialProofLogo: {
    sizes: "(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 200px",
    quality: 66,
  },
} as const
