import { RecordingDetailsPageWrapper } from "@/components/audio-recordings/recording-details-page-wrapper";

/**
 * This function is required for Next.js static export with dynamic routes.
 * 
 * When using `output: 'export'` in next.config.js, Next.js requires all possible
 * dynamic route parameters to be known at build time. Since our application deals
 * with dynamically created audio recording IDs, we provide placeholder IDs here
 * to satisfy this requirement.
 * 
 * For a static export, we need to pre-generate a set of placeholder routes.
 * In a real production environment, you would replace these with actual IDs
 * from your database or API.
 */
export async function generateStaticParams() {
  // For static export, we'll generate a set of placeholder IDs
  // In a real app, you could fetch actual IDs from your API at build time
  return [
    { id: 'job_placeholder_123456789' },
    { id: 'job_placeholder_987654321' },
    { id: 'job_placeholder_135792468' },
    { id: 'job_placeholder_246813579' },
    { id: 'job_placeholder_111222333' },
    { id: 'job_placeholder_444555666' },
    { id: 'job_placeholder_777888999' },
    { id: 'job_placeholder_123123123' },
    { id: 'job_placeholder_456456456' },
    { id: 'job_placeholder_789789789' },
  ];
}

/**
 * In a static export, dynamicParams must be set to false.
 * This tells Next.js to only pre-render the paths returned by generateStaticParams.
 * Any other paths will show a 404 page.
 */
export const dynamicParams = false;

/**
 * The main page component for displaying details of a specific audio recording.
 * This component receives the dynamic route parameter (id) and passes it to
 * the client component that handles the data fetching and rendering.
 * 
 * Since this is a static export, the actual data fetching happens client-side
 * after the page loads.
 */
export default function Page({ params }: { params: { id: string } }) {
  return <RecordingDetailsPageWrapper id={params.id} />;
} 