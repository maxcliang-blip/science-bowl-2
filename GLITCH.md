# Glitch Deployment Instructions

## Quick Setup

1. Go to **glitch.com** → Sign in with GitHub
2. Click **New Project** → **Import from GitHub**
3. Paste: `https://github.com/maxcliang-blip/science-bowl-2`
4. Wait for import

## Rename Files

In Glitch editor:

1. **Rename `glitch-server.mjs`** → `server.js`
2. **Create folder `public`** 
3. **Move contents of `dist` folder** → `public` folder

## Update package.json

Replace contents with:
```json
{
  "name": "science-bowl-2",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

## Delete Extra Files

- Delete `render.yaml`
- Delete `package-glitch.json`
- Delete `pnpm-lock.yaml`
- Delete the empty `dist` folder

## Show App

Click **Show** button in top-left to view your app.
