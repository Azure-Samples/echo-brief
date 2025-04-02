import Link from 'next/link'
import Head from 'next/head'

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>Page Not Found - 404</title>
      </Head>
      <main className="flex w-full flex-1 flex-col items-center justify-center px-5 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
        <p className="mt-3 text-2xl text-gray-700 dark:text-gray-300">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-md">
          The page might have been moved, deleted, or never existed. Let's get you back on track.
        </p>
        <div className="mt-8 flex space-x-4">
          <Link href="/" className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            Return Home
          </Link>
          <Link href="/audio-recordings" className="rounded-md bg-gray-200 dark:bg-gray-700 px-5 py-2.5 text-sm font-medium text-gray-900 dark:text-white shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600">
            View Recordings
          </Link>
        </div>
      </main>
      <footer className="w-full py-6 text-center text-gray-500 dark:text-gray-400">
        <p>© Echo Brief. All rights reserved.</p>
      </footer>
    </div>
  )
} 