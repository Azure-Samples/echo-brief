import { RecordingDetailsPageWrapper } from "@/components/audio-recordings/recording-details-page-wrapper";

export async function generateStaticParams() {
  return [{ slug: ['job_placeholder_123456789'] }];
}

/**
 * Catch-all route handler for audio recordings.
 * This allows for more flexible URL patterns beyond the basic [id] route.
 * 
 * @param params - Contains the slug array from the URL path
 */
export default function Page({ params }: { params: { slug: string[] } }) {
  const id = params.slug[0];
  return <RecordingDetailsPageWrapper id={id} />;
} 