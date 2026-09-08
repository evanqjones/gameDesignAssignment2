# Bloom for You

A fast-paced, 90-second flower-care game in HTML, CSS, and vanilla JavaScript. All scene artwork uses your original PNGs. Transparent margins are cropped in memory; source artwork is unchanged.

## Run

Run `python -m http.server 8080 --bind 127.0.0.1` in this folder and visit **http://localhost:8080**. No dependencies or build step. Use a server for correct automatic artwork cropping. Fonts have local fallbacks when offline.

## Controls

| Action | Control |
| --- | --- |
| Water | 1 or can. Hold Space to raise tilt, release to lower. Select again or Esc to stop. |
| Food | 2 or box. Tap Space on center green dot. Early gives less; late gives too much. |
| Prune | 3 or shears. Click plant to remove a layer. Bare cuts hurt it. |
| Swat | 4 or wall swatter. Click flies. |
| Treat | 5 or bag. Drag a bone from bag to dog. |
| Blinds | B, window, or button. Open restores sunlight but admits flies. |
| Daydream | Mash Space nine separate times. Water and food continue during distraction. |
| Put tool down | Esc or select current tool again. |
| Pause | P or Pause. Switching away also pauses. |

Water and food can be too low or too high. High food accelerates weeds; each layer increases resource consumption. A third layer gives three seconds to prune before the plant falls. Bugs and the dog become fatal if ignored. A struggling flower has a short recovery window.

Growth stages advance at 30 and 60 seconds, with bloom at 90 seconds. Restart after either ending.

## Verify

`node --check game.js` and `node --test game.test.cjs` (Node 18+). Tests cover simulation and input logic; visual browser testing is separate.
