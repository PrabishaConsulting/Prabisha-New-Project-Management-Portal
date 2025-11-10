# Dummy Dockerfile — MySQL runs from Docker Compose directly
FROM alpine:latest

# Optional label for clarity
LABEL maintainer="admin@prabisha.com"

# This Dockerfile is just a placeholder so Docker Desktop doesn't complain.
CMD ["echo", "MySQL is managed via docker compose. No build required."]
