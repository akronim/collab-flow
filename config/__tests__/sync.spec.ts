import { describe, it, expect } from 'vitest'
import {
  validateSecrets,
  mergeSecrets,
  generateEnvContents,
  ENV_KEYS,
  ERROR_MESSAGES,
} from '../sync'
import type { SecretsConfig, SharedConfig, PortsConfig } from '../sync'

const validSecrets: SecretsConfig = {
  GOOGLE_CLIENT_ID: '123456789-abcdef.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'GOCSPX-abcdef123456',
}

const baseSecrets: SecretsConfig = {
  GOOGLE_CLIENT_ID: 'base-client-id',
  GOOGLE_CLIENT_SECRET: 'base-client-secret',
}

const sharedConfig: SharedConfig = {
  JWT_SECRET_LENGTH: 32,
  JWT_EXPIRES_IN: '15m',
  APP_TITLE: 'CollabFlow Dev',
}

const portsConfig: PortsConfig = {
  collab_flow_api: 3002,
  google_oauth_backend: 3001,
  sync_forge: 5173,
}

describe('validateSecrets', () => {
  it('should not throw for valid secrets', () => {
    expect(() => validateSecrets(validSecrets)).not.toThrow()
  })

  it('should throw if GOOGLE_CLIENT_ID does not end with .apps.googleusercontent.com', () => {
    expect(() => validateSecrets({
      ...validSecrets,
      GOOGLE_CLIENT_ID: 'invalid-client-id',
    })).toThrow(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_ID)
  })

  it('should throw if GOOGLE_CLIENT_SECRET is too short', () => {
    expect(() => validateSecrets({
      ...validSecrets,
      GOOGLE_CLIENT_SECRET: 'short',
    })).toThrow(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_SECRET)
  })

  it('should throw if GOOGLE_CLIENT_ID is empty', () => {
    expect(() => validateSecrets({
      ...validSecrets,
      GOOGLE_CLIENT_ID: '',
    })).toThrow(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_ID)
  })

  it('should throw if GOOGLE_CLIENT_SECRET is empty', () => {
    expect(() => validateSecrets({
      ...validSecrets,
      GOOGLE_CLIENT_SECRET: '',
    })).toThrow(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_SECRET)
  })
})

describe('mergeSecrets', () => {
  it('should return base secrets when no local secrets provided', () => {
    const result = mergeSecrets(baseSecrets)
    expect(result).toEqual(baseSecrets)
  })

  it('should return base secrets when local secrets is undefined', () => {
    const result = mergeSecrets(baseSecrets, undefined)
    expect(result).toEqual(baseSecrets)
  })

  it('should override base secrets with local secrets', () => {
    const localSecrets = { GOOGLE_CLIENT_ID: 'local-client-id' }
    const result = mergeSecrets(baseSecrets, localSecrets)
    expect(result).toEqual({
      GOOGLE_CLIENT_ID: 'local-client-id',
      GOOGLE_CLIENT_SECRET: 'base-client-secret',
    })
  })

  it('should override all secrets when all provided locally', () => {
    const localSecrets = {
      GOOGLE_CLIENT_ID: 'local-client-id',
      GOOGLE_CLIENT_SECRET: 'local-client-secret',
    }
    const result = mergeSecrets(baseSecrets, localSecrets)
    expect(result).toEqual(localSecrets)
  })
})

