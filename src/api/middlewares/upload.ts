import { Request, Response } from 'express'
import { fileTypeFromBuffer } from 'file-type'
import { config } from '../../config.js'
import { ASSET_ERRORS } from '../../constants/errors.js'
import { MEDIA_EXTENSIONS } from '../../constants/media-extensions.js'
import { HEIC_MIME_TYPES, HEIC_EXTENSIONS } from '../../constants/mime-types.js'
import { VIDEO_EXTENSIONS } from '../../constants/video-extensions.js'

export const valdiateFilesInRequest = async (
  req: Request,
  res: Response,
  next
) => {
  const files = req.files as Express.Multer.File[]
  console.log(`🚀 Upload middleware: Processing ${files?.length || 0} files`)

  if (!files || !files.length) {
    console.log('✅ Upload middleware: No files to validate')
    return next()
  }

  if (files.length > config.MAX_ALLOWED_ASSETS) {
    console.log(`❌ Upload middleware: Too many files (${files.length} > ${config.MAX_ALLOWED_ASSETS})`)
    return res.status(403).send({ TOO_MANY: ASSET_ERRORS.TOO_MANY })
  }

  for (const file of files) {
    console.log(`📁 Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`)

    // Check file size first
    if (file.size > config.MAX_ASSET_SIZE) {
      console.log(`❌ File too big: ${file.originalname} (${file.size} > ${config.MAX_ASSET_SIZE})`)
      return res.status(403).send({ ASSET_TOO_BIG: ASSET_ERRORS.TOO_BIG })
    }

    // Get the file extension from the original filename
    const originalExt = file.originalname.split('.').pop()?.toLowerCase()

    // Check if it's a HEIC file by filename extension first
    if (originalExt && HEIC_EXTENSIONS.includes(originalExt)) {
      console.log(`✅ HEIC file detected by extension: ${file.originalname}`)
      continue
    }

    // Check if it's a video file by filename extension
    if (originalExt && VIDEO_EXTENSIONS.includes(originalExt as any)) {
      console.log(`✅ Video file detected by extension: ${file.originalname}`)
      continue
    }

    // Try to detect file type from buffer content
    const fileTypeResult = await fileTypeFromBuffer(file.buffer)

    if (fileTypeResult) {
      const { ext, mime } = fileTypeResult
      console.log(`✅ File type detected: ${mime} (${ext}) for ${file.originalname}`)

      // Special handling for HEIC files
      if (HEIC_MIME_TYPES.includes(mime) || HEIC_EXTENSIONS.includes(ext.toLowerCase())) {
        console.log(`✅ HEIC file detected by content: ${file.originalname}`)
        continue
      }

      // Check if it's a video file by MIME type
      if (mime.startsWith('video/')) {
        console.log(`✅ Video file detected by content: ${file.originalname}`)
        continue
      }

      // Validate image files
      if (mime.startsWith('image/')) {
        // Check if the detected extension is in our supported media extensions
        if (MEDIA_EXTENSIONS.includes(ext.toLowerCase())) {
          console.log(`✅ Image file validated: ${file.originalname}`)
          continue
        } else {
          console.log(`❌ Unsupported image extension: ${ext} for ${file.originalname}`)
          return res
            .status(403)
            .send({ ASSET_NOT_SUPPORTED: ASSET_ERRORS.ASSET_TYPE_NOT_SUPPORTED })
        }
      }

      // If we get here, it's an unsupported file type
      console.log(`❌ Unsupported file type: ${mime} for ${file.originalname}`)
      return res
        .status(403)
        .send({ ASSET_NOT_SUPPORTED: ASSET_ERRORS.ASSET_TYPE_NOT_SUPPORTED })
    } else {
      // file-type couldn't detect the file type, fall back to extension checking
      console.log(`⚠️ File type detection failed for: ${file.originalname}, falling back to extension check`)

      if (!originalExt) {
        console.log(`❌ No file extension found for: ${file.originalname}`)
        return res
          .status(403)
          .send({ ASSET_NOT_SUPPORTED: ASSET_ERRORS.ASSET_TYPE_NOT_SUPPORTED })
      }

      // Check if the extension is in our supported media extensions
      if (MEDIA_EXTENSIONS.includes(originalExt)) {
        console.log(`✅ File extension validated: ${originalExt} for ${file.originalname}`)
        continue
      } else {
        console.log(`❌ Unsupported file extension: ${originalExt} for ${file.originalname}`)
        return res
          .status(403)
          .send({ ASSET_NOT_SUPPORTED: ASSET_ERRORS.ASSET_TYPE_NOT_SUPPORTED })
      }
    }
  }

  console.log(`✅ All files validated successfully, total: ${files.length}`)
  return next()
}

export const validateMaxAssetsCountInRequest = (count: number) => {
  return (req: Request, res: Response, next) => {
    const files = req.files as Express.Multer.File[]
    if (!files || !files.length) {
      return next()
    }

    if (files.length > count) {
      return res.status(403).send({ TOO_MANY: ASSET_ERRORS.TOO_MANY })
    }

    return next()
  }
}
