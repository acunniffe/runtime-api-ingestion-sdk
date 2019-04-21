FROM node:8
WORKDIR .
# Copy manifest / lock files over first for better build caching
COPY package.json .
COPY package-lock.json .
RUN npm install

# Always set these two ENV variables for the container
ENV OPTIC_SERVER_LISTENING=TRUE
ENV OPTIC_SERVER_HOST=testhost

COPY . .

# Command to start echo server
CMD [ "npm", "start" ]

