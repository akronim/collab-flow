// Token endpoint response: https://oauth2.googleapis.com/token
export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: `Bearer`;
  scope: string;
  refresh_token?: string; // Only included on first auth or when access_type=offline
  id_token?: string; // Only if openid scope requested
}

// UserInfo endpoint response: https://www.googleapis.com/oauth2/v2/userinfo
export interface UserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  hd?: string; // Hosted domain (for G Suite accounts)
  link?: string; // Profile link (deprecated/optional)
  gender?: string; // Optional field
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserInfo
    }
  }
}
