/**
 * Reviews Section (Home Page)
 *
 * Displays aggregated review stats and featured review highlights.
 * Matches Liquid's section-reviews.liquid on the home page.
 */

const FEATURED_REVIEWS = [
  {
    author: 'Lauren K.',
    rating: 5,
    title: 'Best sheets I\'ve ever owned!',
    body: "I don't normally write reviews unless something is either really good or terrible. These sheets are AMAZING!! They are so soft & very comfortable.",
  },
  {
    author: 'Sara T.',
    rating: 5,
    title: 'Found at a vacation rental',
    body: 'Found these sheets while staying at a vacation rental. Never have we slept so good. Came home and ordered a set.',
  },
  {
    author: 'Aria W.',
    rating: 5,
    title: 'Soft and luxurious',
    body: 'I love these sheets! They are so soft and luxurious and wash up perfectly. Nice and cooling in the summer.',
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-cgk-gold' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function ReviewsSection() {
  return (
    <section className="bg-cgk-light-blue/20 py-16">
      <div className="mx-auto max-w-store px-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <StarRating rating={5} />
            <span className="text-sm font-medium text-gray-600">4.8 out of 5</span>
          </div>
          <h2 className="text-2xl font-bold text-cgk-navy">
            Loved by Over 50,000 Happy Sleepers
          </h2>
          <p className="mt-2 text-gray-600">
            See what our customers are saying about CGK Linens
          </p>
        </div>

        {/* Featured Reviews Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURED_REVIEWS.map((review) => (
            <div
              key={review.author}
              className="rounded-lg bg-white p-6 shadow-sm"
            >
              <StarRating rating={review.rating} />
              <h3 className="mt-3 font-semibold text-cgk-navy">{review.title}</h3>
              <p className="mt-2 text-sm text-gray-600 line-clamp-3">{review.body}</p>
              <p className="mt-3 text-xs font-medium text-gray-500">&mdash; {review.author}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <a
            href="/collections/featured#reviews"
            className="inline-block rounded-btn bg-cgk-navy px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-cgk-navy/90"
          >
            Write a Review
          </a>
        </div>
      </div>
    </section>
  )
}
