# Sweep Brawl: running and deploying

## Run locally

Install [Node.js](https://nodejs.org/) 22 or newer. Open a terminal in this folder:

```sh
npm install
npm start
```

Open **http://localhost:3000**. Keep the terminal running. Future runs only need `npm start`.

- **Solo:** choose Create room. Set your timer and preparation time, then Start item draft. The same route works for bots and friends.
- **Bots:** add up to four in the lobby. Set each name’s difficulty to green Easy, orange Normal or red Hard. Bots use items, deduction, private flags and shared bluffs without consulting the hidden mine map.
- **Friends:** create a room and copy Invite. Everyone uses a different name. The host starts the draft. The round begins when all connected human participants have chosen three cards.
- **Settings:** 3 or 5 rounds; timer of 10-60 seconds or untimed; preparation of 0, 3, 5 or 10 seconds; 1-10 hearts or unlimited; Easy, Normal, Hard or Extreme boards. Board dimensions and mine counts increase by round.
- **Reveal:** tap any hidden cell on your turn. The first clear opens at least a safe 2 × 2 block, sometimes with a larger cascade, and earns 15 points plus its cascade points.
- **Mouse & flags:** left-click uses the selected Reveal/Flag option; right-click uses the opposite. Press **F** to swap them and **V** to swap private/shared flags. Fresh profiles default to Private; saved explicit choices persist. Touch can hold a tile for 500 ms. Flags can be placed while waiting; owner dots stack under each visibility icon.
- **Timeout:** your turn is skipped for 0 points. No cell is opened and no life is lost.
- **Lives:** mines cost one life. The last living player automatically wins a multiplayer round; solo continues until the board is clear or all lives are used. The overall game winner has the most points.
- **Room controls:** change your color in the lobby. The host can remove another player. Leaving transfers the host controls to the next connected human.
- **Music:** press Music, then Play music for an original synthesized loop. Draft and board phases add separate instruments with smooth crossfades; lobby/results keep the original base. Adjust volume or select an audio file from your device. A selected file plays locally and is not uploaded or shared. To bundle one track for everyone, add a licensed audio asset to `public/`, add its route in `server.js`, and use it as the default in `public/audio.js`.
- **How to play:** available from every screen, with scoring, item descriptions, and a mine-number example that changes every 5 seconds. The example never represents the real board.

`localhost` is only available on the computer running the server. Devices on the same Wi-Fi can use the computer's local network address on port 3000 if its firewall allows it. Use a public URL for different networks.

## Temporary public link

With `npm start` running, open a second terminal in this folder:

```sh
npm run share
```

On Windows x64 this downloads the official Cloudflare tunnel helper into the ignored `.tools/` folder and prints a public HTTPS URL. Share that URL; room invites use it automatically. On other systems, install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/), then run:

```sh
cloudflared tunnel --url http://localhost:3000
```

The computer must stay awake and both processes must keep running. The URL changes when the tunnel restarts, and Quick Tunnels have no uptime guarantee. Use lasting hosting for a contest submission. [Cloudflare Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## GitHub and lasting deployment

GitHub hosts the source; **Render runs the multiplayer server**. GitHub Pages cannot run this Node backend.

1. Create a repository on [GitHub](https://github.com/) called `sweep-brawl`. Choose Public to showcase the source. Do not add an initial README if you are uploading this project's README.
2. Choose **Add file → Upload files**. Upload the source ZIP's contents, including the `lib`, `public`, `scripts`, `test`, and `output/pdf` folders, `package-lock.json`, `.gitignore`, and `render.yaml`. Keep those folders intact. Do not upload `node_modules`, `.tools`, or `artifacts`. Commit the upload. GitHub Desktop is another way to publish this folder.
3. Sign into [Render](https://dashboard.render.com/) and choose **New → Web Service**.
4. Connect GitHub and select the repository. A public Git repository URL can also be used.
5. Enter these settings:

   | Setting | Value |
   | --- | --- |
   | Name | A unique name, such as `sweep-brawl-yourname` |
   | Runtime | Node |
   | Branch | Your default branch, usually `main` |
   | Root directory | Leave blank |
   | Build command | `npm ci --omit=dev` |
   | Start command | `npm start` |
   | Instance type | Free |
   | Health check path | `/health` |

6. Create the service. When deployment shows **Live**, open the HTTPS `onrender.com` URL it gives you. No separate frontend or WebSocket URL is needed.
7. Open that URL on a laptop and on a phone using cellular data. Create a room on one and join on the other. Follow `PLAYTEST.md`.
8. Add the live URL to this README, the repository's **About / Website** field, and your contest submission. The source ZIP is also suitable for a file submission.

`render.yaml` provides equivalent configuration for the Blueprint deployment flow. Run **one instance**: room memory cannot be shared between separate processes.

Render Free services sleep after **15 minutes without inbound HTTP requests or WebSocket messages**; waking can take about a minute. Active Socket.io clients send heartbeat responses. Open the URL about a minute before a demo. An external uptime monitor can request `/health` every few minutes during a scheduled demo, within Render's terms and limits; this consumes free instance hours and does not guarantee uptime. An always-on instance requires a paid plan. **Rooms disappear on sleep, restarts, and redeploys.**

Hosting guidance checked against [Render's Node guide](https://render.com/docs/deploy-node-express-app), [WebSocket documentation](https://render.com/docs/websocket), and [Free service limits](https://render.com/docs/free) on October 9, 2026.


## Production notes

Run a single Node instance. Room state is in memory and disappears on restart or sleep. The game serves its own frontend and Socket.io endpoint on the same origin; no second WebSocket service or frontend build is required. Keep `output/pdf/` in the repository so `/rules.pdf` works. The supplied Render blueprint uses `npm ci --omit=dev` and `npm start` with `/health`. GitHub Pages cannot host this backend.

Hosting documentation checked October 28, 2026: [Render Node guide](https://render.com/docs/deploy-node-express-app), [WebSockets](https://render.com/docs/websocket), [free services](https://render.com/docs/free). Free-service sleep can interrupt in-memory rooms; choose a plan suitable for the intended event.
# Current publishing status · October 28, 2026

- GitHub source repository: https://github.com/DanielPlaza1/Sweep_Brawl-Handshake_AI_multiplayer_game_project. (the repository name ends with a period).
- Working review game: https://sept-relatives-composed-asbestos.trycloudflare.com/ (temporary; this computer must stay on).
- Sites: a private project is registered and its separate preparation checkout is under `sites/sweep-brawl/`. It is not published. The authoritative room engine must be adapted to persistent hosted state and a supported transport before publishing there. Never publish a static-only copy as a working multiplayer game.
- The instructions below remain available for hosting the current Node/Socket.io edition on Render.

