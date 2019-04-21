FROM node:8
WORKDIR .
COPY test_subject/package.json .
RUN npm install
ADD test_subject .
CMD [ "npm", "start" ]

