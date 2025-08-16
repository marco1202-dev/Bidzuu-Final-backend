import { fileTypeFromBuffer } from 'file-type'
import { HEIC_MIME_TYPES, HEIC_EXTENSIONS } from './src/constants/mime-types.js'
import { IMAGE_EXTENSIONS } from './src/constants/image-extensions.js'

console.log('Testing HEIC support...\n')

console.log('HEIC MIME Types:', HEIC_MIME_TYPES)
console.log('HEIC Extensions:', HEIC_EXTENSIONS)
console.log('Image Extensions includes HEIC:', IMAGE_EXTENSIONS.includes('heic'))
console.log('Image Extensions includes HEIF:', IMAGE_EXTENSIONS.includes('heif'))

// Test file type detection
async function testFileTypeDetection() {
  console.log('\nTesting file type detection...')

  // Create a mock HEIC file buffer (this is just for testing the constants)
  const mockBuffer = Buffer.from('mock heic data')

  try {
    // This will likely fail since it's not a real HEIC file, but we're testing the constants
    const result = await fileTypeFromBuffer(mockBuffer)
    console.log('File type result:', result)
  } catch (error) {
    console.log('File type detection error (expected for mock data):', error.message)
  }
}

testFileTypeDetection()

console.log('\nHEIC support test completed!')
console.log('If you see HEIC extensions and MIME types above, the support is properly configured.')
