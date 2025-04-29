# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the code
COPY . .

# Install PM2 globally
RUN npm install -g pm2

# Expose the port (default 3000)
EXPOSE 3000

# Use a PM2 ecosystem file or start both processes manually
CMD ["pm2-runtime", "start", "ecosystem.config.js"] 