import { LOGIN_API } from "./apiConstants";

interface TokenRefreshResponse {
    success: boolean;
    token?: string;
    message?: string;
}

/**
 * Attempts to refresh the authentication token using stored credentials
 * 
 * @returns An object with success status, new token (if successful), and message
 */
export async function refreshToken(): Promise<TokenRefreshResponse> {
    // Check if we have stored credentials
    const storedEmail = localStorage.getItem("auth_email");
    const storedPassword = localStorage.getItem("auth_password");

    if (!storedEmail || !storedPassword) {
        return {
            success: false,
            message: "No stored credentials found for automatic refresh"
        };
    }

    try {
        console.log("Attempting to refresh token with stored credentials");

        const response = await fetch(LOGIN_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: storedEmail,
                password: storedPassword
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.access_token) {
            console.error("Token refresh failed:", data.message || "Unknown error");
            return {
                success: false,
                message: data.message || "Failed to refresh token"
            };
        }

        // Store the new token
        localStorage.setItem("token", data.access_token);
        console.log("Token refreshed successfully");

        return {
            success: true,
            token: data.access_token
        };
    } catch (error) {
        console.error("Error during token refresh:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error during token refresh"
        };
    }
}

/**
 * Stores credentials for future token refresh
 * Note: Only store this with user's explicit permission
 */
export function storeCredentialsForRefresh(email: string, password: string): void {
    localStorage.setItem("auth_email", email);
    localStorage.setItem("auth_password", password);
}

/**
 * Clears stored credentials
 */
export function clearStoredCredentials(): void {
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_password");
} 