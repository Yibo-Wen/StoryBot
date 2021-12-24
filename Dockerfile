FROM node:lts-alpine
ENV NODE_ENV=production
ENV DF_PROJECT_ID=storybot-uerv
ENV DF_SERVICE_ACCOUNT_PATH=C:\Users\Administrator\Desktop\StoryBot\resources\storybot-uerv-b9b8d9b607ee.json
ENV PORT = 3030
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["node", "app.js"]
