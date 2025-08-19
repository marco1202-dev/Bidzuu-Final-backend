import { Router, Request, Response } from 'express'
import { ImageAnnotatorClient } from '@google-cloud/vision'

const router = Router()

// Initialize Google Cloud Vision client
let visionClient: ImageAnnotatorClient | null = null

try {
  // Check if Google Cloud credentials are available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient()
    console.log('Google Cloud Vision client initialized successfully')
  } else {
    console.log('Google Cloud Vision credentials not found, OCR functionality will be disabled')
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Vision client:', error)
}

interface OCRRequest {
  image: string // base64 encoded image
  imageType: string
}

interface ExtractedData {
  firstName?: string
  lastName?: string
  fullName?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  idNumber?: string
  issueDate?: string
  expiryDate?: string
  documentType?: string
  confidence: number
  rawText: string
}

// Function to extract text from image using Google Cloud Vision
async function extractTextFromImage(base64Image: string): Promise<string> {
  if (!visionClient) {
    throw new Error('Google Cloud Vision client not available')
  }

  const request = {
    image: {
      content: base64Image
    },
    features: [
      {
        type: 'TEXT_DETECTION' as const,
        maxResults: 50
      }
    ]
  }

  const [result] = await visionClient.annotateImage(request)
  const textAnnotations = result.textAnnotations

  if (!textAnnotations || textAnnotations.length === 0) {
    return ''
  }

  // The first element contains the entire text
  return textAnnotations[0].description || ''
}

// Function to parse extracted text and identify relevant information
function parseExtractedText(text: string): ExtractedData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  const result: ExtractedData = {
    confidence: 0,
    rawText: text
  }

  // Extract document type
  const documentTypeKeywords = ['DRIVER', 'LICENSE', 'PASSPORT', 'ID', 'IDENTIFICATION', 'CARD']
  for (const line of lines) {
    const upperLine = line.toUpperCase()
    for (const keyword of documentTypeKeywords) {
      if (upperLine.includes(keyword)) {
        result.documentType = line
        break
      }
    }
    if (result.documentType) break
  }

  // Extract name patterns
  const namePatterns = [
    /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/, // First Last
    /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/, // First Middle Last
    /^([A-Z][A-Z\s]+)$/ // ALL CAPS NAME
  ]

  for (const line of lines) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern)
      if (match) {
        if (match.length === 3) {
          result.firstName = match[1]
          result.lastName = match[2]
        } else if (match.length === 4) {
          result.firstName = match[1]
          result.lastName = match[3]
        } else if (match.length === 2) {
          const nameParts = match[1].trim().split(/\s+/)
          if (nameParts.length >= 2) {
            result.firstName = nameParts[0]
            result.lastName = nameParts.slice(1).join(' ')
          }
        }
        break
      }
    }
    if (result.firstName && result.lastName) break
  }

  // Extract date patterns
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})/, // MM DD YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/ // YYYY/MM/DD
  ]

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern)
      if (match) {
        // Look for context clues to determine if it's DOB, issue date, or expiry date
        const upperLine = line.toUpperCase()
        if (upperLine.includes('BIRTH') || upperLine.includes('DOB') || upperLine.includes('BORN')) {
          result.dateOfBirth = `${match[1]}/${match[2]}/${match[3]}`
        } else if (upperLine.includes('ISSUE') || upperLine.includes('ISSUED')) {
          result.issueDate = `${match[1]}/${match[2]}/${match[3]}`
        } else if (upperLine.includes('EXPIR') || upperLine.includes('EXP') || upperLine.includes('VALID')) {
          result.expiryDate = `${match[1]}/${match[2]}/${match[3]}`
        } else if (!result.dateOfBirth) {
          // Assume it's DOB if no other date is found
          result.dateOfBirth = `${match[1]}/${match[2]}/${match[3]}`
        }
      }
    }
  }

  // Extract address patterns
  const addressKeywords = ['ADDRESS', 'STREET', 'ROAD', 'AVENUE', 'DRIVE', 'LANE', 'BOULEVARD']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()

    for (const keyword of addressKeywords) {
      if (upperLine.includes(keyword)) {
        // Look for the next few lines that might contain the actual address
        let addressParts = []
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (lines[j].length > 5 && !lines[j].match(/^\d{5}/)) { // Not a ZIP code
            addressParts.push(lines[j])
          }
        }
        if (addressParts.length > 0) {
          result.address = addressParts.join(', ')
        }
        break
      }
    }
    if (result.address) break
  }

  // Extract city, state, ZIP
  for (const line of lines) {
    // Look for ZIP code pattern
    const zipMatch = line.match(/\d{5}/)
    if (zipMatch) {
      result.zipCode = zipMatch[0]

      // Look for city and state in the same line or nearby
      const cityStateMatch = line.match(/^([A-Za-z\s]+),\s*([A-Z]{2})\s*\d{5}/)
      if (cityStateMatch) {
        result.city = cityStateMatch[1].trim()
        result.state = cityStateMatch[2]
      }
    }
  }

  // Extract ID number
  const idPatterns = [
    /ID[:\s]*([A-Z0-9]+)/i,
    /LICENSE[:\s]*([A-Z0-9]+)/i,
    /NUMBER[:\s]*([A-Z0-9]+)/i
  ]

  for (const line of lines) {
    for (const pattern of idPatterns) {
      const match = line.match(pattern)
      if (match) {
        result.idNumber = match[1]
        break
      }
    }
    if (result.idNumber) break
  }

  // Calculate confidence based on how many fields were successfully extracted
  const extractedFields = [
    result.firstName, result.lastName, result.dateOfBirth,
    result.address, result.city, result.state, result.zipCode,
    result.idNumber, result.documentType
  ].filter(field => field && field.length > 0).length

  result.confidence = Math.min(100, Math.max(0, extractedFields * 10))

  return result
}

// POST endpoint to extract data from ID card image
router.post('/extract-id-data', async (req: Request<{}, {}, OCRRequest>, res: Response) => {
  try {
    const { image } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    if (!visionClient) {
      return res.status(503).json({
        error: 'OCR service is not available. Please ensure Google Cloud Vision is properly configured.'
      })
    }

    // Extract text from image
    const extractedText = await extractTextFromImage(image)

    if (!extractedText) {
      return res.status(400).json({
        error: 'No text could be extracted from the image. Please ensure the image is clear and readable.'
      })
    }

    // Parse the extracted text to identify relevant information
    const extractedData = parseExtractedText(extractedText)

    res.json(extractedData)

  } catch (error) {
    console.error('Error processing OCR request:', error)
    res.status(500).json({
      error: 'Failed to process image. Please try again.'
    })
  }
})

// GET endpoint to check OCR service status
router.get('/status', (req: Request, res: Response) => {
  const isAvailable = visionClient !== null
  res.json({
    available: isAvailable,
    service: 'Google Cloud Vision API',
    message: isAvailable
      ? 'OCR service is available'
      : 'OCR service is not available. Check Google Cloud credentials.'
  })
})

export { router as ocrRouter }
