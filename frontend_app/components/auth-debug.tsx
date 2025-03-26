"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { loginUser } from "@/lib/api"
import { LOGIN_API } from "@/lib/apiConstants"
import { refreshToken, storeCredentialsForRefresh, clearStoredCredentials } from "@/lib/token-refresh"

export function AuthDebug() {
    const [token, setToken] = useState<string | null>(null)
    const [tokenStatus, setTokenStatus] = useState<"valid" | "invalid" | "checking" | "unknown">("unknown")
    const [email, setEmail] = useState("me@test.com")
    const [password, setPassword] = useState("123456")
    const [rememberCredentials, setRememberCredentials] = useState(false)
    const [hasStoredCredentials, setHasStoredCredentials] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Get current token from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem("token")
        setToken(storedToken)

        // Check if we have stored credentials
        const hasCredentials = !!(localStorage.getItem("auth_email") && localStorage.getItem("auth_password"))
        setHasStoredCredentials(hasCredentials)

        if (storedToken) {
            checkToken(storedToken)
        }
    }, [])

    // Check if token is valid by making a test API call
    const checkToken = async (tokenToCheck: string) => {
        setTokenStatus("checking")
        try {
            const response = await fetch(LOGIN_API.replace('/login', '/categories'), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenToCheck}`,
                },
            })

            if (response.ok) {
                setTokenStatus("valid")
            } else {
                setTokenStatus("invalid")
            }
        } catch (err) {
            console.error("Error checking token:", err)
            setTokenStatus("invalid")
        }
    }

    // Manually log in to get a new token
    const handleLogin = async () => {
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const result = await loginUser(email, password)
            if (result.status === 401) {
                throw new Error(result.message || "Invalid credentials")
            }
            if (!result.access_token) {
                throw new Error("No access token received")
            }

            // Save the token to localStorage
            localStorage.setItem('token', result.access_token)
            setToken(result.access_token)

            // Check if the token is valid
            await checkToken(result.access_token)

            // Store credentials if option is selected
            if (rememberCredentials) {
                storeCredentialsForRefresh(email, password)
                setHasStoredCredentials(true)
                setSuccessMessage("Login successful. Credentials stored for auto-refresh.")
            } else {
                setSuccessMessage("Login successful")
            }

            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during login")
            setTokenStatus("invalid")
        } finally {
            setLoading(false)
        }
    }

    // Manually clear the token
    const handleClearToken = () => {
        localStorage.removeItem('token')
        setToken(null)
        setTokenStatus("unknown")
        setSuccessMessage("Token cleared successfully")
    }

    // Try to refresh the token
    const handleRefreshToken = async () => {
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const result = await refreshToken()
            if (result.success && result.token) {
                setToken(result.token)
                await checkToken(result.token)
                setSuccessMessage("Token refreshed successfully")
            } else {
                throw new Error(result.message || "Failed to refresh token")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while refreshing token")
        } finally {
            setLoading(false)
        }
    }

    // Clear stored credentials
    const handleClearCredentials = () => {
        clearStoredCredentials()
        setHasStoredCredentials(false)
        setSuccessMessage("Stored credentials have been cleared")
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Authentication Debug</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Current Token Status</h3>
                    {tokenStatus === "checking" ? (
                        <p>Checking token validity...</p>
                    ) : tokenStatus === "valid" ? (
                        <Alert>
                            <AlertTitle>Valid Token</AlertTitle>
                            <AlertDescription>
                                Your authentication token is valid. You should be able to use the prompt management features.
                            </AlertDescription>
                        </Alert>
                    ) : tokenStatus === "invalid" ? (
                        <Alert variant="destructive">
                            <AlertTitle>Invalid Token</AlertTitle>
                            <AlertDescription>
                                Your authentication token is invalid or expired. Please log in again.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert variant="destructive">
                            <AlertTitle>No Token Found</AlertTitle>
                            <AlertDescription>
                                No authentication token found. Please log in.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="p-4 border rounded-md overflow-auto max-h-24">
                    <code className="text-xs break-all">{token || "No token found"}</code>
                </div>

                {successMessage && (
                    <Alert>
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Manual Login</h3>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            checked={rememberCredentials}
                            onCheckedChange={(checked) => {
                                setRememberCredentials(checked === true)
                            }}
                        />
                        <Label htmlFor="remember" className="text-sm">
                            Store credentials for token auto-refresh (for debugging only)
                        </Label>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleLogin} disabled={loading}>
                            {loading ? "Logging In..." : "Get New Token"}
                        </Button>
                        <Button variant="outline" onClick={handleClearToken}>
                            Clear Token
                        </Button>
                        {hasStoredCredentials && (
                            <>
                                <Button variant="outline" onClick={handleRefreshToken} disabled={loading}>
                                    {loading ? "Refreshing..." : "Refresh Token"}
                                </Button>
                                <Button variant="destructive" onClick={handleClearCredentials}>
                                    Clear Stored Credentials
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 