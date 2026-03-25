FROM alpine

# Install curl and bind-tools at build time so runtime DNS and internet are not required
RUN apk add --no-cache curl bind-tools

# Entrypoint script will be provided via command in docker-compose.yml
CMD ["sh"]
