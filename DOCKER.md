# Docker Development Guide

CGK provides Docker configuration for both **local development** (docker-compose) and **production deployment** (Dockerfile).

## Local Development with Docker Compose

The `docker-compose.yml` provides a complete local development environment with PostgreSQL and Redis.

### Services Included

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL 17** | 5432 | Multi-tenant database |
| **Redis 8** | 6379 | Cache and session store |
| **Adminer** | 8080 | Web-based database admin UI |

### Quick Start

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Database Connection

Once running, use this connection string in your `.env.local`:

```bash
POSTGRES_URL=postgresql://cgk:cgk@localhost:5432/cgk
```

**Credentials** (configured in `docker-compose.yml`):
- User: `cgk`
- Password: `cgk`
- Database: `cgk`

### Redis Connection

```bash
# Via KV_REST_API (if using Upstash SDK)
KV_REST_API_URL=redis://localhost:6379

# Or direct connection
REDIS_URL=redis://localhost:6379
```

### Adminer Web UI

Access the database admin interface at: **http://localhost:8080**

Login with:
- System: `PostgreSQL`
- Server: `db`
- Username: `cgk`
- Password: `cgk`
- Database: `cgk`

### Persistent Data

Data is stored in Docker volumes:
- `cgk_postgres_data` - Database files
- `cgk_redis_data` - Redis persistence

To reset the database:

```bash
docker-compose down -v  # ⚠️ Deletes all data
docker-compose up -d
pnpm db:migrate         # Re-run migrations
```

## Production Deployment with Docker

The `Dockerfile` is optimized for production deployment (e.g., on Fly.io, Railway, or any container platform).

### Build Production Image

```bash
# Build the image
docker build -t cgk-platform .

# Run the container
docker run -p 3000:3000 \
  -e POSTGRES_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e SESSION_SECRET="..." \
  cgk-platform
```

### Multi-Stage Build

The Dockerfile uses a multi-stage build:

1. **base** - Install dependencies
2. **builder** - Build all packages
3. **runner** - Minimal production image (Alpine Linux)

### Environment Variables

When deploying with Docker, you **must** provide:

```bash
# Required
POSTGRES_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-here
SESSION_SECRET=your-secret-here
NODE_ENV=production

# Optional (recommended)
KV_REST_API_URL=https://your-redis.upstash.io
KV_REST_API_TOKEN=your-token

# App-specific
APP_URL=https://yourdomain.com
```

### Build Arguments

You can customize the build:

```bash
# Build specific apps only
docker build --build-arg APPS="admin orchestrator" -t cgk-platform .

# Use different Node version
docker build --build-arg NODE_VERSION=22.1.0 -t cgk-platform .
```

## Docker Compose for Production

If you want to run the full stack with Docker Compose in production:

```bash
# Create a docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - POSTGRES_URL=postgresql://cgk:cgk@db:5432/cgk
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - KV_REST_API_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: cgk
      POSTGRES_PASSWORD: cgk
      POSTGRES_DB: cgk
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:8-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Then run:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Development Workflow

### Option 1: Docker for Services Only (Recommended)

Use Docker for PostgreSQL/Redis, but run the app locally:

```bash
# Start services
docker-compose up -d db redis

# Run app locally (faster hot-reload)
pnpm dev
```

**Pros:**
- Fast hot-reload
- Native debugging
- Familiar workflow

### Option 2: Full Docker Stack

Run everything in Docker:

```bash
# Start everything
docker-compose up -d

# Run migrations inside container
docker-compose exec db psql -U cgk -d cgk -f /migrations/...
```

**Pros:**
- Isolated environment
- Matches production exactly

**Cons:**
- Slower hot-reload
- More complex debugging

## Troubleshooting

### Port Conflicts

If ports 5432, 6379, or 8080 are in use:

```yaml
# Edit docker-compose.yml
services:
  db:
    ports:
      - "5433:5432"  # Use different host port
```

Then update your connection string:

```bash
POSTGRES_URL=postgresql://cgk:cgk@localhost:5433/cgk
```

### Database Connection Refused

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs db

# Restart services
docker-compose restart
```

### Clean Slate

```bash
# Stop everything and remove volumes
docker-compose down -v

# Remove dangling images
docker system prune -a

# Start fresh
docker-compose up -d
```

## When to Use Docker vs. Native

| Scenario | Recommendation |
|----------|----------------|
| **First-time setup** | Docker Compose (easiest) |
| **Daily development** | Native Postgres/Redis + `pnpm dev` (fastest) |
| **CI/CD** | Docker build + Dockerfile |
| **Production** | Dockerfile (Fly.io/Railway) or Vercel (serverless) |
| **Multi-developer team** | Docker Compose (consistency) |

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [CGK Deployment Guide](./docs/deployment.md) (if available)
