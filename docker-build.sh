#!/bin/bash

# Patient Outcome Frontend Docker Build and Deploy Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
PORT="5173"
IMAGE_NAME="patientoutcome-frontend"
CONTAINER_NAME="patientoutcome-frontend"

# Help function
show_help() {
    echo -e "${BLUE}Patient Outcome Frontend Docker Management Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build-prod     Build production Docker image"
    echo "  build-dev      Build development Docker image"
    echo "  run-prod       Run production container"
    echo "  run-dev        Run development container"
    echo "  stop           Stop running containers"
    echo "  clean          Clean up containers and images"
    echo "  logs           Show container logs"
    echo "  help           Show this help message"
    echo ""
    echo "Options:"
    echo "  -p, --port     Port to expose (default: 5173 for prod, 5173 for dev)"
    echo "  -n, --name     Container name (default: patientoutcome-frontend)"
    echo ""
    echo "Examples:"
    echo "  $0 build-prod"
    echo "  $0 run-prod -p 3000"
    echo "  $0 run-dev"
    echo "  $0 logs"
}

# Parse command line arguments
COMMAND="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -n|--name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Build production image
build_prod() {
    echo -e "${BLUE}Building production Docker image...${NC}"
    docker build -t ${IMAGE_NAME}:latest .
    echo -e "${GREEN}Production image built successfully!${NC}"
}

# Build development image
build_dev() {
    echo -e "${BLUE}Building development Docker image...${NC}"
    docker build -f Dockerfile.dev -t ${IMAGE_NAME}:dev .
    echo -e "${GREEN}Development image built successfully!${NC}"
}

# Run production container
run_prod() {
    echo -e "${BLUE}Starting production container on port ${PORT}...${NC}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${PORT}:80 \
        --restart unless-stopped \
        ${IMAGE_NAME}:latest
    echo -e "${GREEN}Production container started successfully!${NC}"
    echo -e "${YELLOW}Access your application at: http://localhost:${PORT}${NC}"
}

# Run development container
run_dev() {
    DEV_PORT=${PORT:-5173}
    echo -e "${BLUE}Starting development container on port ${DEV_PORT}...${NC}"
    docker run -d \
        --name ${CONTAINER_NAME}-dev \
        -p ${DEV_PORT}:5173 \
        -v "$(pwd):/app" \
        -v /app/node_modules \
        ${IMAGE_NAME}:dev
    echo -e "${GREEN}Development container started successfully!${NC}"
    echo -e "${YELLOW}Access your application at: http://localhost:${DEV_PORT}${NC}"
}

# Stop containers
stop_containers() {
    echo -e "${BLUE}Stopping containers...${NC}"
    docker stop ${CONTAINER_NAME} 2>/dev/null || echo "Production container not running"
    docker stop ${CONTAINER_NAME}-dev 2>/dev/null || echo "Development container not running"
    docker rm ${CONTAINER_NAME} 2>/dev/null || echo "Production container already removed"
    docker rm ${CONTAINER_NAME}-dev 2>/dev/null || echo "Development container already removed"
    echo -e "${GREEN}Containers stopped and removed!${NC}"
}

# Clean up
clean_up() {
    echo -e "${BLUE}Cleaning up containers and images...${NC}"
    stop_containers
    docker rmi ${IMAGE_NAME}:latest 2>/dev/null || echo "Production image not found"
    docker rmi ${IMAGE_NAME}:dev 2>/dev/null || echo "Development image not found"
    docker system prune -f
    echo -e "${GREEN}Cleanup completed!${NC}"
}

# Show logs
show_logs() {
    echo -e "${BLUE}Showing container logs...${NC}"
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        docker logs -f ${CONTAINER_NAME}
    elif docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}-dev$"; then
        docker logs -f ${CONTAINER_NAME}-dev
    else
        echo -e "${RED}No running containers found!${NC}"
        exit 1
    fi
}

# Main command handling
case ${COMMAND} in
    build-prod)
        build_prod
        ;;
    build-dev)
        build_dev
        ;;
    run-prod)
        build_prod
        run_prod
        ;;
    run-dev)
        build_dev
        run_dev
        ;;
    stop)
        stop_containers
        ;;
    clean)
        clean_up
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: ${COMMAND}${NC}"
        show_help
        exit 1
        ;;
esac
