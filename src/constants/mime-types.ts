export const IMAGE_MIME_TYPES = {
  // JPEG
  JPEG: 'image/jpeg',
  JPG: 'image/jpeg',
  JFIF: 'image/jpeg',

  // PNG
  PNG: 'image/png',

  // WebP
  WEBP: 'image/webp',

  // GIF
  GIF: 'image/gif',

  // TIFF
  TIFF: 'image/tiff',
  TIF: 'image/tiff',

  // HEIC/HEIF
  HEIC: 'image/heic',
  HEIF: 'image/heif',
  HEICS: 'image/heic-sequence',
  HEIFS: 'image/heif-sequence',

  // BMP
  BMP: 'image/bmp',

  // ICO
  ICO: 'image/x-icon',

  // SVG
  SVG: 'image/svg+xml',

  // RAW formats
  CR2: 'image/x-canon-cr2',
  NEF: 'image/x-nikon-nef',
  RAW: 'image/x-raw',
} as const

export const SUPPORTED_IMAGE_MIME_TYPES = Object.values(IMAGE_MIME_TYPES)

// MIME type to extension mapping for HEIC files
export const HEIC_MIME_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]

// File extensions that should be treated as HEIC
export const HEIC_EXTENSIONS = [
  'heic',
  'heif',
  'heics',
  'heifs',
]
