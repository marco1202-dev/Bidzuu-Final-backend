import * as dotenv from 'dotenv'

console.log('Current working directory:', process.cwd())

// Load .env file
dotenv.config()

console.log('POSTGRES_CONNECTION_MAX_POOL raw:', process.env.POSTGRES_CONNECTION_MAX_POOL)
console.log('POSTGRES_CONNECTION_MAX_POOL type:', typeof process.env.POSTGRES_CONNECTION_MAX_POOL)
console.log('POSTGRES_CONNECTION_MAX_POOL converted:', +process.env.POSTGRES_CONNECTION_MAX_POOL)
console.log('POSTGRES_CONNECTION_MAX_POOL converted type:', typeof +process.env.POSTGRES_CONNECTION_MAX_POOL)
console.log('Is NaN?', isNaN(+process.env.POSTGRES_CONNECTION_MAX_POOL))
