import { IMAGE_EXTENSIONS } from './image-extensions.js'
import { VIDEO_EXTENSIONS } from './video-extensions.js'

// Combined media extensions (images + videos)
export const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const

// Combined media MIME types
export const MEDIA_MIME_TYPES = {
  // Images
  ...Object.fromEntries(
    Object.entries({
      JPEG: 'image/jpeg',
      JPG: 'image/jpeg',
      PNG: 'image/png',
      WEBP: 'image/webp',
      GIF: 'image/gif',
      TIFF: 'image/tiff',
      BMP: 'image/bmp',
      ICO: 'image/x-icon',
      SVG: 'image/svg+xml',
      HEIC: 'image/heic',
      HEIF: 'image/heif',
    })
  ),
  // Videos
  ...Object.fromEntries(
    Object.entries({
      MP4: 'video/mp4',
      AVI: 'video/x-msvideo',
      MOV: 'video/quicktime',
      WMV: 'video/x-ms-wmv',
      FLV: 'video/x-flv',
      WEBM: 'video/webm',
      MKV: 'video/x-matroska',
      '3GP': 'video/3gpp',
      OGV: 'video/ogg',
      TS: 'video/mp2t',
      VOB: 'video/mpeg',
      ASF: 'video/x-ms-asf',
    })
  ),
} as const

export const SUPPORTED_MEDIA_MIME_TYPES = Object.values(MEDIA_MIME_TYPES)

// File type categories for validation
export const FILE_TYPE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const

// Function to determine if a file is an image or video
export const getFileTypeCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) {
    return FILE_TYPE_CATEGORIES.IMAGE
  }
  if (mimeType.startsWith('video/')) {
    return FILE_TYPE_CATEGORIES.VIDEO
  }
  return 'unknown'
}

// Function to check if a file extension is supported
export const isSupportedMediaExtension = (extension: string): boolean => {
  return MEDIA_EXTENSIONS.includes(extension.toLowerCase() as any)
}

// Function to check if a MIME type is supported
export const isSupportedMediaMimeType = (mimeType: string): boolean => {
  return SUPPORTED_MEDIA_MIME_TYPES.includes(mimeType)
}
