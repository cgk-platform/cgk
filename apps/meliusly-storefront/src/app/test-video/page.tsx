import { ProductVideo } from '@/components/pdp'

export default function TestVideoPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <ProductVideo
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
        title="Watch Installation"
      />
    </main>
  )
}
