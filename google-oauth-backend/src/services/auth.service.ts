import { googleApi } from '../utils/axios';
import { GoogleOAuthEndpoints, ErrorMessages } from '../constants';
import config from '../config';

export const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    const params = new URLSearchParams({
        client_id: config.google.clientId!,
        client_secret: config.google.clientSecret!,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
    });

    try {
        const response = await googleApi.post(
            GoogleOAuthEndpoints.TOKEN_EXCHANGE,
            params.toString()
        );
        return response.data;
    } catch (error: any) {
        console.error(`${ErrorMessages.TOKEN_EXCHANGE_FAILED}:`, error.response?.data || error.message);
        throw error; 
    }
};

export const refreshAccessToken = async (refreshToken: string) => {
    const params = new URLSearchParams({
        client_id: config.google.clientId!,
        client_secret: config.google.clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    try {
        const response = await googleApi.post(
            GoogleOAuthEndpoints.TOKEN_EXCHANGE,
            params.toString()
        );
        return response.data;
    } catch (error: any) {
        console.error(`${ErrorMessages.REFRESH_FAILED}:`, error.response?.data || error.message);
        throw error; 
    }
};

export const validateAccessToken = async (accessToken: string) => {
    try {
        const response = await googleApi.get(GoogleOAuthEndpoints.USER_INFO, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error(`${ErrorMessages.TOKEN_VALIDATION_FAILED}:`, error.response?.data || error.message);
        throw error; 
    }
};
