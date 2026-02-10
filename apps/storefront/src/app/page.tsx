export default function Home(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-16">
      <section className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome to the Store
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Discover our amazing products
        </p>
        <div className="mt-8">
          <a
            href="/products"
            className="rounded-md bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Shop Now
          </a>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-2xl font-bold mb-8">Featured Products</h2>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-lg border p-4 text-center text-muted-foreground">
            Configure your Shopify store to see products here
          </div>
        </div>
      </section>
    </div>
  )
}
