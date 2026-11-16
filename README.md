# best-game-01-entry

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/0xyfann/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/0xyfann/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Tidewarden** — a top-down 2D arena-defense game in vanilla JavaScript. You are the lantern-keeper defending the Heartlight crystal at the centre of a circular shore arena against 10 escalating waves of gloom creatures: Drifter chasers, zig-zag Skitters, Brutes that split in two, and Spitters that shell you from range. Dash with brief invulnerability, chain kills into a combo multiplier, and spend dropped pickups (Repair, Starfire spread shot, Aegis shield, Surge) to survive to the victory screen. Keyboard + mouse, particles and screen shake, and a fully synthesized WebAudio soundtrack — no libraries, no network loads, every pixel drawn in code.

## Run it

```sh
# play the game: serve game/ statically and open it in a desktop browser
python3 -m http.server -d game 8080   # then visit http://127.0.0.1:8080/

# build the hand-in dossier (copies game/ + screenshots/ and writes dossier.json)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

---
<sub>Entered on [make.fun](https://make.fun/?ref=8yknssbq&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
