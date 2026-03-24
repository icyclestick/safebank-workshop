FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config and HTML
COPY nginx.conf /etc/nginx/conf.d/
COPY html/ /usr/share/nginx/html/