describe('generateEnvContents', () => {
  const input = {
    env: 'development',
    shared: sharedConfig,
    ports: portsConfig,
    secrets: validSecrets,
    jwtSecret: 'test-jwt-secret-hex',
  }

  it('should generate env content for all three services', () => {
    const result = generateEnvContents(input)
    expect(Object.keys(result)).toEqual(['collab-flow-api', 'google-oauth-backend', 'sync-forge'])
  })

  it('should generate correct collab-flow-api env', () => {
    const result = generateEnvContents(input)
    const apiEnv = result['collab-flow-api']

    expect(apiEnv).toContain(`${ENV_KEYS.PORT}=3002`)
    expect(apiEnv).toContain(`${ENV_KEYS.NODE_ENV}=development`)
    expect(apiEnv).toContain(`${ENV_KEYS.GOOGLE_CLIENT_ID}=${validSecrets.GOOGLE_CLIENT_ID}`)
    expect(apiEnv).toContain(`${ENV_KEYS.JWT_SECRET}=test-jwt-secret-hex`)
    expect(apiEnv).toContain(`${ENV_KEYS.JWT_EXPIRES_IN}=15m`)
    expect(apiEnv.endsWith('\n')).toBe(true)
  })

  it('should generate correct google-oauth-backend env', () => {
    const result = generateEnvContents(input)
    const backendEnv = result['google-oauth-backend']

    expect(backendEnv).toContain(`${ENV_KEYS.PORT}=3001`)
    expect(backendEnv).toContain(`${ENV_KEYS.NODE_ENV}=development`)
    expect(backendEnv).toContain(`${ENV_KEYS.CORS_ORIGIN}=http://localhost:5173`)
    expect(backendEnv).toContain(`${ENV_KEYS.COLLAB_FLOW_API_URL}=http://localhost:3002`)
    expect(backendEnv).toContain(`${ENV_KEYS.GOOGLE_CLIENT_ID}=${validSecrets.GOOGLE_CLIENT_ID}`)
    expect(backendEnv).toContain(`${ENV_KEYS.GOOGLE_CLIENT_SECRET}=${validSecrets.GOOGLE_CLIENT_SECRET}`)
    expect(backendEnv).toContain(`${ENV_KEYS.REDIRECT_URI}=http://localhost:5173/auth/callback`)
    expect(backendEnv).toContain(`${ENV_KEYS.JWT_SECRET}=test-jwt-secret-hex`)
    expect(backendEnv).toContain(`${ENV_KEYS.JWT_EXPIRES_IN}=15m`)
    expect(backendEnv.endsWith('\n')).toBe(true)
  })

  it('should generate correct sync-forge env', () => {
    const result = generateEnvContents(input)
    const frontendEnv = result['sync-forge']

    expect(frontendEnv).toContain(`${ENV_KEYS.VITE_APP_TITLE}=CollabFlow Dev`)
    expect(frontendEnv).toContain(`${ENV_KEYS.VITE_GOOGLE_CLIENT_ID}=${validSecrets.GOOGLE_CLIENT_ID}`)
    expect(frontendEnv).toContain(`${ENV_KEYS.VITE_AUTH_API_URL}=http://localhost:3001`)
    expect(frontendEnv).toContain(`${ENV_KEYS.VITE_GATEWAY_API_URL}=http://localhost:3001`)
    expect(frontendEnv).toContain(`${ENV_KEYS.VITE_RESOURCE_API_URL}=http://localhost:3002`)
    expect(frontendEnv.endsWith('\n')).toBe(true)
  })

  it('should use correct URLs based on ports', () => {
    const customInput = {
      ...input,
      ports: {
        collab_flow_api: 8080,
        google_oauth_backend: 8081,
        sync_forge: 80,
      },
    }
    const result = generateEnvContents(customInput)

    expect(result['collab-flow-api']).toContain(`${ENV_KEYS.PORT}=8080`)
    expect(result['google-oauth-backend']).toContain(`${ENV_KEYS.PORT}=8081`)
    expect(result['google-oauth-backend']).toContain(`${ENV_KEYS.CORS_ORIGIN}=http://localhost:80`)
    expect(result['google-oauth-backend']).toContain(`${ENV_KEYS.COLLAB_FLOW_API_URL}=http://localhost:8080`)
    expect(result['sync-forge']).toContain(`${ENV_KEYS.VITE_AUTH_API_URL}=http://localhost:8081`)
  })

  it('should use correct environment name', () => {
    const stagingInput = { ...input, env: 'staging' }
    const result = generateEnvContents(stagingInput)

    expect(result['collab-flow-api']).toContain(`${ENV_KEYS.NODE_ENV}=staging`)
    expect(result['google-oauth-backend']).toContain(`${ENV_KEYS.NODE_ENV}=staging`)
  })
})
