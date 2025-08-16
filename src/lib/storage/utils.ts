import jimp from 'jimp'
import { join } from 'path'
import heicConvert from 'heic-convert'
import { HEIC_MIME_TYPES } from '../../constants/mime-types.js'

export const compressFile = async (buffer: Buffer, mimetype: string): Promise<Buffer> => {
  try {
    // Handle HEIC files specifically
    if (HEIC_MIME_TYPES.includes(mimetype)) {
      try {
        // Convert HEIC to JPEG using heic-convert
        const jpegBuffer = await heicConvert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.8
        })
        // Convert ArrayBuffer to Buffer
        return Buffer.from(jpegBuffer)
      } catch (heicError) {
        console.warn('HEIC conversion failed, returning original buffer:', heicError)
        return buffer
      }
    }

    // For video files, return original buffer (no compression)
    if (mimetype.startsWith('video/')) {
      console.log(`Video file detected (${mimetype}), skipping compression`)
      return buffer
    }

    // For other image formats, use Jimp compression
    if (mimetype.startsWith('image/')) {
      return new Promise<Buffer>((resolve, reject) => {
        jimp.read(buffer, (err, image) => {
          if (err) {
            reject(err)
            return
          }
          try {
            image.quality(70).getBuffer(mimetype, (err, buffer) => {
              if (err) {
                reject(err)
                return
              }
              resolve(buffer)
            })
          } catch (error) {
            reject(error)
          }
        })
      })
    }

    // For unknown file types, return original buffer
    console.warn(`Unknown file type (${mimetype}), returning original buffer`)
    return buffer
  } catch (error) {
    console.warn('Compression failed, returning original buffer:', error)
    return buffer
  }
}

export const generateDiskUploadsDir = () => {
  // Use process.cwd() to get the current working directory (server root)
  // This is more reliable than trying to calculate relative paths from compiled JS
  const rootDir = process.cwd()
  const uploadsDir = join(rootDir, 'uploads')

  console.log(`Generated uploads directory path: ${uploadsDir}`)
  return uploadsDir
}
