# Pokémon Duel Web

Browser-based multiplayer recreation of the retired mobile game *Pokémon Duel* (Pokémon Comaster).
All 593 figures in `data/all_pokemon_data.json` are playable.

## Run
```
npm install
npm start          # http://localhost:3000   (PORT=xxxx to change)
npm test           # headless bot-vs-bot simulation of the rules engine
```
Open the page, build a team (6 figures + plates up to 6 cost), then **Play vs bot**, **Create room**
(share the 4-letter code) or **Join room**. To play over the internet, host it anywhere that runs Node and
supports WebSockets (Render, Fly.io, a VPS…) or tunnel it (e.g. `cloudflared tunnel --url http://localhost:3000`).

## Architecture
- `lib/engine.js` – authoritative rules engine (turns, movement, battles, statuses, plates, KO/P.C., Z-gauge, win conditions)
- `lib/figures.js` – parses the JSON: wheels, damage formats (`40`, `20x`, `70+`, `☆☆`), ability flags and ~1,380 of the ~2,050 move-note texts into effect ops
- `lib/board.js` – board graph; `lib/plates.js` – plate catalogue; `lib/bot.js` – simple AI
- `server.js` – HTTP + WebSocket rooms (reconnect supported, no clock)
- `public/` – SVG board client

## Implemented rules
Plate → move → battle turn order; one Pokémon moves per turn; MP movement along routes; bench entry (1 MP via a free entry point);
first player's first turn −1 MP; mandatory battle when ending adjacent to an enemy; full colour-vs-colour battle table
(White/Gold damage compare, Purple effect, Blue block, Red miss); spin-again damage (`x`, `+`); statuses (poison/noxious/paralysis/burn/
frozen/confusion/sleep); Wait; P.C. (holds 2, overflow returns to bench with Wait 1); surround KO; goal capture; per-player clock; 300-turn draw; Z-Move gauge.

## Battle presentation
When a battle happens the client freezes the board at the pre-battle positions, highlights the attacker (⚔) and defender (🛡), spins both wheels, then reveals the result and finally applies the post-battle board (knock-backs, relocations, KOs). Click to skip.

## Movement animation & tagging
Pieces glide along the board routes, newly entered Pokémon pop in from their entry point, and knocked-out Pokémon fade away. Tagging: ending a move next to your own Pokémon removes their special conditions (Kyurem/Bergmite block frozen removal, Pinsir blocks tagging, Magearna also removes markers).

## Honest limitations
- **Board**: transcribed from the official board image (26 points + 2 goals, corner entry points, inner ring, diagonals); see `lib/board.js`.
- **Plates**: 16 representative plates, not the original ~100+.
- **Move effects**: about 80 % of the ~2,050 move-note texts are parsed and simulated (knock-backs, claim-spot, spin-groups, bench/P.C./Ultra-Space moves, statuses, markers, conditional damage, etc.). The remaining ~20 % (form changes, plate interactions, Photon/Lock-On markers, timed field-wide effects, "next turn is always the other player's") show "(effect not simulated)" in the UI.
- **Abilities**: 264 of the 461 figures with an ability have at least part of it simulated: status immunities and team immunities, contact statuses, damage auras (type/aura/per-count/adjacent/turn bonuses), damage reductions, MP bonuses and penalties, selective pass-through/fly-over rules, Blue/Gold wheel changes, no-Wait, wake-up, and more. The rest (evolution/form changes, switching on being attacked, multi-step choices, plate interactions) show their text only and are labelled in the UI. `npm run test:abilities` runs targeted checks.
- **Not implemented**: Evolution, Mega Evolution, form changes (Rotom etc.), markers other than MP−/Cracked/Curse, "choose" prompts for repositioning effects (auto-chosen toward the enemy goal).
- Figure images load from serebii.net (hotlinked from your data file); offline they fall back to letter tiles.

## Latest update
- Multi-spin attacks (e.g. "spin twice", multiplier/plus wheels) now show each spin in turn ("Spin 1 / 2: …").
- Status conditions and markers (burn, poison, paralysis, MP−, cracked, curse, Focus Band…) appear as badges on the piece, with a pop-in when applied.
- Reposition effects (2 steps away, pull closer, swap, "choose a point") work; when you get to choose, glowing points appear (or "Stay where it is").
- Pokémon may stand on goal points; only the enemy goal wins, and abilities like Whims of the Wind (no goal win) are respected.
- Heat Wave is simulated.
- Each side has a P.C. zone (2 slots) beside the bench; benched Pokémon of the opponent are hidden.
- Animated Victory / Defeat / Draw popup with confetti, stats, Rematch (vs bot) and Team builder.

## Campaign, rematch and fixes (latest)
- **Single-player campaign** (lobby → "Single-player campaign"): you start with 6 random Commons and 🪙500. Beat the 10-boss ladder (Youngster Joey → Master Red); each first win pays coins and drops one of the boss's Pokémon, and certain bosses unlock higher rarities (Uncommon → Rare → Ex → Ultra) in the shop and chests. Tabs: Bosses, Collection (sell duplicates), Decks (up to 5 saved decks built only from owned Pokémon), Shop & Chests (4 chest tiers, rotating stock priced at the figure's material cost). Progress is saved in the browser (`localStorage`). Bots are untimed and get stronger with the boss's skill value.
- **Rematch** from the game-over popup (same team or random team) and a "Restart" button in the header; in PvP both players must accept.
- Fixes: attack in place when adjacent, MP0 bench entry, Foundation, Whiteout (range aura), sleep/Rest/Lullaby/Sing/Mass Hypnosis, "move one Pokémon … gains Wait" effects (interactive choice), knock-back + Wait variants, Energy Ball, Genesis Supernova, Water Jump, Flash Over, Zap Cannon.

## Campaign v2
- Story mode: 12 chapters, 112 fights (v10.13 added Battle Frontier, Shadow Realm, Ultra Space, Mythic Summit + Hard mode) (route trainers, rival Kael ×7, gym leaders, Elite Four, champions, a syndicate arc and a final boss). Each chapter ends in a badge, a free chest and a shop/chest rarity unlock; every boss team is built around a signature "ace".
- Battle Tower: endless floors with checkpoints every 5 floors (free chests; a loss drops you back to the last checkpoint).
- Daily Challenge (new themed opponent each day, free Silver Chest) and 25 Quests with coin/chest rewards.
- Defeats cost coins; replays pay 30% of the first-clear reward.

