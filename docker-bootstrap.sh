#!/bin/sh
npx -y prisma migrate deploy
node server.js
