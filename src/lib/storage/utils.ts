import jimp from 'jimp'
import { join } from 'path'

export const compressFile = (buffer: Buffer, mimetype: string) => {
  return new Promise<Buffer>((resolve, reject) => {
    jimp.read(buffer, (err, image) => {
      if (err) {
        reject(err)
      }
      try {
        image.quality(70).getBuffer(mimetype, (err, buffer) => {
          if (err) {
            reject(err)
          }
          resolve(buffer)
        })
      } catch (error) {
        reject(error)
      }
    })
  })
}

export const generateDiskUploadsDir = () => {
  // Use process.cwd() to get the current working directory (server root)
  // This is more reliable than trying to calculate relative paths from compiled JS
  const rootDir = process.cwd()
  const uploadsDir = join(rootDir, 'uploads')

  console.log(`Generated uploads directory path: ${uploadsDir}`)
  return uploadsDir
}
