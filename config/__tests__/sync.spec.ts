import { vi, describe, it, expect, beforeEach } from 'vitest'
import { run } from '../sync'
import type { Config, LocalConfig } from '../sync'
import * as fs from 'fs'
import type { PathOrFileDescriptor } from 'fs'
import * as crypto from 'crypto'

// Mock the external modules
vi.mock('fs')
vi.mock('crypto')

// --- Mocks Setup ---

const MOCK_JWT_SECRET_STRING = 'mock-super-secret-jwt-string'
const MOCK_JWT_SECRET_HEX = Buffer.from(MOCK_JWT_SECRET_STRING).toString('hex')

// This mock uses the SAME placeholders as the real config.json to ensure validation tests work.
const MOCK_CONFIG: Config = {
  development: {
    shared: { JWT_SECRET_LENGTH: 32, JWT_EXPIRES_IN: '15m', APP_TITLE: 'CollabFlow Dev' },
    ports: { collab_flow_api: 3002, google_oauth_backend: 3001, sync_forge: 5173 },
    secrets: { 
      GOOGLE_CLIENT_ID: 'your-google-client-id.apps.googleusercontent.com', 
      GOOGLE_CLIENT_SECRET: 'your-google-client-secret' 
    }
  },
  staging: {
    shared: { JWT_SECRET_LENGTH: 32, JWT_EXPIRES_IN: '30m', APP_TITLE: 'CollabFlow Staging' },
    ports: { collab_flow_api: 8080, google_oauth_backend: 8081, sync_forge: 80 },
    secrets: { 
      GOOGLE_CLIENT_ID: 'your-google-client-id.apps.googleusercontent.com', 
      GOOGLE_CLIENT_SECRET: 'your-google-client-secret'
    }
  }
}
const MOCK_LOCAL_CONFIG: LocalConfig = {
  development: {
    secrets: {
      GOOGLE_CLIENT_ID: 'real-dev-client-id',
      GOOGLE_CLIENT_SECRET: 'real-dev-client-secret'
    }
  },
  staging: {
    secrets: {
      GOOGLE_CLIENT_ID: 'real-stg-client-id',
      GOOGLE_CLIENT_SECRET: 'real-stg-client-secret'
    }
  }
}

// --- Test Suite ---

describe('Config Sync Script', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks()

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock implementations
    vi.mocked(crypto.randomBytes).mockImplementation((_size: number) => Buffer.from(MOCK_JWT_SECRET_STRING))

    vi.mocked(fs.readFileSync).mockImplementation((path: PathOrFileDescriptor) => {
      const pathStr = path.toString()
      if (pathStr.endsWith('config.json')) return JSON.stringify(MOCK_CONFIG)
      if (pathStr.endsWith('config.local.json')) return JSON.stringify(MOCK_LOCAL_CONFIG)
      throw new Error(`File not found: ${pathStr}`)
    })
    
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  it('should generate .env files correctly for development environment', () => {
    run({ env: 'development', testMode: true })

    const writeFileSyncMock = vi.mocked(fs.writeFileSync)
    
    expect(writeFileSyncMock).toHaveBeenCalledTimes(3)

    const backendEnvCall = writeFileSyncMock.mock.calls.find(call => (call[0] as string).includes('google-oauth-backend'))
    expect(backendEnvCall).toBeDefined()
    const backendEnv = backendEnvCall![1] as string
    expect(backendEnv).toContain('PORT=3001')
    expect(backendEnv).toContain('GOOGLE_CLIENT_ID=real-dev-client-id')
    expect(backendEnv).toContain('GOOGLE_CLIENT_SECRET=real-dev-client-secret')
    expect(backendEnv).toContain(`JWT_SECRET=${MOCK_JWT_SECRET_HEX}`)
  })

  it('should generate .env files correctly for staging environment', () => {
    run({ env: 'staging', testMode: true })
    
    const writeFileSyncMock = vi.mocked(fs.writeFileSync)
    expect(writeFileSyncMock).toHaveBeenCalledTimes(3)
    
    const backendEnvCall = writeFileSyncMock.mock.calls.find(call => (call[0] as string).includes('google-oauth-backend'))
    expect(backendEnvCall).toBeDefined()
    const backendEnv = backendEnvCall![1] as string
    expect(backendEnv).toContain('PORT=8081')
    expect(backendEnv).toContain('GOOGLE_CLIENT_ID=real-stg-client-id')
  })

  it('should throw an error if environment is not found in config.json', () => {
    expect(() => {
      run({ env: 'production', testMode: true })
    }).toThrow('❌ Environment [production] not found in config.json.')
  })

  it('should throw an error if a secret is not provided in local config', () => {
    const incompleteLocalConfig = { development: { secrets: { GOOGLE_CLIENT_ID: 'real-dev-client-id' } } }
    vi.mocked(fs.readFileSync).mockImplementation((path: PathOrFileDescriptor) => {
      const pathStr = path.toString()
      if (pathStr.endsWith('config.json')) return JSON.stringify(MOCK_CONFIG)
      if (pathStr.endsWith('config.local.json')) return JSON.stringify(incompleteLocalConfig)
      throw new Error(`File not found: ${pathStr}`)
    })

    expect(() => {
      run({ env: 'development', testMode: true })
    }).toThrow('❌ GOOGLE_CLIENT_SECRET is missing or is a placeholder in config.')
  })

  it('should throw an error if config.local.json is missing', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    expect(() => {
      run({ env: 'development', testMode: true })
    }).toThrow('❌ GOOGLE_CLIENT_ID is missing or is a placeholder in config.')
  })
})