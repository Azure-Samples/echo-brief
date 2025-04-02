import { NextPage } from 'next'
import Head from 'next/head'

interface ErrorProps {
  statusCode?: number
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Head>
        <title>Error {statusCode || 'Unknown'}</title>
      </Head>
      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <h1 className="text-6xl font-bold">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </h1>
        <p className="mt-3 text-2xl">
          We apologize for the inconvenience.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white"
          >
            Return Home
          </a>
        </div>
      </main>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error 