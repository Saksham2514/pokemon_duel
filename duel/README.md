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
