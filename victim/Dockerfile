FROM alpine

# Install curl and bind-tools at build time so runtime DNS and internet are not required
RUN apk add --no-cache curl bind-tools

# Copy the victim simulation script
COPY simulate.sh /simulate.sh
RUN chmod +x /simulate.sh

CMD ["/simulate.sh"]