## Accounts, saves & bot (v3)
- Campaign sign-in (name + passcode) with server-side saves in SQLite (`data/duel.sqlite`, override with `DUEL_DB`). The server records fight results; unfinished fights count as a loss. Needs Node 22+ (`node:sqlite`). Host with a persistent disk.
- Tower leaderboard at `/api/leaderboard`.
- Bot: evaluates win-race tempo (wall-aware path turns), enemy threats against your goal, battle odds (`E.estimate`), targeted plate use (Goal Block, Speed Boost, Hurdle Jump, power plates), Z-move choice by odds. `node test/arena.js 200 0.95 0.1` pits two skill levels against each other.
- ~60 more move effects simulated (Taunt, Torment, Break Energy, Round/Attack Order scaling, Psycho Shift, Flame Gun, Fissure, Hydro Kick, ...). About 180 rare move texts remain "not simulated".

## Simulation coverage (v7)
Move texts: all but 9 distinct are simulated (remaining: Dig, Nebby's Power, White Tentacles, Multiblast Lock-On source, Photon Geyser, Reflect Move, Ancient Power Restored, Mystery Scent evolution).
Abilities added in v7: Stench, Battery, Artificial Turf, Sneaky Steps, Balloon Trick, Queenly Majesty, Static, Rough Skin, Lightning Rod, Sap Sipper, Dry Skin, Scrappy, Thermostat, Intimidating Aura (plate lock + Dark +20), Crescent Veil, Sacred Fencer (damage), Darkness Crystal (no KO by damage), Slow Start (MP part), Electroswap, Magnetic Body, Ocean's Gift, Rally, Enhanced Core, Earth Rapids, Mud Coating, Coral Power, Force Balance, Mold Breaker, Supersonic Speed, Iron Heart, Psychic Surge (gold→white), Arena Trap, Raid, Forest Leap, Refraction, Hypnotic Voice, Serene Light, Behavioral Prediction, Connection.
Still text-only: evolution/form-change abilities, Restored Pokémon chains, Ultra Beast abilities, Lock-On, Illusion, Multitype and other complex abilities.
v8: Run Away (bench dodge), Sand Veil (3 variants), Migraine, Battle Armor, Reflective Laser (auto-used), Psychic Net, Spinning Pattern, Compound Eyes, Bide (cannot start battles). Confused Pokémon now log "spin drifts from X to Y" each time their spin shifts (it was already shifting, but invisibly).
v8.1: fixed accounts inheriting the previous account's save; opening-turn MP-1 is now announced in the log.
v9: Plate-use animation (card with name, user, target, effect) for both players. Campaign plate collection: 4 starter plates (Plus Power, Speed Boost, Full Heal, Switch Pokémon); buy the rest in the Shop (150 coins per cost point, +100 for cost-2 plates), win them from every 4th boss and chapter-end bosses, chests (12%/25%/40% bonus drop) and Tower floors 10/20/30. Multiplayer keeps every plate unlocked.
v10 UI: sound effects (M or 🔊 to mute), KO shake + popup, hover preview of a Pokémon's moves, plate cards with icons, pulsing turn banner + "thinking" dots for the opponent, Esc cancels a selection, fixed clipped player headers, board/benches fit one screen, campaign hover effects.
v10.3: landing on the goal while fully surrounded knocks the Pokémon out instead of winning.
v10.4: new accounts choose 1 of 3 random starter teams (Commons, each with an MP3 Pokémon and 3+ types), 2 free re-rolls.
v10.5: campaign saves live on the server only (no browser copies); old browser copies are deleted on load.
v10.6: Collection PvP (Campaign → PvP): rooms limited to owned Pokémon/plates, server-verified, W/L record + top 10. Resign now works on the opponent's turn too.
v10.7: Loyalty (Lycanroc Midday: bench itself at turn start and reuse immediately, clears Wait) and the 'if evolved +1 MP' text (Lycanroc, Magnezone, Omastar).
v10.8: Psychic Shove / Pancake now push strictly in a straight line (the old knock logic could curve toward the goal).
v10.9: random teams (rematch / restart / practice bot) are truly random again; they were accidentally always the 6 strongest-looking UX Pokémon.
v10.10: Gold now beats Purple (priority), as the rules text says; a bug made Purple's effect win against Gold.
- v10.11: Pokémon surrounded on any point (incl. one it jumps/moves into, or sitting on a goal) are now knocked out for both sides, and a check runs at end of every turn.
- v10.12: moving a poisoned/noxious Pokémon cures it.
- v10.13: 4 new chapters (40 fights) after the League, Hard mode toggle on story fights (2× coins, bonus chest on first Hard win), new quests.
- v10.14: Parting Shot (Pancham/Pangoro) now offers the bench switch as well as the Wait.
- v10.15: clear Z-Move panel (how-to, per-Pokémon Z buttons, armed state); engine ignores a Z colour the attacker doesn't have.
- v10.16: Flame Gun (Magmortar) now knocks out the battle opponent as well as the Pokémon behind it.
- v10.17: battle log now states why colours cancelled (e.g. equal Purple stars = no effects).
- v10.18: confused spins now visibly drift: the pointer lands on the original segment, then slips to the neighbouring one with a label.
- v10.19: moving a Pokémon, or an ally tagging it, removes its MP markers.
- v10.20: Black Core (Cosmoem): cannot be surrounded; negates Energy plates (Plus Power, Mega Plus Power, Type Threat, Speed Boost, Big Guard) while on the field. The 'may evolve' part is flavour only.
- v10.21: 0-damage White attacks (Harden) no longer knock out a Miss; a Pokémon that lands on the enemy goal through an effect move (e.g. Corkscrew Crash) now wins (or is KO'd if surrounded).
- v10.22: Pokémon with two Z-Moves of the same colour (e.g. Magnemite's Corkscrew Crash / Gigavolt Havoc) now let you choose which one; the wheel uses only the chosen Z-Move.
- v10.23: 'moves N steps back' (Shinx Blind, Sentret, Mew/Crobat Shuttle Flip) only offers points farther from the battle opponent; landing on the goal via any effect move already wins (v10.21).
- v10.24: mobile layout pass (header wraps, board fits phone width, scrollable tabs, deck filters wrap, bigger touch targets); Dig implemented (moves away from attached Pokémon); Fly Away/Fly lands on any point around the opponent incl. the goal and a safety net ends the game if any effect leaves a Pokémon on its goal.
- v10.25: persistent accounts on free hosting. Accounts/progress are written through to a hosted SQLite database (Turso, free tier) when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set; otherwise a local file (`DUEL_DB`, default data/duel.sqlite) is used. Check `/api/health` to see which is active. Needs `npm install` (adds @libsql/client).

### Free persistent database on Render (Turso)
1. Sign up at turso.tech (free), create a database (any region near you).
2. Copy its URL (`libsql://your-db-name-yourname.turso.io`) and create a token (Database → Generate Token, read & write).
3. In Render → your web service → Environment add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Build command `npm install`, start command `node server.js`.
4. Redeploy. Open `/api/health` — it should say `"remote":true`. Accounts now survive sleeps and redeploys.

## v10.26 — smarter bot
Bots with skill ≥ 0.3 now run a short lookahead search: the heuristic ranks moves, the top few are simulated on cloned games (fast rollouts, ~0.1–0.3 s per move) and the move with the best win rate wins. Practice "Rival Bot" now uses skill 0.85; campaign bosses scale search strength with their skill.

## v10.27 — Quick match
Lobby has a ⚡ Quick match button: it pairs you with another searching player, or after 7 s fills the seat with a bot that uses an ordinary trainer name.

## v10.28 — arcade skin + attack-then-move
- New look: marble board, glowing white lines and goals, blue/red bases with MP badges, blue/red top band with turn counter, gold buttons.
- (The attack-then-move rule briefly added here was removed in v10.29.)

## v10.29 — original battle flow
Moving next to an enemy now offers **Battle / Don't battle** (a Pokémon may also stay in place and battle an adjacent enemy). Any battle ends the turn, as in the original game. Bots may decline bad fights.

## v10.30 — layout polish
Bottom "dock" (turn banner, plates, Z gauge, Forfeit / Info buttons) styled like the mobile game; on desktop it sits beside the board, on phones it sticks to the bottom. Info/Log/Chat moved into a collapsible drawer (closed by default on phones). Wheels now print move names. Board canvas widened so edge pieces are no longer clipped.

## v10.31 — battle screen redo
Split blue/red battle scene, big wheels with black rim + glowing team ring, sunburst rays on white segments, curved move names, radial damage numbers, banners with name + Z gauge %. Phone layout stacks the two halves.

## v10.32 — table-top look
Wood-room backdrop, slightly tilted board, wooden turn plate, dark-blue bottom buttons (from the original board screen).

## v10.33 — camera, themes, battle wedge, fight prompt
- Battle scene shows only the wedge of each wheel at the red pointer (two wheels meeting at the diamond).
- Benches and P.C. are drawn on the board itself; the board is much larger and uses a gentler camera tilt.
- 11 procedural board themes (public/themes.js). Campaign chapters pick their own (gym) background; elsewhere choose one in the lobby ("Board theme", or Random).
- New "⚔️ Battle time!" prompt (FIGHT / HOLD BACK) plus ⚔️ markers on points where a battle can start.

## v10.34 — mobile-first game screen
On phones the game screen is a single full-height column: HUD, board (bench and P.C. always visible), then a compact non-overlapping dock (plates scroll sideways, how-to line only for the first turns). Info/Log/Chat open as a full-screen sheet from the "Info / Log" button. The FIGHT / HOLD BACK prompt sits at the bottom of the board on phones.

## v10.35 — Gems
New currency 💎 (save field `gems`; existing saves get a one-time 10-gem gift). Earned from first story clears (1; 2 on boss fights; 4 on chapter clears), first Hard wins (2), Tower checkpoints on new floors (2/3/5), Daily Challenge wins (2) and quests (1/3/6/12 by chest tier). Spent on shop restocks: the shop now refreshes only every 6 h for free, and each paid restock in a cycle costs more (1,2,3,5,7,11,17… = ceil(1.6^n)); the counter resets at the free refresh.

## v10.36 — Gem Shop + open PvP rollout
- **Gem Shop** (top of Campaign → Shop, gems only): Premium Chest 💎20 (R or better, ignores shop tier), Royal Chest 💎50 (EX/Ultra, always a bonus plate while any remain), Plate Unlock 💎15, Pick-a-Pokémon 💎35 (choose 1 of 3 R+; an unclaimed offer is saved).
- **Quick match** (open PvP, no room code): main-lobby ⚡ button and Campaign → PvP. Collection Quick match pairs two signed-in players using their own cards; with nobody found after ~7 s a trainer-named bot fills in (casual, not counted on the ladder). "Cancel search" button added.

## v10.37 — board slab
The board is now a framed playfield: metallic bevelled frame with drop shadow, translucent tiled surface over the theme, top light + vignette, bench trays, dashed start lines and centre line, hazard-striped goal pads (orange = enemy goal, blue = yours), glossy double-layer lanes and raised nodes.

## v10.38 — PvP with your collection from the lobby
Signed-in players get a "🎒 Play PvP with my collection" panel at the top of the team-builder screen: pick one of your complete saved campaign decks (only cards/plates you own), then ⚡ Quick match, Create room or Join room. The server verifies ownership; these matches count on the PvP ladder (bot fill-ins do not). Guests keep the free picker.

## v10.39 — readable move descriptions
Move/effect text in the battle scene is larger, white, on a dark rounded panel.

## v10.40 — Random-deck match
Separate mode for everyone (signed in or not): "🎲 Random-deck match" in the team builder and in the collection panel. The server deals each player a random team from the whole roster, queues them only against other random-deck players (bot fills in after ~7 s), and it never counts on the PvP ladder.

## v10.41 — chest economy
Gold 🪙6,000 (was 2,500), Mythic 🪙20,000 (was 5,000). Gold/Mythic cost +10% per purchase made within the last 24 h (+15% for the new 🪙50,000 Vault Chest: EX 55% / Ultra 45%, 60% bonus-plate chance); the price falls back after 24 h without buying. A ▲ marks a raised price. Bronze/Silver unchanged. Save field `buys`.

## v10.42 — chest prices (owner-specified)
Bronze 🪙1,000 (Common only, no rise) · Silver 🪙5,000 (+10%/buy; C70 UC30) · Gold 🪙10,000 (+15%; C50 UC30 R20) · Mythic 🪙25,000 (+20%; UC10 R45 EX35 UX10) · Vault 🪙50,000 (+10%; EX55 UX45). Rise applies per purchase within 24 h.

## v10.43 — Merge
Shop → ⚗ Merge: 5 spare Common → 1 random Uncommon, 5 UC → 1 R, 6 R → 1 EX, 8 EX → 1 Ultra. Free. Only spare duplicates count (copies used by any deck and your last copy of each are never taken), the target rarity must be unlocked by shop tier, and the result favours Pokémon you don't own yet (50%).

## v10.44 — chests final
Chest prices/odds are the owner's final numbers (see v10.42). Merge ratios (5 C→UC, 5 UC→R, 6 R→EX, 8 EX→UX) are the designer's choice.

## v10.45 — final
Release pass: full regression (abilities 80/80, moves, fuzz 300 games, sim, arena, e2e), 21 browser checks for Merge / chest prices & rises / gem items / persistence, PvP + Random-deck + lobby-panel checks. Fixed the Gem Shop description overlapping its cards.

## v10.46 — shop prices
Single Pokémon in the shop now cost C 🪙1,000 · UC 3,000 · R 10,000 · EX 25,000 · UX 50,000 (were 250/450/1,800/4,000/5,000). Plates 🪙1,500 (cost 1) / 4,000 (cost 2) (were ~150–400). Selling a duplicate pays C 200 · UC 600 · R 2,000 · EX 5,000 · UX 10,000, always well below the buy price. Prices sit around the average value of each chest's pulls so chests and the shop stay consistent.

## v10.47 — markers & abilities pass
- **Final Song marker is now visible**: a purple ♪N badge on the Pokémon shows how many turns are left before it is knocked out. Mind Blown (Blacephalon) now also marks its user with Final Song as its card says. Mismagius' Final Chant reads as ☆☆ (data glitch "&start☆" was parsed as 0 stars).
- **Symbiont** (Nihilego, White Tentacles): the battle opponent gets a 🧬 marker. Its owner cannot move it; the opposing player may MP-move it (never onto a goal, no battle, ends their turn). Tagging by an ally removes the marker; leaving the field clears it.
- **Diamond Aura** (Diancie): while on the field, the owner's healthy Fairy-types are not knocked out by Dragon-type Attack damage or by knockout effects of Dark-types.
- **Illusion** (Zoroark/Zorua): before a battle, a defender that has not yet fought may swap places with an un-battled Illusion holder (bench or field). Humans get a prompt ("Illusion! … or fight normally"), bots decide randomly.
- 18 new automated checks (test/abilities.js now 98).

## v10.104 — Mini Arena board picker

- **New:** a board selector next to the Mini Arena buttons (Free Play): *Standard 3×5* (13 points, the default), *Short 3×4* (10), *Wide 5×4* (18) and *Large 5×5* (23). All use 4 Pokémon per side. Players only match others who chose the same board; the Collection PvP buttons always use the standard Mini board.
- Tests: mini_e2e 9 (different boards never match; the chosen board and 4 Pokémon per side reach both clients); all four boards render in a browser bot game.

## v10.103 — Mini Arena plays with 4 Pokémon; board comparison

- **Changed:** Mini Arena (free play, bot, and Collection PvP) now uses only the **first 4 Pokémon** of your team (engine option `teamSize`; the other slots are ignored, plates unchanged).
- **Boards compared** (120 bot-vs-bot games each, avg turns / seat-0 win rate / KOs per game): Classic 8.2 / 49 % / 3.5 · Mini 6 Pokémon 16.4 / 48 % / 9.5 · **Mini 4 Pokémon 9.2 / 50 % / 3.8** · Mini 3 Pokémon 6.4 / 53 % / 2.2. Three extra candidate grids exist in `lib/board.js` but are not offered in the UI: `mini_s` (3×4: 4 Pokémon 6.8 turns / 52 %), `mini_w` (5×4: 5.0 / 48 %) and `mini_t` (5×5: 6.0 / 56 %). Mini with 4 Pokémon matched the classic game length and was the most balanced, so it is the one in the game.
- Tests: mini 170 (checks teams of 3 and 4 and every candidate board).

## v10.102 — Eevee no longer evolves on its own; Mini Arena in Collection PvP

- **Fixed:** Eevee (Spontaneous Evolution / Bright Arrow: "may evolve when it moves from the P.C. to the bench") evolved automatically, into a random form if none was chosen. It now only becomes *ready to evolve* (log line + the normal Evolve button), so the player decides when, and it uses the form chosen in the team builder / draft (a default is queued if none was chosen). Other "may evolve" cards were checked: only the Knock-Out variant (evolve instead of going to the P.C.) still triggers by itself.
- **New:** 🔷 *Mini Arena* button in the Collection PvP lobby(s) (Campaign → PvP, and the PvP quick-match box). Same owned-cards check and PvP record as a normal Collection PvP match, played on the Mini Arena board; it only matches other Mini Arena PvP players.
- Tests: evolution 56 (Eevee tests rewritten for the new behaviour), pvp_evo extended with the Mini Arena queue.

## v10.101 — Spark Noise

- **Implemented:** Vikavolt's Spark Noise. When it moves from the bench to the field, every Pokémon on the opponent's bench spins; each one that spins a Purple Attack gains Wait 1 (bench spins appear in the log). New tests (abilities now 183).
- **Note:** the card doesn't say how much Wait; it is read as Wait 1.

## v10.100 — Mini Arena mode + "no fight" explained

- **New mode — Mini Arena** (🔷 buttons in Free Play: *Mini Arena* for PvP queue, *Mini Arena vs bot*): a compact 3-wide board (13 route points + 2 goals, entry points on the corners next to each goal). Everything is close, so surrounds, goal blocks and first strikes decide the game. It uses your own team, matches only with other Mini Arena players, and gives no chests or ranking. The engine now supports several boards (`lib/board.js`: `BOARDS`, `use()`); every game remembers its board (`g.board`) and the client draws whichever board the game uses. Bot-vs-bot tests: average game ≈ 17 turns on Mini vs ≈ 9 on Classic; seat balance 43 % / 56 % over 150 games (small sample).
- **Fixed:** an attack was offered in place (and after a move) next to a Pinsir, whose King Spike stops adjacent opposing Pokémon from tagging/being tagged, so the turn silently ended with no fight. The in-place attack is no longer offered there, and whenever a move ends next to an enemy without a fight the log now says why (King Spike or Truant).
- **Fixed:** the log said "attacks with" for ordinary moves; it now says "moves".
- Tests: new `test/mini.js` (143 checks: board sanity + 120 bot games on both boards) and `test/mini_e2e.js` (7, through the real server); abilities now includes King Spike checks.

## v10.99 — Draft evolution choice + Crazy "Switch Sides" goal block

- **Draft:** after the third pick you now see your final six (3 picks + the 3 your opponent left) and choose each Pokémon's evolutions and an optional Mega, e.g. which Eevee evolution. A random choice is pre-filled; confirm it or change it (45 s, then the pre-filled choice is locked in; bots confirm automatically). The server validates the choice like a normal deck. Your own six are revealed to you at this step; your opponent's six stay hidden.
- **Crazy mode:** Switch Sides (Pokémon trading teams) now blocks both goals for the round, like Position Swap, so traded Pokémon can't walk into a goal straight away.
- Tests: draft_flow now covers the evolution step (17); abilities 179.

## v10.98 — Photon Geyser

- **Implemented:** Photon Geyser (all six Necrozma forms) now attaches a Photon marker. The marked Pokémon's Ability is nullified while it stays on the field; the marker is removed when it leaves the field and shows as a ✨ badge. A Necrozma that changed form may instead pick an opposing Pokémon within X steps (X = Pokémon in the Ultra Space, at least 1). Bots pick the strongest candidate. New tests (abilities now 178).
- **Note:** the card text's "X=1 steps" is garbled; it is read as "X steps, at least 1". Only opposing Pokémon are offered as targets.

## v10.97 — Mutual surround

- **Fixed:** when one move left both an enemy and the mover's own Pokémon surrounded, only one was knocked out: the check handled one side first, and removing that Pokémon freed the other. Both sides are now judged at the same moment and every surrounded Pokémon is knocked out. A normal single surround behaves as before. 4 new checks (abilities now 172).

## v10.96 — Stealth Hit / Flying Blow jump

- **Fixed:** “This Pokémon can jump over its battle opponent and land 1 step away” (Sceptile, Lycanroc Midnight Form – Stealth Hit; Golisopod – Flying Blow) offered any point 1 step from the attacker, including a step *back*. It now offers only points next to the opponent on the far side of it (falls back to any point next to the opponent if the far side is blocked). The 1-2 step jumps (Rayquaza, Swellow, Dragonite, Celesteela) and the “surrounding point” jumps (Skarmory, Flygon, Garchomp) are unchanged. 1 new test (abilities now 169).

## v10.95 — Emergent Evolution

- **Implemented:** *Emergent Evolution – Restored Pokémon* (Omanyte, Tyrunt, Amaura): after battling they may evolve if they are still on the field, win or not (other Pokémon still have to win). The log shows “battled and can evolve!”. 3 new checks in test/evolution.js (now 51).
- v10.94 (also in this build): all plates are visible in a match (wrapped grid instead of a sideways-scrolling strip).

## v10.94 — All plates visible in a match

- **Fixed:** on phones the plates you can use in a duel sat in one sideways-scrolling strip (only ~3 fit, no hint to scroll), so plates such as Retreat and Goal Block looked missing. They now wrap into a grid (3 per line on a phone, auto-fill on desktop) with names always shown. Checked with a 6-plate campaign deck at 360, 390, 412, 768 and 1366 px.

## v10.93 — Mega plates visible in the campaign

- Mega plates are not part of the normal plate lists (they are used through the 💎 Mega button under a team slot), so after a Plate Unlock that dropped one, nothing showed it. The campaign **Decks** tab and the **Shop** now list the Mega plates you own, with what each still needs (the Mega Pokémon itself, and a base form in your collection), or a hint on how to get them if you own none.

## v10.92 — Store the pictures in the repo

- `node tools/fetch_pics.js` (run it on your own computer, it needs the picture host) downloads every Pokémon picture into `pics/<id>.jpg`. Commit that folder (~593 files). The server serves them from there first (immutable caching, no network at all), then the runtime cache (`data/pics`), then the upstream site, then a plain redirect. Re-running the script skips files that already exist.
- Nothing else changes if you skip this step.

## v10.91 — New draft flow, picture caching, in-game blur removed

- **Draft is now 3 rounds, pick 1 of 2.** The card you leave goes to your opponent: your final team = your 3 picks + the 3 cards your opponent left (6 in total, any combination is legal because all 12 offered Pokémon are different species). The 3 received Pokémon stay hidden until the duel starts (the draft summary shows only your picks). Bots, timers, reconnects, Leave and rematch work as before. New test: test/draft_flow.js (12 checks, including that each team = own picks + opponent's leftovers); draft_leave still passes.
- **Pictures are served by the game server** (`/pic/<id>.jpg`): fetched once from serebii, kept in memory + `data/pics/`, served with `Cache-Control: immutable`, and pre-cached in the background at start-up. Hot-linked images that the browser re-requested on every board redraw could blink; if upstream is unreachable the route redirects to the original link, so nothing gets worse. `PIC_PREFETCH=0` disables the warm-up. New test: test/pics.js.
- Removed `backdrop-filter` blur from the in-game panels (it is re-rasterised every frame behind the animating board on phones).
- Phone layouts re-checked at 360, 390, 412, 768 and 1366 px (lobby, deck builder, draft, match): no page-level horizontal scroll.

## v10.90 — Board flicker (themes)

- **Cause:** every redraw wiped and rebuilt the entire board SVG, including the themed background. Most themes use heavy `feTurbulence` noise filters + blend modes over the whole board, so each redraw forced the browser to re-compute them → the board blinked, mostly in themed (random-theme) games.
- **Fix:** the theme, slab, track lines and gradients are built once per game (kept while theme/seat unchanged) and only the pieces, highlights and goals are redrawn. Goal pulse is also phase-synced. Verified on all 11 themes: the background node stays the same across redraws, no definition growth, redraw ≈5–8 ms.

## v10.89 — Steelix Pull In

- **Fixed:** Steelix's Pull In ("Moves the battle opponent to the P.C. and moves this Pokémon to the bench") only sent the opponent to the P.C.; Steelix now also moves to the bench. Checked every other move whose text mentions the user going to the bench — none were missing it. New test (abilities now 168).

## v10.88 — Species-limit bug

- **Fixed:** the "max 3 of the same Pokémon" check treated every "Shiny …" figure as the same species ("Shiny"), so a deck with 4+ different Shinies was rejected (and "Shiny Mega X" counted as "Mega"). Prefixes (Shiny / Mega / Alolan / …) are now all stripped, so Shiny Gengar and Gengar count as one species and different Shinies no longer collide. Applied to the engine, draft, bot and campaign deck checks.
- 1 new regression check (test/abilities.js now 167). Full suite re-run: all green.

## v10.87 — Flicker fixes

- Every redraw rebuilds the board/HUD, which restarted all looping CSS animations (move-highlight glow, active-player avatar pulse, Evolve button, full gauge) from frame 0 → visible flicker. They are now re-synced to their original phase after each redraw (checked in browser: pulse phase stays continuous across redraws).
- In-game Pokémon images are loaded eagerly with synchronous decoding (no lazy-load blank frame when portraits are rebuilt) and every Pokémon in play is pre-decoded into a cache.

## v10.86 — Open all free chests

- Shop & Chests: when you have 2+ free chests of a kind there is a new **Open ALL n free** button. It opens them all at once and shows one summary (new vs duplicate Pokémon, bonus plates). Single "Open FREE" still works. Counts toward the chest quest stats.
- test/fuzz.js: roster pool no longer includes Megas (they are rejected as roster slots since v10.85, which made the fuzzer retry forever).

## v10.85 — Mega Aerodactyl wheel; Megas only via Mega Evolution

- **Mega Aerodactyl** wheel fixed: Miss 4 · Rock Slide 32 · Stone Edge 32 · **Taunt 28 (☆☆☆)** = 96. Taunt had no size/stars and its text variant wasn't recognised, so it did nothing; it now applies (until the end of your next turn). Parser fix also covers other Taunt wordings.
- **A Mega can no longer be a roster slot.** Put the base form (e.g. Aerodactyl) in the slot, add the Mega with the 💎 button; it comes in via its plate, for 7 turns. `validateDeck` rejects Megas/Primals in `figs`; random, quick, draft, bot and campaign-boss decks no longer pick them; the free-play and campaign pickers hide them; old saved decks with a Mega in a slot have that slot removed when loaded (re-pick the base form).
- 3 new checks (test/abilities.js now 166).

## v10.84 — Turn banner timing

- The YOUR TURN / opponent's turn banner appeared while pieces were still moving or the battle/KO animation was playing. It now waits until movement, battle, KO and evolution animations have finished (max 6 s), then shows.

## v10.83 — Home button, random team evolutions

- New **🏠 Home** button in the header on Free Play, Campaign and the other menu screens (the brand logo also goes home). In a match or draft the existing **Leave** button is used.
- The Free Play **Random team** button now also assigns random evolution chains and, 60% of the time, Megas with their own plates (Mega plates don't use plate points). Quick/Random/Draft/bot matches already did this on the server.

## v10.82 — Aura Sphere choice

- "Either the battle opponent or a Pokémon behind it in a straight line is knocked out" (Aura Sphere: Lucario, Mega Lucario, Dialga, Palkia) was always KO'ing the opponent. **The attacking player now chooses**; if no enemy stands behind, the opponent is KO'd with no prompt. Bots pick the higher-MP target.
- 3 new checks (test/abilities.js now 163).

## v10.81 — Draft card types

- Draft pick cards showed types run together ("psychicfairy"); they now read "Psychic / Fairy".

## v10.80 — Mega plates only from the Plate Unlock

- Mega plates are **no longer sold for coins**. The **only** way to get one is the Gem Shop **Plate Unlock**: each unlock has a **10%** chance to be a random Mega plate you don't own (all other unlocks are normal plates, as before).
- Plate Unlock now costs **20💎** and **rises by 3💎 for every Mega plate you own** (cap 90💎), so completing all 44 costs roughly 3,400💎 in total. Tune `MEGA_CHANCE`, `PLATE_BASE_GEMS`, `PLATE_STEP_GEMS` at the top of the plate section in `public/campaign.js`.
- Collection shows your Mega plate count. Bosses, chests and the Tower still never drop Mega plates.

## v10.79 — Draft Leave, Drilbur wheel, Melemele Wish

- **Draft**: a **Leave** button now shows during the draft (and the team-reveal pause). Your opponent is told you left and no game starts.
- **Drilbur wheel fixed**: Dig (Purple 36), Slash (White 70, size 32), Mud-Slap (White 30, size 20; a knocked-out opponent must Wait 1), Miss (Red 8) = 96. The source data only had Dig. New `waitKO` effect.
- **Tapu Koko – Melemele Wish fixed**: the Pokémon you select now really gets MP3 *and* can MP-move over Pokémon that don't have Soar (it only got the MP3 before).
- Known data gap: 27 more figures have wheels that don't add up to 96 (listed in the release notes); they need their real wheel data.

## v10.78 — One plate per Mega, Gastly fix

- **Mega plates**: every Mega form now has its **own plate** (44 of them, e.g. "Charizard X Plate"). The generic Mega Ring is gone. A Mega plate costs **0 plate points**, so you still bring a full 6 points of normal plates. Picking a Mega in a deck slot equips its plate automatically; the plate only works for the Pokémon holding that Mega slot.
- **Hard to get**: in the campaign each Mega plate costs 8000🪙 in the Shop (new "Mega Plates" section) and never drops from chests/bosses. You also still need to own the Mega figure and its base Pokémon.
- Random / draft / quick-match teams equip the right plate automatically.
- Old saved decks that used the Mega Ring are cleaned up automatically (the Mega slot is dropped until you own the new plate).
- **Fixed (Gastly, Gaseous Form)**: it can no longer be surrounded (it was KO'd on the goal), and it doesn't count as a surrounder for enemy Pokémon. The ability text wasn't being parsed. Tests added.

## v10.77 — Evolution rules aligned with the original game

- **Evolving needs a win**: the Evolve button now appears only after the Pokémon *wins* a battle (knocks out the opponent, or its Purple effect lands), not after any battle. The log says "won the battle and can evolve!".
- **Evolution bonuses**: an evolved Pokémon permanently gets +10 on White/Gold attacks (when the attack does damage) and +1 star on Purple. Bonuses stay with the figure after it is knocked out.
- **Mega Evolution** lasts **7 turns** (was 10–15). The **Mega Ring** is now free (cost 0, doesn't count toward the 6-point plate limit). It still acts on the same turn.
- Rules panel updated. Not done: one Mega plate *per Mega* (e.g. Mewtwo X plate); we use one generic Mega Ring plate.

## v10.76 — Match presentation

- **VS intro** at the start of every match (trainer avatars, your team, VS / FIGHT!; tap to skip).
- **Turn banner flash**: big "YOUR TURN" / "<name>'S TURN" sweep on every turn change.
- **Scoreboard**: trainer avatars with a pulsing ring on the active player, and a live ⚔ KO tally.
- Phone layout of the scoreboard fixed (no clipping). Full click-through of title, deck builder, a game, and every campaign tab at phone and desktop width: no errors, no failed requests, no horizontal overflow.

## v10.75 — Evolutions in random, quick-match and draft games

- Random teams (Random mode, quick-match bot fill, rematches, draft) now come with natural evolution chains (up to two stages, random branch for Eevee-style Pokémon). Megas appear only on teams that also carry the Mega Ring plate (about 60% of random teams that have a Mega available).
- Bot-vs-human and random games therefore show the Evolve button and Mega Evolution just like deck-built games. Tests added.

## v10.74 — Purple beats White fix, Bright Arrow

- **Fixed**: a White move's "knock out the opponent if…" clause (Hariyama's Heavy Slam vs MP3+, and similar type-based ones) no longer fires when the opponent spun Purple. Purple beats White, so only Purple's effect applies. Gold still beats Purple. New test runs 400 Hariyama vs Eevee battles; before the fix 21 of 21 Purple spins still knocked Eevee out.
- **Bright Arrow (Eevee UX) implemented**: MP can't drop below 3 except via markers; it evolves when moved from the P.C. to the bench (same as Spontaneous Evolution).

## v10.73 — Eevee's Spontaneous Evolution

- Eevee now evolves when it moves from the P.C. to the bench (Revive plate, P.C. overflow, abilities). It uses the form chosen in the deck's `＋ Evolution` slot, otherwise a random Eeveelution.
- Being knocked out is unchanged (Eevee goes to the P.C. as normal). The evolution happens on the way back.
- Tests added to `test/evolution.js`.

## v10.72 — Evolution browser verification and Mega fix

- Verified in a real browser: the Evolve button, evolve overlay and form change, the Mega Ring flow (overlay, 💎 badge), phone layout, and saving/loading decks with evolutions through the real save endpoint (old decks without evolution fields still load).
- New `test/pvp_evo.js`: Collection PvP with evolution decks (ownership of each stage, Mega form, Mega Ring plate; game starts with the evolution queue).
- Fixed: an unevolved Pokémon could use the Mega Ring and jump to a Mega form of a later stage (Charmander → Mega Charizard X). The Pokémon must now be the matching form first. New tests cover this.

## v10.71 — Evolution checks and fixes

- Bots now use the free Evolve action (before, only humans could evolve).
- Campaign deck builder explains that evolution buttons appear once you own the later stages.
- New `test/evo_sim.js`: 60 full bot games with evolution decks (all finish, 44 evolutions, no errors); part of `npm run test:evolution`.

## v10.70 — 8 new regions (16 total, 96 stages)

- New regions: Mirage Desert, Frostpeak Tundra, Storm Isles, Crystal Caverns, Neon Metropolis, Twilight Ruins, Iron Citadel, Celestial Spire (public/campaign_regions2.js, spliced between the originals by difficulty). The Pinnacle is still last.
- Difficulty and rewards now scale across all 96 stages. Reward growth was softened so late rewards don't balloon.
- Existing progress is kept; new regions in the middle must be cleared in order to reach later ones.

## v10.69 — Evolutions, Mega Evolution, form changes

- **Evolutions in decks**: under each deck slot, `＋ Evolution` lets you queue the later stages (e.g. Charmander → Charmeleon → Charizard). They don't use deck slots, but in the campaign you must own each stage. After a Pokémon survives its first battle, a free **Evolve** button appears in the main phase.
- **Mega Evolution**: `＋ Mega` on a slot + the Mega's own plate (free, no plate cost). The Pokémon stays Mega for 7 turns, then reverts (also reverts if it leaves the field).
- **Form-change-on-KO now works** (Magikarp, Nincada, Feebas, Larvesta evolve instead of KO; Keldeo, Black/White Kyurem, Zygarde 10% change form) even if the form isn't in your deck.
- Balance: "+1 MP when evolved" abilities (e.g. Lycanroc) now require a real evolution.
- Not yet: Pancham/Skrelp/Eevee-style special triggers, Aegislash/Giratina stance swaps.
- Tests: `npm run test:evolution`.

## v10.68 — Game skin, desktop layout, in-place attack cancel

- New `public/skin.css` (self-hosted Rajdhani + Russo One fonts in `public/fonts/`): gold/steel bevelled buttons, glass panels, animated hex backdrop, redesigned title screen with three mode cards, banner-style campaign chapters and a two-column stage grid, gold-trimmed header.
- Desktop game screen: the command dock and the Info / Log / Chat panel now share one right-hand column next to the board (no more empty gap); the board column is centred.
- Attacking in place (clicking a Pokémon that is already next to an enemy) and then choosing not to fight now just cancels — it no longer ends your turn. The button reads CANCEL in that case; after a real move HOLD BACK still ends the turn.
- Regions: removed the loaner team. If you don't own enough Pokémon of the allowed types, play more to unlock them.

## v10.67 — Regions, reward wheel, Next button, tougher bots

- **🗺 Regions** (Campaign tab): 16 regions × 6 trainers, unlocked in order. Each region has a **type restriction** (e.g. Magma Reach: Fire/Rock/Ground/Fighting only; the last, The Pinnacle, has none) — the opposing trainers obey it too, the server checks your deck, and you can auto-build a team from your collection or borrow a loaner team. Data lives in `public/campaign_regions.js`.
- **🎡 Reward wheel**: every region win spins a half-blue / half-red wheel — 🔵 a Pokémon, 🔴 a big coin payout. Region champions give a badge, gems, a free chest and a plate. Three new quests.
- **▶ Next** button on the victory screen for Story, Regions and Tower: jump straight to the next stage's pre-fight screen.
- Bots with skill ≥ 0.8 now think much longer (up to ~1.2 s per move) with more rollouts; Region trainers start at skill 0.45 and climb to 0.99.
- `npm run test:regions` checks the region data.

## v10.66 — Rematch + Fly fixes

- Rematch in Crazy / Draft / Random queue rooms no longer swaps your team for the one in the team builder (or a random one): Crazy keeps your deck, and Draft re-runs the draft.
- Mega Salamence's Scarlet Bladewings: Fly now knocks out the jumped-over Pokémon only when the jump is actually made (not the moment Fly is spun, and not if you skip the move).

## v10.65 — Full ability & move audit

- New `npm run test:audit` (`test/audit.js`): checks all 593 Pokémon — every wheel segment and Z-Move note against the effects the engine actually has, every ability for a matching rule, runs every move 6× in random board positions and every Pokémon through forced battles, checking board consistency (no ghost occupants, bad Wait, wrong locations).
- `node test/audit.js --report` writes `AUDIT_REPORT.md` (every known gap listed); `--baseline` accepts the current gaps into `test/known_gaps.json`. The test fails on any NEW gap, so a broken or unparsed move/ability can't slip in again.
- Fixed by the audit: Dragon Tail (opponent now waits), Skull Bash (KOs an opponent with a condition), Sheer Cold (excludes a frozen opponent), Magma Slide (now burns), Garchomp Double Flight (KO if opponent has a condition).

## v10.64 — Sand Veil + Taunt
Sandshrew's Sand Veil (slip past the attacker) now offers any free spot on the far side of the attacker; before it only worked when the spot directly behind was free, which was rare. Taunt: the shorter 'until the end of your turn' version now lasts through the opponent's next turn (it used to expire before they could spin), and taunted Pokémon show a 😤 badge so you can see it is active.

## v10.63 — Mimikyu
Shiny Mimikyu had an empty wheel in the source data (only a Miss); it now inherits Mimikyu's wheel and Z-Moves. Mimikyu's Disguise now works: a marker is attached when it moves from the bench to the field (🎭 badge), absorbs one battle knockout, then breaks and clears its conditions.

## v10.62 — Crazy Mode animations
When a Crazy event happens: a full-screen swirl announcement (big icon, event name, plain-language explanation, tap to dismiss, auto-fades), a crazy sound, a board shake, and pulsing pink rings around the Pokémon affected. The pink banner keeps the last event on screen.

## v10.61 — Crazy: Lights Out
New Crazy event (9th): Lights Out puts every Pokémon on the field to sleep except one random awake Pokémon per side. Move next to a sleeping teammate to wake it, or use Full Heal.

## v10.60 — Crazy Mode goes wild
Every 5–7 turns, one of 8 events (never the same twice in a row): Position Swap (a Pokémon from each side trade places, Goal Block for both), Board Shuffle (every Pokémon on the field thrown to a new spot, Goal Block for both), Status Storm (2 Pokémon per side get a random burn/freeze/sleep/paralysis/poison/confusion), Replaced for 4–6 turns (one Pokémon per side becomes ANY random Pokémon, then changes back), Ability Swap (2 per side), Switch Sides (up to 2 trade teams), Recall (one per side dragged to the bench with Wait), Rally (all Wait cleared). Events never put a Pokémon on a goal point.

## v10.59 — Crazy Mode: 5–7 turns, your own deck
Crazy events now fire every 5–7 turns. Crazy match uses YOUR deck (guests: the team on the deck screen; signed-in: the selected owned deck, ownership still checked) instead of a random one. Still casual: no ladder, no rewards. Crazy Draft still drafts temporary teams.

## v10.58 — Optional move + Wait fix
Moves that say "You can move this Pokémon N steps. If you do, it gains Wait" (Darkrai Dark Leap, Keldeo Water Jump and the like) now give you the move choice and only add Wait if you actually move. Before, the Wait was applied immediately and the move was never offered.

## v10.57 — New modes for signed-in players
The Campaign → PvP tab and the lobby's "Play PvP with my collection" panel now also have Draft match, Draft vs bot, Crazy match, Crazy Draft and Random-deck match (casual: no ladder, no rewards, no collection needed), with a searching note and Cancel search.

## v10.56 — Draft polish + calmer alerts
Draft screen: always-visible "How the Draft works" steps, sticky header with 6-step progress bar and timer, picked card is highlighted (the other dims), cards fade in smoothly, no re-render flicker when the server repeats a round, empty boxes removed, a "Duel starts in N…" countdown after the reveal. Fixed the page staying scrolled down when a new screen opened (the page scrolls inside <body>). In-game alerts no longer replace the turn banner: they appear as a small floating message that fades, and harmless race errors ("Not your turn") are ignored.

## v10.55 — Crazy Mode retuned
Events now every 10–14 turns (was 4–6) and affect ONE Pokémon per side instead of everything: Ability Swap (borrows another Pokémon's ability, 🌀 badge), Replaced (becomes another Pokémon of the same rarity), Switch Sides (one field Pokémon from each team swap teams in place), Condition (random burn/paralysis/freeze/sleep/poison/confusion on one Pokémon per side), Rally (all Wait cleared). Never the same event twice in a row.

## v10.54 — Crazy Mode + Crazy Draft
Two new queue modes (casual, no rewards): 🌀 Crazy match (random teams) and 🌀 Crazy Draft (draft first). Every 4–6 turns one random event hits both players: Ability Shuffle (abilities are dealt around; shuffled Pokémon get a 🌀 badge), Transformation (one Pokémon per side becomes another of the same rarity), Status Storm (one random Pokémon per side gets a status) or Rally (all Wait cleared). A banner shows the last event and the countdown. Also fixed: Loyalty, Hold-back-lock (Bite Instinct) and the new swap buttons were never sent to the browser; they are now.

## v10.53 — Plusle / Minun
Plusle and Minun: while the other is adjacent, the White Attacks of your Electric-type Pokémon paralyze the battle opponent (applied before knock-outs, like other attack effects).

## v10.52 — Ability audit, batch 4
Fly Away / Fly are moves: Spinarak Sticky Web (Fly Away can't jump over it), Flygon Sand Blizzard (opponent's Fly Away nullified), Galvantula Electric Web (jumpers paralyzed). Arbok/Dragonair Shed Skin (automatic at the start of your turn: cures all conditions, turn ends). Shiftry Cut Off (goal point glows as a special move). Aipom/Whimsicott Run Off / Strong Breeze and Manectric Volt Swap (one-tap swap buttons before moving; swapping doesn't use the turn).

## v10.51 — Ability audit, batch 3
Completed partials: Toxapex (Grass/Fairy can't pass it; poisoned Grass/Fairy lose pass abilities), Mawile Fang Trap (enemies next to it can't be moved by your effects), Deoxys Cross Wind (free bench entry). New: Hawlucha/Kartana range-2 attacks, Magneton spin immunity, Gallade Psychic Sensor, Zygarde Enforcer, Pheromosa/Necrozma/Ultra Necrozma ability nullification (+ first-battle Gold→White), Palkia Space Slide, Shiny Ho-Oh Cleansing Fire, Electrode Aftermath Switch (auto, only when it nets a gain), Frost Rotom Frost Tag, Growlithe/Solgaleo/Lunala battle pin, Goodra Slime Barrier.

## v10.50 — Ability audit, batch 2
Now working: Slaking Truant (no battle after an MP move), Totodile Bite Instinct (must fight after moving – Hold back hidden), Hypno Spellbind (sleep isn't cured by other abilities), Heracross King Horn (+1 spin on spin-again attacks; Blue attacks miss while Cracked), Toxapex/Mawile (can't be moved by opposing attacks), Torracat Fire Bell, Relicanth Survive, Tentacool/Bidoof/Deoxys (no 3-copy deck limit).

## v10.49 — Ability audit, batch 1
Abilities that used to be "flavour text only" and now work: Turtonator Shell Armor, Abra Sturdy (healthy only), Type: Null Control Mask (healthy only), Deoxys Shelter (self + adjacent allies) — all block knock-out *effects* of attacks; Scizor/Mega Scizor Steel Breaker (cracks opponents that spin big attacks); Scrafty/Scraggy Rubbery Repulsion; Haxorus Double-Edged Axe (KO effect bounces back); Absol Pressure (+1 Wait); Rhyhorn/Rhydon/Rhyperior straight-line 1–2 step move. Remaining flavour-only abilities need new systems (evolution, Ultra Space, Restored, Mega forms, Lock-On/Slime/Photon markers) and are tracked for later batches.

## v10.48 — Draft mode (1 v 1)
Team-builder screen → **🃏 Draft match** (finds a human, bot fills in after ~7 s) or **Draft vs bot** (instant). Six rounds: each player is offered 2 Pokémon of the same rarity (both players see the same rarity sequence, chosen from a few templates, so it is fair; all 12 offered Pokémon have different base names, so any combination of picks is a legal deck), picks one within 25 s (auto-pick on timeout), picks stay hidden until the end, plates are dealt at random, then both teams are revealed and the duel starts. Casual: no rewards, not on the ladder. Server: lib/draft.js + startDraft/draftPick in server.js; messages `draft`, `draftPick`, `draftWait`, `draftOpp`, `draftDone`.
