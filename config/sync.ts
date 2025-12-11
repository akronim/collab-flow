import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface Config {
  [key: string]: EnvironmentConfig;
}

export interface EnvironmentConfig {
  shared: SharedConfig;
  ports: PortsConfig;
  secrets: SecretsConfig;
}

export interface SharedConfig {
  SESSION_SECRET_LENGTH: number;
  SESSION_MAX_AGE: string;
  INTERNAL_JWT_SECRET_LENGTH: number;
  INTERNAL_JWT_EXPIRES_IN: string;
  ENCRYPTION_KEY_LENGTH: number;
  APP_TITLE: string;
}

export interface PortsConfig {
  collab_flow_api: number;
  google_oauth_backend: number;
  sync_forge: number;
}

export interface SecretsConfig {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export type LocalConfig = {
  [key: string]: {
    secrets?: Partial<SecretsConfig>;
  };
};

export interface RunOptions {
  env?: string;
}

export const ENV_KEYS = {
  PORT: `PORT`,
  NODE_ENV: `NODE_ENV`,
  CORS_ORIGIN: `CORS_ORIGIN`,
  COLLAB_FLOW_API_URL: `COLLAB_FLOW_API_URL`,
  GOOGLE_CLIENT_ID: `GOOGLE_CLIENT_ID`,
  GOOGLE_CLIENT_SECRET: `GOOGLE_CLIENT_SECRET`,
  REDIRECT_URI: `REDIRECT_URI`,
  SESSION_SECRET: `SESSION_SECRET`,
  SESSION_MAX_AGE: `SESSION_MAX_AGE`,
  INTERNAL_JWT_SECRET: `INTERNAL_JWT_SECRET`,
  INTERNAL_JWT_EXPIRES_IN: `INTERNAL_JWT_EXPIRES_IN`,
  GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY: `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY`,
  VITE_APP_TITLE: `VITE_APP_TITLE`,
  VITE_GOOGLE_CLIENT_ID: `VITE_GOOGLE_CLIENT_ID`,
  VITE_AUTH_API_URL: `VITE_AUTH_API_URL`,
  VITE_GATEWAY_API_URL: `VITE_GATEWAY_API_URL`,
  VITE_RESOURCE_API_URL: `VITE_RESOURCE_API_URL`,
} as const

export interface GenerateEnvInput {
  env: string;
  shared: SharedConfig;
  ports: PortsConfig;
  secrets: SecretsConfig;
  sessionSecret: string;
  internalJwtSecret: string;
  encryptionKey: string;
}

export const ERROR_MESSAGES = {
  INVALID_GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID is invalid.',
  INVALID_GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET is invalid.',
} as const

export const validateSecrets = (secrets: SecretsConfig): void => {
  if (!secrets.GOOGLE_CLIENT_ID || !secrets.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    throw new Error(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_ID)
  }
  if (!secrets.GOOGLE_CLIENT_SECRET || secrets.GOOGLE_CLIENT_SECRET.length < 10) {
    throw new Error(ERROR_MESSAGES.INVALID_GOOGLE_CLIENT_SECRET)
  }
}

export const mergeSecrets = (
  baseSecrets: SecretsConfig,
  localSecrets?: Partial<SecretsConfig>
): SecretsConfig => {
  return {
    ...baseSecrets,
    ...localSecrets,
  }
}

export const generateEnvContents = (input: GenerateEnvInput): Record<string, string> => {
  const { env, shared, ports, secrets, sessionSecret, internalJwtSecret, encryptionKey } = input

  const collabFlowApiUrl = `http://localhost:${ports.collab_flow_api}`
  const googleOauthBackendUrl = `http://localhost:${ports.google_oauth_backend}`
  const syncForgeUrl = `http://localhost:${ports.sync_forge}`

  return {
    'collab-flow-api': [
      `${ENV_KEYS.PORT}=${ports.collab_flow_api}`,
      `${ENV_KEYS.NODE_ENV}=${env}`,
      `${ENV_KEYS.GOOGLE_CLIENT_ID}=${secrets.GOOGLE_CLIENT_ID}`,
      `${ENV_KEYS.INTERNAL_JWT_SECRET}=${internalJwtSecret}`,
    ].join(`\n`) + `\n`,
    'google-oauth-backend': [
      `${ENV_KEYS.PORT}=${ports.google_oauth_backend}`,
      `${ENV_KEYS.NODE_ENV}=${env}`,
      `${ENV_KEYS.CORS_ORIGIN}=${syncForgeUrl}`,
      `${ENV_KEYS.COLLAB_FLOW_API_URL}=${collabFlowApiUrl}`,
      `${ENV_KEYS.GOOGLE_CLIENT_ID}=${secrets.GOOGLE_CLIENT_ID}`,
      `${ENV_KEYS.GOOGLE_CLIENT_SECRET}=${secrets.GOOGLE_CLIENT_SECRET}`,
      `${ENV_KEYS.REDIRECT_URI}=${syncForgeUrl}/auth/callback`,
      `${ENV_KEYS.SESSION_SECRET}=${sessionSecret}`,
      `${ENV_KEYS.SESSION_MAX_AGE}=${shared.SESSION_MAX_AGE}`,
      `${ENV_KEYS.INTERNAL_JWT_SECRET}=${internalJwtSecret}`,
      `${ENV_KEYS.INTERNAL_JWT_EXPIRES_IN}=${shared.INTERNAL_JWT_EXPIRES_IN}`,
      `${ENV_KEYS.GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY}=${encryptionKey}`,
    ].join(`\n`) + `\n`,
    'sync-forge': [
      `${ENV_KEYS.VITE_APP_TITLE}=${shared.APP_TITLE}`,
      `${ENV_KEYS.VITE_GOOGLE_CLIENT_ID}=${secrets.GOOGLE_CLIENT_ID}`,
      `${ENV_KEYS.VITE_AUTH_API_URL}=${googleOauthBackendUrl}`,
      `${ENV_KEYS.VITE_GATEWAY_API_URL}=${googleOauthBackendUrl}`,
      `${ENV_KEYS.VITE_RESOURCE_API_URL}=${collabFlowApiUrl}`,
    ].join(`\n`) + `\n`,
  }
}

const generateSecret = (length: number): string => {
  return crypto.randomBytes(length).toString(`hex`)
}

const writeEnvFile = (serviceName: string, content: string): void => {
  const envPath = path.resolve(__dirname, '..', serviceName, '.env')
  fs.writeFileSync(envPath, content)
  console.log(`✅ Successfully generated .env for ${serviceName}`)
}

export const run = (options: RunOptions = {}): void => {
  const { env = 'development' } = options
  console.log(`🚀 Starting environment synchronization for [${env}]...`)

  const configPath = path.resolve(__dirname, 'config.json')
  let config: Config
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8')
    config = JSON.parse(configFile)
  } catch (error) {
    throw new Error(`Error reading or parsing config.json: ${error}`)
  }

