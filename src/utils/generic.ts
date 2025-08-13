import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator'

export const generateAnonymousEmail = () => {
  const prefix = uniqueNamesGenerator({
    dictionaries: [colors, animals],
    style: 'lowerCase',
  })

  // Add timestamp and random component to reduce duplicates
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)

  return `${prefix}_${timestamp}_${random}@biddo.app`
}
