# Blooming Chaos

A fast-paced, 90-second flower-care game in HTML, CSS, and vanilla JavaScript. All scene artwork uses your original PNGs. The complete PNG canvas, including transparent margins, is preserved so local files and GitHub Pages use identical artwork coordinates. Source artwork is unchanged.

## Run

Run `python -m http.server 8080 --bind 127.0.0.1` in this folder and visit **http://localhost:8080**. No dependencies or build step. You can also open index.html directly; both use the same artwork dimensions. Fonts have local fallbacks when offline.

## Controls

On the game canvas, right-click puts the tool away just like Escape. Left-click also acts as Space: hold/release it to balance water, click to feed, and repeatedly click to escape a daydream. Tool selection, pruning, swatting, and treat dragging retain their normal left-click actions. During daydreams, tools remain locked until you wake up.

The opening menu offers Easy, Medium, Hard, and Debug. Easy spaces events 1.8 times farther apart and shows guidance for red bars. Medium uses the original pacing. Hard uses 1.65 times faster resource gains and drains, with events spaced 0.55 times as far apart. Only Easy shows status messages. In Medium and Hard, cutting a bare plant is immediately fatal; pruning existing weeds still removes one layer. Use Menu to return to the selection screen.

Debug never wins or loses. Random events and automatic plant-stage changes are disabled. Keys 1–4 choose dude poses; 5 spawns the dog; 6 spawns a fly; 7 starts a daydream; 8 cycles weed layers; 9 cycles all four plant stages; 0 resets debug. Q/W/E/R/T select water/food/prune/swatter/treat. The debug panel also provides event buttons, snip/swatter animation controls, dog departure, waking up, and care sliders. Enable “Let needs drain naturally” to test ongoing resource use. Feeding, watering, dragging, and Space minigames continue to work. Special action poses temporarily override the chosen idle pose.

| Action | Control |
| --- | --- |
| Water | 1 or can. Hold Space to raise tilt, release to lower. Select again or Esc to stop. |
| Food | 2 or box. Click / Space on green for a full serving; early clicks give a few pellets. Each shake resets to red with a 0.9-second cooldown, followed by red → yellow → green. |
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

Ending cards are replaced by translucent focus layers: purple for a loss, yellow for a win (flower and pot stay in front), and pink during daydreams (only the dude stays in front). Ending animation slots are intentionally blank. Use Menu to start another round.

Debug ending previews: Shift+1 bugs, Shift+2 overwater, Shift+3 underwater, Shift+4 overfeed, Shift+5 underfeed, Shift+6 dog, Shift+7 excess sun, Shift+8 insufficient sun, Shift+9 overgrowth, Shift+0 oversnip. V previews a win; Backspace clears the preview. Matching buttons are available. Previews pause the simulation without ending the debug session.

`node --check game.js` and `node --test game.test.cjs` (Node 18+). Tests cover simulation and input logic; visual browser testing is separate.

Resource limits: in Easy, Medium, and Hard, any food, water, or sunlight bar reaching 0% or 100% immediately ends the game. Debug remains loss-free. Colored fills use each PNG's own bounds so displayed progress matches the resource percentage.

Easy grants five continuous seconds at a resource endpoint (0% or 100%); recovering resets that resource's timer. Medium and Hard still lose immediately at either endpoint.