  const envConfig = config[env]
  if (!envConfig) {
    throw new Error(`Environment [${env}] not found in config.json.`)
  }

  const localConfigPath = path.resolve(__dirname, 'config.local.json')
  let mergedSecrets = envConfig.secrets
  try {
    if (fs.existsSync(localConfigPath)) {
      const localConfigFile = fs.readFileSync(localConfigPath, 'utf-8')
      const localConfig: LocalConfig = JSON.parse(localConfigFile)
      if (localConfig[env]?.secrets) {
        mergedSecrets = mergeSecrets(envConfig.secrets, localConfig[env]?.secrets)
        console.log(`🤫 Merged secrets from config.local.json for [${env}]`)
      }
    }
  } catch (error) {
    throw new Error(`Error reading or parsing config.local.json: ${error}`)
  }

  validateSecrets(mergedSecrets)

  const sessionSecret = generateSecret(envConfig.shared.SESSION_SECRET_LENGTH)
  const internalJwtSecret = generateSecret(envConfig.shared.INTERNAL_JWT_SECRET_LENGTH)
  const encryptionKey = generateSecret(envConfig.shared.ENCRYPTION_KEY_LENGTH)
  console.log(`🔑 Generated new SESSION_SECRET, INTERNAL_JWT_SECRET, and ENCRYPTION_KEY.`)

  const envContents = generateEnvContents({
    env,
    shared: envConfig.shared,
    ports: envConfig.ports,
    secrets: mergedSecrets,
    sessionSecret,
    internalJwtSecret,
    encryptionKey,
  })

  for (const [serviceName, content] of Object.entries(envContents)) {
    writeEnvFile(serviceName, content)
  }

  console.log('✨ Environment synchronization complete!')
}

const main = () => {
  const args = process.argv.slice(2)
  const envArg = args.find(arg => arg.startsWith('--env='))
  const env = envArg ? envArg.split('=')[1] : 'development'

  try {
    run({ env })
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}