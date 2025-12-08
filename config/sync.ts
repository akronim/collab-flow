import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// --- Configuration Interfaces (Exported for testing) ---
export interface Config {
  [key: string]: EnvironmentConfig;
}

export interface EnvironmentConfig {
  shared: SharedConfig;
  ports: PortsConfig;
  secrets: SecretsConfig;
}

export interface SharedConfig {
  JWT_SECRET_LENGTH: number;
  JWT_EXPIRES_IN: string;
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

// Type for the local override file, which can be partial
export type LocalConfig = {
  [key: string]: {
    secrets?: Partial<SecretsConfig>;
  };
};

export interface RunOptions {
  env?: string;
  testMode?: boolean;
}

// --- Helper Functions ---

const generateJwtSecret = (length: number): string => {
  return crypto.randomBytes(length).toString('hex')
}

const writeEnvFile = (serviceName: string, content: string): void => {
  const envPath = path.resolve(__dirname, '..', serviceName, '.env')
  fs.writeFileSync(envPath, content)
  console.log(`✅ Successfully generated .env for ${serviceName}`)
}

const handleError = (message: string, testMode = false): void => {
  console.error(message)
  if (!testMode) {
    process.exit(1)
  } else {
    throw new Error(message)
  }
}

// --- Main Logic ---

export const run = (options: RunOptions = {}): void => {
  const { env = 'development', testMode = false } = options
  console.log(`🚀 Starting environment synchronization for [${env}]...`)

  // 1. Read and parse base config.json
  const configPath = path.resolve(__dirname, 'config.json')
  let config: Config
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8')
    config = JSON.parse(configFile)
  } catch (error) {
    return handleError(`❌ Error reading or parsing config.json: ${error}`, testMode)
  }

  const envConfig = config[env]
  if (!envConfig) {
    return handleError(`❌ Environment [${env}] not found in config.json.`, testMode)
  }

  // 2. Read and merge local config for secrets
  const localConfigPath = path.resolve(__dirname, 'config.local.json')
  try {
    if (fs.existsSync(localConfigPath)) {
      const localConfigFile = fs.readFileSync(localConfigPath, 'utf-8')
      const localConfig: LocalConfig = JSON.parse(localConfigFile)
      if (localConfig[env]?.secrets) {
        envConfig.secrets = {
          ...envConfig.secrets,
          ...localConfig[env]?.secrets,
        }
        console.log(`🤫 Merged secrets from config.local.json for [${env}]`)
      }
    }
  } catch (error) {
    return handleError(`❌ Error reading or parsing config.local.json: ${error}`, testMode)
  }

  const { shared, ports, secrets } = envConfig

  // 3. Validate secrets
  if (!secrets.GOOGLE_CLIENT_ID || secrets.GOOGLE_CLIENT_ID.includes('your-google-client-id')) {
    return handleError('❌ GOOGLE_CLIENT_ID is missing or is a placeholder in config.', testMode)
  }
  if (!secrets.GOOGLE_CLIENT_SECRET || secrets.GOOGLE_CLIENT_SECRET.includes('your-google-client-secret')) {
    return handleError('❌ GOOGLE_CLIENT_SECRET is missing or is a placeholder in config.', testMode)
  }

  // 4. Generate shared secrets
  const jwtSecret = generateJwtSecret(shared.JWT_SECRET_LENGTH)
  console.log('🔑 Generated new JWT_SECRET.')

  // 5. Construct URLs from ports
  const collabFlowApiUrl = `http://localhost:${ports.collab_flow_api}`
  const googleOauthBackendUrl = `http://localhost:${ports.google_oauth_backend}`
  const syncForgeUrl = `http://localhost:${ports.sync_forge}`

  // 6. Generate .env content for each service
  const envContent = {
    'collab-flow-api': [
      `PORT=${ports.collab_flow_api}`,
      `NODE_ENV=${env}`,
      `GOOGLE_CLIENT_ID=${secrets.GOOGLE_CLIENT_ID}`,
      `JWT_SECRET=${jwtSecret}`,
      `JWT_EXPIRES_IN=${shared.JWT_EXPIRES_IN}`,
    ].join('\n'),
    'google-oauth-backend': [
      `PORT=${ports.google_oauth_backend}`,
      `NODE_ENV=${env}`,
      `CORS_ORIGIN=${syncForgeUrl}`,
      `COLLAB_FLOW_API_URL=${collabFlowApiUrl}`,
      `GOOGLE_CLIENT_ID=${secrets.GOOGLE_CLIENT_ID}`,
      `GOOGLE_CLIENT_SECRET=${secrets.GOOGLE_CLIENT_SECRET}`,
      `REDIRECT_URI=${syncForgeUrl}/auth/callback`,
      `JWT_SECRET=${jwtSecret}`,
      `JWT_EXPIRES_IN=${shared.JWT_EXPIRES_IN}`,
    ].join('\n'),
    'sync-forge': [
      `VITE_APP_TITLE=${shared.APP_TITLE}`,
      `VITE_GOOGLE_CLIENT_ID=${secrets.GOOGLE_CLIENT_ID}`,
      `VITE_AUTH_API_URL=${googleOauthBackendUrl}`,
      `VITE_GATEWAY_API_URL=${googleOauthBackendUrl}`,
      `VITE_RESOURCE_API_URL=${collabFlowApiUrl}`,
    ].join('\n'),
  }

  // 7. Write the files
  try {
    writeEnvFile('collab-flow-api', envContent['collab-flow-api'])
    writeEnvFile('google-oauth-backend', envContent['google-oauth-backend'])
    writeEnvFile('sync-forge', envContent['sync-forge'])
  } catch(error) {
    return handleError(`❌ Error writing .env files: ${error}`, testMode)
  }


  console.log('✨ Environment synchronization complete!')
}

// --- Main Execution ---
const main = () => {
  const args = process.argv.slice(2)
  const envArg = args.find(arg => arg.startsWith('--env='))
  const env = envArg ? envArg.split('=')[1] : 'development'
  
  run({ env, testMode: false })
}

if (require.main === module) {
  main()
}