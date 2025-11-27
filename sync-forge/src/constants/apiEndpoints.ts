export const googleOAuthEndpoints = {
  AUTH_URL: `https://accounts.google.com/o/oauth2/v2/auth`,
  REVOKE_URL: `https://oauth2.googleapis.com/revoke`,
  FAVICON_URL: `https://www.google.com/favicon.ico`
}

// TODO: rename to GoogleOAuthApiEndpoints
export const ApiEndpoints = {
  AUTH_TOKEN: `/api/auth/token`,
  AUTH_VALIDATE: `/api/auth/validate`,
  AUTH_REFRESH: `/api/auth/refresh`
} as const

export const CollabFlowApiEndpoints = {
  PROJECTS: `/api/projects`,
  PROJECT_BY_ID: (id: string) => `/api/projects/${id}`,

  TASKS: `/api/tasks`,
  TASK_BY_ID: (id: string) => `/api/tasks/${id}`,
  
  USERS: `/api/users`,
  USER_BY_ID: (id: string) => `/api/users/${id}`
} as const
