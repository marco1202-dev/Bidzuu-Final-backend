import componentLoader from '../dist/admin-panel/component-loader.js'
import { bundle } from '@adminjs/bundler'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

void (async () => {
  try {
    console.log('Starting AdminJS bundling...')
    console.log('Component loader:', componentLoader)

    // Ensure .adminjs directory exists
    const adminJsDir = '.adminjs'
    if (!fs.existsSync(adminJsDir)) {
      fs.mkdirSync(adminJsDir, { recursive: true })
      console.log('Created .adminjs directory')
    }

    console.log('Bundling to directory:', adminJsDir)

    await bundle({
      componentLoader,
      destinationDir: adminJsDir,
    })

    console.log('AdminJS bundling completed successfully!')
  } catch (error) {
    console.error('Error during AdminJS bundling:', error)
    process.exit(1)
  }
})()
