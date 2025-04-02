"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Mic, FileAudio, FileText } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const menuItems = [
  { icon: Mic, label: 'Audio Upload', href: '/audio-upload' },
  { icon: FileAudio, label: 'Audio Recordings', href: '/audio-recordings' },
  { icon: FileText, label: 'Prompt Management', href: '/prompt-management' },
]

interface AppSidebarProps {
  children?: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(false) 
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    setIsLoading(false)

    if (!token && pathname !== '/login') {
      router.push('/login')
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    router.push('/login')
  }

  if (isLoading || !isAuthenticated || pathname === "/login") {
    return null
  }

  return (
    <div className="flex h-screen">
  
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-64" : "w-16"
        )}
      >
        <Button
          variant="ghost"
          className="absolute top-4 -right-4 z-50 h-8 w-8 rounded-full bg-gray-800 p-0 hover:bg-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
        {isOpen ? '<' : '>'}
        </Button>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center">
            <div className="rounded-full bg-white p-2">
              <Mic className="h-8 w-8 text-gray-900" />
            </div>
          </div>
          <nav className="flex-1 space-y-2 p-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg p-2 transition-colors hover:bg-gray-800",
                  pathname === item.href && "bg-gray-800"
                )}
              >
                <item.icon className="h-5 w-5" />
                {isOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {isOpen && <span className="ml-3">Logout</span>}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out p-6",
          isOpen ? "ml-64" : "ml-16"
        )}
      >
        {children}
      </div>
    </div>
  )
}
