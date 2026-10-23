FROM oven/bun:1

WORKDIR /app

# Install production dependencies first for better layer caching
COPY package.json ./
RUN bun install --production

# Copy application source
COPY . .

# Prepare cache directory for calendar events and fix ownership
RUN mkdir -p events && chown -R bun:bun /app
USER bun

ENV PORT=3000
EXPOSE 3000

# Calendar cache is persisted here
VOLUME ["/app/events"]

CMD ["bun", "server.ts"]
