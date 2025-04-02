"use client"

import { Inter } from 'next/font/google'
import "./globals.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useEffect } from 'react'

const inter = Inter({ subsets: ["latin"] })

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)

    const handleStorageChange = () => {
      const updatedToken = localStorage.getItem('token')
      setIsAuthenticated(!!updatedToken)
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
          integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.className} flex flex-col h-screen`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              <div className="flex flex-1">
                <AppSidebar>
                  {/* You can add any content that should go inside the sidebar */}
                </AppSidebar>
                <main className="flex-1 overflow-y-auto">
                  <div className="container mx-auto p-4">
                    <div className="flex justify-end mb-4">
                      <ThemeToggle />
                    </div>
                    {children}
                  </div>
                </main>
              </div>
              <Toaster />
           
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}