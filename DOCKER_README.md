# Patient Outcome Frontend - Docker Deployment

This guide explains how to build and deploy the Patient Outcome Frontend using Docker with Node.js v24.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Quick Start

### Option 1: Using the Build Script (Recommended)

```bash
# Make the script executable (if not already done)
chmod +x docker-build.sh

# Build and run production container
./docker-build.sh run-prod

# Build and run development container
./docker-build.sh run-dev

# Stop containers
./docker-build.sh stop

# View logs
./docker-build.sh logs

# Clean up everything
./docker-build.sh clean
```

### Option 2: Using Docker Commands Directly

#### Production Build

```bash
# Build the production image
docker build -t patientoutcome-frontend:latest .

# Run the production container
docker run -d \
  --name patientoutcome-frontend \
  -p 8080:80 \
  --restart unless-stopped \
  patientoutcome-frontend:latest
```

#### Development Build

```bash
# Build the development image
docker build -f Dockerfile.dev -t patientoutcome-frontend:dev .

# Run the development container
docker run -d \
  --name patientoutcome-frontend-dev \
  -p 5173:5173 \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  patientoutcome-frontend:dev
```

### Option 3: Using Docker Compose

#### Production

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

#### Development

```bash
# Start the development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop the development environment
docker-compose -f docker-compose.dev.yml down
```

## Configuration

### Environment Variables

You can customize the deployment using environment variables:

- `NODE_ENV`: Set to `production` or `development`
- `VITE_HOST`: Host binding for Vite dev server (development only)

### Ports

- **Production**: Port 8080 (maps to container port 80)
- **Development**: Port 5173 (maps to container port 5173)

You can change the exposed port using the build script:

```bash
# Run on a different port
./docker-build.sh run-prod -p 3000
```

## Docker Images

### Production Image Features

- **Base**: Node.js 24 Alpine Linux
- **Web Server**: Nginx for optimal static file serving
- **Size**: Optimized multi-stage build for minimal image size
- **Security**: Security headers and optimized nginx configuration
- **Health Check**: Built-in health monitoring
- **Caching**: Optimized asset caching for better performance

### Development Image Features

- **Base**: Node.js 24 Alpine Linux
- **Hot Reload**: Live reloading during development
- **Volume Mounting**: Source code mounted for instant changes
- **Debug Tools**: Development dependencies included

## File Structure

```
├── Dockerfile              # Production multi-stage build
├── Dockerfile.dev          # Development environment
├── docker-compose.yml      # Production compose file
├── docker-compose.dev.yml  # Development compose file
├── nginx.conf              # Nginx configuration for production
├── .dockerignore           # Files to exclude from Docker context
├── docker-build.sh         # Management script
└── DOCKER_README.md        # This file
```

## Production Deployment

### Build Arguments

The Dockerfile supports standard Node.js build processes:

1. **Dependencies**: Installs only production dependencies in the final image
2. **Build Process**: Runs `npm run build` to create optimized production build
3. **Static Serving**: Uses nginx to serve the built static files
4. **Security**: Includes security headers and proper nginx configuration

### Health Checks

The production container includes health checks:

- **Endpoint**: `http://localhost/health`
- **Interval**: Every 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3 attempts

### Nginx Configuration

The nginx configuration includes:

- **SPA Support**: Proper routing for Vue.js single-page application
- **Compression**: Gzip compression for better performance
- **Caching**: Optimized caching headers for static assets
- **Security**: Security headers to protect against common attacks
- **API Proxy**: Commented configuration for API proxying (if needed)

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo lsof -i :8080
   
   # Use a different port
   ./docker-build.sh run-prod -p 8081
   ```

2. **Container Won't Start**
   ```bash
   # Check container logs
   ./docker-build.sh logs
   
   # Or use docker directly
   docker logs patientoutcome-frontend
   ```

3. **Development Hot Reload Not Working**
   ```bash
   # Ensure volume mounting is working
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

### Useful Commands

```bash
# View running containers
docker ps

# Access container shell
docker exec -it patientoutcome-frontend sh

# View container resource usage
docker stats patientoutcome-frontend

# Remove all containers and images
./docker-build.sh clean
```

## Performance Optimization

The Docker setup includes several optimizations:

- **Multi-stage builds** to reduce final image size
- **Layer caching** for faster rebuilds
- **Nginx compression** for smaller transfer sizes
- **Asset caching** for better client-side performance
- **Health checks** for reliable deployments

## Security Considerations

- Uses official Node.js Alpine images for security updates
- Includes security headers in nginx configuration
- Runs with non-root user where possible
- Excludes development files from production image

## Integration with CI/CD

This setup is ready for CI/CD integration. You can use the Dockerfile in your build pipelines:

```bash
# In your CI/CD pipeline
docker build -t your-registry/patientoutcome-frontend:${BUILD_NUMBER} .
docker push your-registry/patientoutcome-frontend:${BUILD_NUMBER}
```
