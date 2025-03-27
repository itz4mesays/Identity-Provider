FROM node:20-bookworm-slim

# Install build tools and Python
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Rebuild native dependencies
RUN npm install --force

# Alternative: If using bcryptjs instead
# RUN npm uninstall bcrypt && npm install bcryptjs

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4015

CMD ["npm", "run", "dev"]