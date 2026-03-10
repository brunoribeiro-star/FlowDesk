export interface ImageSpec {
  label: string;
  targetWidth: number;
  targetHeight: number;
  maxKB: number;
  minKB: number;
  hint: string;
}

export const IMAGE_SPECS = {
  avatar: {
    label: "Avatar / Foto",
    targetWidth: 256,
    targetHeight: 256,
    maxKB: 80,
    minKB: 30,
    hint: "PNG, JPEG ou WebP · 256×256 px · máx. 80 KB",
  },

  logo: {
    label: "Logo",
    targetWidth: 300,
    targetHeight: 150,
    maxKB: 80,
    minKB: 20,
    hint: "PNG, JPEG ou WebP · 300×150 px · máx. 80 KB",
  },

  thumbnail: {
    label: "Capa / Thumbnail",
    targetWidth: 600,
    targetHeight: 400,
    maxKB: 120,
    minKB: 50,
    hint: "PNG, JPEG ou WebP · 600×400 px · máx. 120 KB",
  },

  card: {
    label: "Capa do projeto",
    targetWidth: 640,
    targetHeight: 360,
    maxKB: 120,
    minKB: 40,
    hint: "PNG, JPEG ou WebP · 640×360 px (16:9) · máx. 120 KB",
  },

  hero: {
    label: "Banner / Preview grande",
    targetWidth: 1200,
    targetHeight: 600,
    maxKB: 400,
    minKB: 100,
    hint: "PNG, JPEG ou WebP · 1200×600 px · máx. 400 KB",
  },
} as const satisfies Record<string, ImageSpec>;

export type ImageSpecKey = keyof typeof IMAGE_SPECS;
