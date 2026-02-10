# Deployment

## Vercel (Recommended)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgk-platform/cgk)

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

Set these in your Vercel project settings:

- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `REDIS_URL` - Redis connection string (Upstash)
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption secret
- All Shopify and Stripe keys

## Database Setup

### Neon PostgreSQL

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Set as `DATABASE_URL` environment variable
4. Run migrations:

```bash
npx @cgk/cli migrate
```

## Cache Setup

### Upstash Redis

1. Create an Upstash database at [upstash.com](https://upstash.com)
2. Copy the Redis URL
3. Set as `REDIS_URL` environment variable

## Post-Deployment

```bash
# Verify deployment
npx @cgk/cli doctor

# Run migrations
npx @cgk/cli migrate

# Create admin user
npx @cgk/cli setup --admin
```
