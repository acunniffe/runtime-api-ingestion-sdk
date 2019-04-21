FROM node:8
WORKDIR .
COPY test_subject/package.json .
RUN npm install
ENV OPTIC_SERVER_LISTENING=TRUE
ENV OPTIC_SERVER_HOST=testhost
ADD test_subject .
CMD [ "npm", "start" ]

