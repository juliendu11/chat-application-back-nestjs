## Description

Backend with NestJS + Graphql + Typescript + Docker for a real-time chat application. The application aims to add a "big" real projects for my portfolio.

<a href="https://github.com/juliendu11/chat-application-front-vue3">Go to Frontend part</a>
## Installing

<b>You need to create an .env file at the root with the values found in the .env.example file</b>

The backend uses docker and docker-compose in order to package all dependencies (MongoDB, Redis) you can launch the project just with this command:

```bash
$ npm run docker:dev
```
You have access to MongoDB and Redis port

## Production

Run this command to launch in production mode:

```bash
$ npm run docker:prod
```

## Features

- [X] Login/Register/Forgot Password/Reset Password
- [X] Send mail for confirm account and password management
- [/] Refresh token (with 2 week validity)
- [X] Room management (create, send message)
- [X] Conversation management (view conv, send message, subscription when new message)
- [X] Sending images
- [X] Sending videos
- [ ] Sending vocal
- [ ] Direct cam visio
- [X] Contacts management (online, offline list with subscription)
- [X] Update profil image
- [ ] Option for sub message room
- [ ] Push notification PWA

- [ ] Unit tests
- [ ] Integrations tests
