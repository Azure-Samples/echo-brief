import { AuthDebug } from "@/components/auth-debug"

export default function AuthDebugPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Authentication Debug Tool</h1>
            <p className="mb-4 text-muted-foreground">
                Use this tool to diagnose authentication issues with the Prompt Management system.
            </p>
            <AuthDebug />
        </div>
    )
} 