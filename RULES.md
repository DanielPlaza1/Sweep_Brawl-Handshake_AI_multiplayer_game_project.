# Sweep Brawl: full rules

Version 0.8.0 · October 28, 2026

## Playing a round

Sweep Brawl is a shared-board Minesweeper party game for 1-8 participants. Take turns clearing cells, bluff with flags, collect permanent items and finish the game with the highest total score. Equal leaders tie. Room points carry between rounds; hearts reset to the host’s starting value. Remaining Plated Armor is an explicit exception and carries forward.

The host chooses 3 or 5 rounds, starting hearts from 1-10 or Unlimited, a 10/15/20/30/45/60-second timer or No timer, preparation of 0/3/5/10 seconds, and Easy/Normal/Hard/Extreme board difficulty. The default item pool is Party, a curated set of 30 cards; All items enables the full 62-card collection. The host can add Dusty, Misty, Rusty and Sparky and independently set green Easy, orange Normal or red Hard difficulty.

Bots use their visible board, honest deductions, private flags, shared bluffs and owned items. They cannot inspect the hidden mine map. Easier bots deliberately make more mistakes; random clicks with a safe move available receive the low reckless-guess reward.

Before every round, draft up to three unowned items. Keep the whole collection; there is no three-item hand limit. You have two rerolls for the entire draft, with no refill after a choice. Slot rarities stay fixed on reroll and are shared across participants; actual offers are private. Owned types, including disabled ones, leave ordinary loot pools. Exhausted rarity slots skip cleanly. Bishop’s generated mine gift is an explicit duplicate exception.

| Round | Guaranteed offer slots across all three choices | Extra chance |
| --- | --- | --- |
| 1 | 1 rare | 40% for another rare |
| 2 | 1 rare and 1 bonus special slot | Bonus is legendary 35%, otherwise rare |
| 3 | 1 legendary and 1 rare | 35% for another legendary |
| 4 | 1 legendary and 2 rare | 50% for another legendary |
| 5 | 2 legendary and 1 rare | 50% for another legendary |

Guarantees are offers, not mandatory picks. Special slots are spread randomly, at most one per choice until more than three are required. A fourth special slot shares a choice with another. Pool exhaustion can omit a slot when that player owns all eligible cards of its rarity.

Preparation hides the board while eligible anytime items and flags can be used. Board-changing cards wait until the first clear. The opener can choose any hidden cell. Mines relocate as needed to guarantee at least a safe 2 × 2 opening at that position, including edges; zero cells can cascade farther. The opener receives 15 base points plus cascade points. Down cards cannot be manually armed before that opening.

On your turn, normally clear one hidden cell, with legal items beforehand. A number counts the eight neighboring counted mines. Zero cells cascade. Flags never block reveals. When the timer expires, skip the turn for zero points without revealing a cell or losing a heart. A normal mine costs one heart before item effects and the Danger zone. Only Dagger and mines can remove a final heart; Hit, Scythe, Poison, Duel and Glass Cannon’s starting cost are nonlethal.

Healing caps at starting hearts +2. Armor is a separate damage pool. At 25% or fewer of the initial safe cells remaining, the board enters the announced Danger zone and every unblocked mine hit costs one extra heart. Protection can block the full hit. Glass Cannon instead makes an unblocked mine lethal regardless of hearts or armor.

A round ends when all safe cells are cleared, no players remain alive, or a multiplayer round has one living player left. Solo play continues until the board is cleared or the solo player is eliminated. Unlimited lives prevents heart-based elimination and disables health-dependent cards. Late arrivals spectate until a new game.

## Ghost Haunt and eliminated players

An eliminated participant becomes a ghost while that multiplayer round is still playing. They have one Ghost Action per round: either place a translucent ethereal Ghost Flag on an uncleared cell, or harmlessly spook a cell or participant. Ghost Flags show a ghost icon, do not reveal mine information, do not count as real flags, have no mine-cap cost and earn no flag points. Spooks are visual only and last about 1.2 seconds.

Ghosts can continue using their owned, ready anytime items. They have no regular turns and cannot use your-turn-only cards, make normal reveals or place ordinary flags. Healing cannot revive them. An owned Reset can revive eliminated participants and reserve its caster’s first clear. Reset does not replenish the haunt allowance; dying twice in one round still grants only one haunt. Haunt availability resets at the next round. Mid-game spectators and players eliminated in an earlier round cannot haunt.

Ghosts can still earn source-attributed points through their items and already owned mines. Their shared flags placed before elimination still receive ordinary round-end payouts. Ghost bots can haunt and use suitable anytime cards too. The last elimination can end the round immediately, so there is no haunting window after results begin. Shocking Reanimation intercepts lethal damage before elimination; it does not revive an already eliminated ghost.

## Controls, flags and feedback

Left-click uses the selected Reveal or Flag action; right-click uses the opposite. The mouse pictures show the mapping. F swaps Reveal/Flag. V swaps Shared/Private. A fresh profile defaults to Private, while an explicit saved preference is retained. Touch users can select Flag mode or hold a tile for about half a second. Wheel, +/-, or pinch zoom the board; drag to pan. The percentage control resets zoom.

Shared flags show owner colors and earn +5 base points per correct owner/cell at round end. Wrong shared flags and all private flags earn zero. Each player’s shared flag cap is the counted remaining mine total. Private flags are personal notes. Multiple owners’ dots stack vertically under separate shared/private-eye icons. Expose can privately show other players’ current private flags to its user. Ghost Flags are cosmetic and separate from both types.

Colored cell borders identify who cleared each manual cell and cascade. The left activity feed uses green for benefits, gray for neutral actions and red for harm to the viewer. Damage, zaps and other effects also float over affected avatars. Personal callouts stay visible for about 6.5 seconds; your own item uses stay visible for about 4.5 seconds. Mine, zap, hit, shield and victory/high-risk-guess sounds are synthesized locally. The sound toggle and volume control apply to these cues as well as turn cues. Browser audio starts only after a user gesture.

The built-in music uses a continuous original base, extra draft instruments and a different board-stage layer, with smooth transitions. Lobby and results keep the base. Custom audio remains local and is not uploaded. The results show shared flag payouts, omit Most Mines Hit when everyone has zero, and provide replay controls with synchronized activity. All mines, including hidden silent mines, are revealed only after the round ends; replay mine maps never appear in live snapshots.

## Scoring and underdog rewards

The server grades the player’s available information before opening a normal cell. Direct number deductions count as Obvious. Chained or subset deductions count as Pattern. Exact frontier and global-mine analysis can prove a Deep cell safe. Flags are ignored; fresh scan notes can establish known-safe cells. Fog and hidden-number effects limit the affected player’s view. Probability analysis uses a bounded search; an unfinished search never claims an approximate zero is Deep.

| Event | Base reward |
| --- | --- |
| Obvious / Pattern / Deep safe clear | 10 / 30 / 50 |
| Forced guess: no safe move could be proven | round(10 + 60p) |
| Reckless guess: a safe move could be proven | 5 |
| First clear | 15 |
| Each extra cell in one cascade | +1 |
| Later clear finishes the safe board | +30 |
| Correct shared flag at round end | +5 per owner/cell |
| Heart actually removed from another player | +5 per heart |
| Elimination / distinct assisting contributor | +50 / +10 |
| Successful non-damaging disruption | +10 |
| Disruption targets a current leader | +5 leader bounty |
| Opponent-forced Trip/Force Hand reveal | 0, including reveal bonuses |
| Mine reveal / timeout / private or ghost flag | 0 reveal points |

For guesses, p is modeled mine risk from 0 to 1. A forced 50/50 is 40 base points; a reckless 50/50 is 5. A trailing player who survives a forced guess at 40% or higher risk gets a big HAIL MARY! callout. That announces the reward already earned; it is not a second separate points award.

Let L be the leading participant score, S your score and gap = max(0, L-S). Full underdog multiplier = min(3, exp(1.5 × gap / max(100, L))). Ordinary safe clears cap that bonus multiplier at 1.25. Surviving guesses, Down-boosted turns and successful disruptive combat can use the full multiplier. Ordinary flag and passive electricity awards receive no underdog boost. The extra points are separately labeled Underdog bonus +X.

First add the reveal’s base, cascade, last-safe and applicable additive bonuses. Apply item multipliers and the eligible underdog multiplier, with a strict combined cap of ×8 on every positive award, then round. Adaptive at one heart doubles all positive sources and participates in the same cap. Glass Cannon doubles reveal rewards; Down factors add to it, and the strongest matching chess bonus multiplies the reveal. The final cap still wins over any combination. Score deductions are not amplified.

Disruption points reward a successfully landed, unblocked and unreflected non-damaging effect: Fog, Zap, Skip, Delay, Curse, hidden numbers, a non-damaging forced reveal or forced Jest. Damage and Poison procs instead receive actual heart-removal credit, with full underdog eligibility. Area Fog can pay once per affected opponent. Leader bounty is determined when that effect lands. Self effects do not earn disruption or attacker points.

Damage follows the responsible other player, including planted mines and Poison. Armor loss, blocked damage and self harm do not earn heart-removal points. The final source earns the elimination bonus regardless of earlier contributions; every other distinct player who removed that victim’s hearts earns an assist. Automatic reanimation prevents an elimination award for the intercepted death. Reset clears prior damage-contribution tracking for revived players. Normal unowned board mines have no attacker unless forced by another player.

## Item timing and protection

Anytime cards work during preparation and live play, including while waiting and while ghosted. Your-turn cards require a regular living turn. Passive cards activate automatically for living participants when their conditions occur. Charged cards spend one charge per valid target; most exhausted cards refresh each new round. Some passives refresh after a turn or cycle. Egg and Echo Shard are permanently disabled after use. A revival sacrifice is disabled for the rest of that round. Disabled cards cannot be restored while their restriction applies.

Echo Shard remains rare and can link eligible common, rare or legendary cards. Its exclusions are unchanged: no disabled cards, permanent-use cards such as Egg or Echo Shard, or already-linked cards. One linked refresh is available per round. Refresher restores only cards that were already used; it does not top up partially charged cards, add charges to unused cards or refresh itself.

| Resource or effect | Behavior |
| --- | --- |
| Hearts | At zero, eliminated unless a pre-elimination revival triggers |
| Armor | Absorbs damage before hearts; Plated Armor carries forward |
| Mine shield | Consumed to block one entire mine hit only |
| Yellow barrier | Consumed to block a harmful item or one whole damage event |
| Temporary yellow barrier | Same protection, expiring after your next turn |
| Vanish / Shadow | Briefly prevents direct targeting by other players’ items |
| Ricochet | Redirects a harmful targeted item once per round; no reflection chains |
| Curse | Temporarily locks manual and automatic item activation |

Temporary yellow barriers are consumed first. Hidden-number board effects bypass Ricochet and barriers. Existing Poison and board mines still matter while Vanished. Skip cancels an active or future turn; Delay moves a future turn to the cycle end. In timed rooms Zap halves a future timer, while in untimed rooms it moves a turn one place back. Galvanize can replace a zap with an early turn. Earlier moved-turn protection against Skip remains for actual turn-order moves.

Poison effects have separate action counters, staggered on application. Items, real automatic activations and reveal actions count, including Trip/Force Hand. A cascade is one action, and flag placement is not an action. Each Poison proc deals one nonlethal damage and raises its own next action threshold by one. Noxious Cloud also queues fog when an affected player actually takes poison damage. Grow gives at most two hearts, after six actions then nine more. Paranoid rewards completed full cycles, not opponent action spam.

## Board presets

Each entry is width × height / counted mines. Rounds 4 and 5 are used only in five-round games. Planting can change counted mines; silent mines never change the counter or numbered clues. Reset creates a new board at this round’s selected preset.

| Difficulty | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 |
| --- | --- | --- | --- | --- | --- |
| Easy | 6 × 6 / 5 | 8 × 8 / 9 | 10 × 10 / 15 | 12 × 12 / 23 | 14 × 14 / 32 |
| Normal | 8 × 8 / 10 | 10 × 10 / 18 | 12 × 12 / 28 | 14 × 14 / 38 | 16 × 16 / 50 |
| Hard | 10 × 10 / 22 | 12 × 12 / 34 | 14 × 14 / 48 | 16 × 16 / 64 | 18 × 18 / 82 |
| Extreme | 12 × 12 / 40 | 14 × 14 / 58 | 16 × 16 / 80 | 18 × 18 / 104 | 20 × 20 / 132 |

Balance numbers are playtest starting points. The named constants in lib/balance.js, the score table in lib/solver.js and combat bonuses in lib/game.js are intended for tuning after human playtests.



## Advanced item reference

All 62 current items follow. Party mode offers the curated subset; All items opens the complete catalog. These advanced explanations include interactions omitted from the compact cards.

### Scan

**COMMON / ANYTIME**

Publicly check whether a hidden cell is Mine or Safe.

Select this item, then a hidden cell.

Choose one uncleared cell. A public Mine or Safe marker is placed without opening it. The result checks the actual cell, including a silent mine. The card is usable during preparation, on your turn, or while waiting.

Super Scans expands the result to neighboring uncleared cells. Reticent Scans makes the result private. The guaranteed first opening may relocate mines; public Scan markers are refreshed then. Later silent placement can invalidate an earlier safe result without announcing its location.

### Risk Scanner

**COMMON / ANYTIME**

Show a cell’s mine risk and privately preview its points if safe.

Select this item, then a hidden cell.

Choose an uncleared cell. Publish its modeled counted-mine probability and privately show the base points it would earn if safe. This includes the former Postulate point preview; it never checks the real mine map to calculate that preview. Before the opening, preview the 15-point opening base; cascades and other bonuses are extra.

The estimate uses the viewer’s available numbered information. Reticent Scans keeps the risk result private; Super Scans adds neighboring uncleared cells. A private potential-points note accompanies the selected cell. Approximate search results and silent mines can make modeled risk unreliable. Marks become stale when the board changes.

### Truth Check

**COMMON / ANYTIME**

Privately check any flagged cell you can see.

Select this item, then a flagged cell you can see.

Choose any uncleared flagged cell visible to you: a shared flag, your own private flag, or a private flag shown by Expose. Privately mark the actual cell Mine or Safe without opening it. It can be used anytime during a live round, including by a ghost.

Unflagged hidden private flags do not become targetable merely because another player secretly owns one. The check result and private flag information are sent only to the user. The first opening may relocate mines and makes older private results stale.

### Mine Shield

**COMMON / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Automatically block one mine hit.

Automatic effect.

Automatically consume this card when you reveal a mine. It blocks the entire mine hit, including a multiplied Double, Triple, Quadruple Down, or Glass Cannon hit. Safe reveals do not spend it.

It does not block direct attacks, poison, point transfers or skipped turns. A yellow barrier is used before this card. Curse prevents automatic activation. Echo can provide a second block after the first use, and Refresher can restore a used card.

### Double Down

**COMMON / YOUR TURN / DISABLED WITH UNLIMITED LIVES**

This turn: ×2 reveal points; mines cost 2 hearts.

Activate this item to use it.

Activate on your own turn after the opening. All your reveal points and bonuses during that turn are multiplied by 2; an unblocked mine costs 2 hearts. Activation itself costs no heart.

It normally cannot stack with another Down card. With Glass Cannon, add 2 to the existing multiplier instead. Mine shields and yellow barriers block the full mine hit. Comeback is applied after reveal and item multipliers.

### Plant Mine

**COMMON / ANYTIME / AFTER FIRST CLEAR**

Plant a mine and update nearby numbers and the mine count.

Select this item, then a hidden cell.

After the first clear, choose any uncleared cell. If it was safe, plant an owned counted mine: increase the mine counter by one and update adjacent numbers, including numbers already revealed. Already-mined targets still spend the card without adding another mine.

Holding Silent Mine changes this and all your other planted mines into silent mines. Those placements do not change numbers or the counter, and their card use stays concealed until round end. Owned-mine damage, eliminations and assists are credited to the planter.

### Extra Heart

**COMMON / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Start each round with an extra heart.

Automatic effect.

Automatically add one heart at the start of each round, subject to the starting-hearts-plus-two cap. A newly obtained ready Extra Heart can also auto-activate during a live round for a living player.

This does not revive a ghost. Curse can defer automatic activation until unlock. Echo can provide one additional eligible refresh per round, but neither Echo nor Refresher bypasses the heart cap. Unlimited-lives rooms disable the card.

### Skip

**RARE / YOUR TURN**

End a player’s active turn or skip their next turn.

Select this item, then a player.

Use on your turn and select any living connected player, including yourself. If their turn is active it ends immediately; otherwise their next turn is skipped. The card opens no cell and gives no reveal points.

An early or reordered protected turn cannot be skipped. Vanish prevents targeting, a yellow barrier blocks the item, and Ricochet can redirect it. The normal timer-expiry rule still applies to an active player.

### Reverse

**RARE / ANYTIME**

Reverse upcoming turns.

Activate this item to use it.

Activate anytime during preparation or play to reverse the remaining normal turns. Players already across the cycle divider do not receive another turn in the same cycle.

Early-turn and strong Delay priorities are preserved. Subsequent cycles follow the reversed direction. Reverse is a room-order change, so it is not a targeted harmful item and does not trigger Ricochet.

### Fog

**RARE / ANYTIME**

Hide revealed numbers on every other player’s next turn.

Activate this item to use it.

Apply one pending fogged turn to every other living connected player. On each affected player’s next turn, revealed numbers in their server view become question marks; everyone else retains their normal view.

Each recipient resolves their own Vanish, yellow barrier and Ricochet protection. Reflections may fog the caster. Multiple applications queue separate affected turns. Fog does not change real numbers or the mine layout.

### Trip

**RARE / ANYTIME**

The next player clears a random cell for 0 points and keeps their normal move.

Activate this item to use it.

The next living player immediately clears a random uncleared cell. If another player caused this reveal, the victim receives zero reveal points, including cascade and last-safe bonuses. If alive, they still keep their normal move. The forced clear is an action for their poison and action counters.

Mines can eliminate, award damage credit to a mine owner or forcing source, and receive the danger-zone penalty. Chess chains and Duel do not use forced clears. Protection or Ricochet can block or redirect the effect. Reset reserves its caster’s opening, so Trip cannot steal it.

### Force Hand

**LEGENDARY / YOUR TURN**

Make a player clear a chosen cell; opponents earn 0 points and keep their normal move.

Select this item, then a player, then a hidden cell.

On your own turn, select any living player, including yourself, then an uncleared cell to reveal immediately for them. Another player earns zero points from this forced reveal; a self-targeted extra clear can score normally. A surviving target retains their regular move.

A mine can eliminate and attributes damage to its planter or forcing source. Ghosts cannot manually use this your-turn card because they have no regular turn. Protection and Ricochet apply; Reset’s reserved first clear cannot be stolen. The reveal counts as an action but does not advance chess chains or Duel.

### Silent Mine

**LEGENDARY / ANYTIME / AFTER FIRST CLEAR**

Plant a secret mine. All mines you place leave numbers and the counter unchanged.

Select this item, then a hidden cell.

After the opening, select an uncleared cell to plant an owned silent mine. It never contributes to adjacent numbers or the counted mine total. Zero-cell cascades do not automatically open silent mines.

Passive: every other mine you plant, including Plant Mine and Scatter, is silent as well. Secret placement use is announced only at round end. A Scan can detect the actual mine, but Risk Scanner models counted mines only. An already-mined target still spends the card.

### Expose

**LEGENDARY / ANYTIME**

Privately inspect everyone’s flags and earn 10 points per wrong flag.

Activate this item to use it.

Privately inspect all current shared and private flags on uncleared cells, including their owner colors, and privately check whether each flagged cell is an actual mine. Flags remain in place. A public Exposed! announcement signals the card use without publishing anyone’s private flag positions.

Earn 10 base points per wrong flag owner and visibility type. A player’s shared and private flags on one safe cell are two flags. Each caster can score a given unchanged board-cell-owner-visibility combination only once, so Refresher cannot repeatedly farm it. Another caster has a separate payout budget. Snapshot results do not reveal future private flag changes.

### Ricochet

**LEGENDARY / PASSIVE**

Automatically redirect one harmful item each round.

Automatic effect.

Automatically redirect a targeted harmful item to a random other living connected player, possibly its original caster. The card is then used. Reflections do not recursively trigger another Ricochet.

Vanish and yellow barriers are checked before Ricochet. Scythe protects each reflecting owner but hurts its caster at most once. A reflected Duel changes the opponent; if it returns to the challenger it fizzles. Board concealment and untargeted order changes are not reflected.

### Hit

**COMMON / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Remove 1 heart without eliminating the player.

Select this item, then a player.

Select any living connected player to deal one heart of nonlethal damage. Armor can absorb it first; the target is left with at least one heart. Trying to remove a protected last heart earns no damage points.

Vanish, yellow barriers and Ricochet apply. Mine shields do not block this attack. The responsible other player earns 5 base points for each actual heart removed, before comeback.

### Dagger

**RARE / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Remove 1 heart from a player. This can eliminate them.

Select this item, then a player.

Select any living connected player and deal one damage. If it removes their final heart after armor and protection, they are eliminated. It applies no separate skip or status effect.

Unlike Hit, this can eliminate. Vanish, yellow barriers and Ricochet apply, while mine shields do not. Reanimation resolves before the elimination bonus is awarded.

### Scythe

**LEGENDARY / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Remove 1 heart from everyone else without eliminating them.

Activate this item to use it.

Deal one nonlethal damage to every other living connected player. Each target keeps at least one heart; armor can absorb damage. The caster earns damage points for hearts actually removed.

Recipients resolve Vanish, yellow barriers and Ricochet independently. Every reflecting owner stays protected, but multiple reflections hurt the caster only once total and do not chain. The reflected hit remains nonlethal.

### Triple Down

**RARE / YOUR TURN / DISABLED WITH UNLIMITED LIVES**

This turn: ×3 reveal points; mines cost 3 hearts.

Activate this item to use it.

On your own turn after the opening, multiply your reveal reward by 3 and set an unblocked mine hit to 3 hearts. There is no immediate activation cost.

Normal Down cards cannot stack. Glass Cannon instead adds 3 to the existing turn multiplier. Reveal bonuses participate in the multiplication; comeback is added afterward. Mine shields and yellow barriers block the full hit.

### Quadruple Down

**LEGENDARY / YOUR TURN / DISABLED WITH UNLIMITED LIVES**

This turn: ×4 reveal points; mines cost 4 hearts.

Activate this item to use it.

On your own turn after the opening, multiply your reveal reward by 4 and set an unblocked mine hit to 4 hearts. Activating the card does not immediately remove hearts.

With Glass Cannon, add 4 to the current multiplier. Otherwise it cannot stack with another Down. The effect ends with your turn; a full mine block also blocks the multiplied damage.

### Jest

**LEGENDARY / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Force another player’s next turn to use Quadruple Down.

Select this item, then a player.

Choose another living player. Queue a forced Quadruple Down for their next actual turn: four times reveal points and four-heart mine damage. The player receives no inventory card and cannot decline or spend the queued effect early. Skipped turns do not consume it.

Existing concealment, yellow barriers and Ricochet apply. The target must not already have a queued forced Down. Glass Cannon combines with Down factors as usual, but an unblocked mine eliminates a Glass Cannon holder. The 8-times total award cap still applies. Successful unreflected use earns disruption points.

### Delay

**RARE / ANYTIME**

Send a player’s next turn to the end of the line.

Select this item, then a player.

Select a living connected player and move their upcoming turn to the end of the current cycle. If their turn is active or already completed, the delay applies in the next cycle.

In an untimed room this is stronger than Zapped, which moves only one place back. In timed rooms Zapped halves a timer rather than changing order. The delayed player still receives an owed turn and is protected from Skip. Vanish, yellow barriers and Ricochet can stop or redirect the application.

### Double Mine Shield

**RARE / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Gain 2 mine shields.

Activate this item to use it.

Activate to add two mine-shield charges for this round. Each charge blocks an entire mine hit, regardless of its Down multiplier, and is consumed automatically when needed.

Charges do not protect against attacks or poison. A yellow barrier, then a ready Mine Shield card, is consumed before these charges. Curse prevents automatic use. Unspent charges disappear when the round ends or Reset removes active buffs.

### Double Hearts

**RARE / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Gain 2 hearts.

Activate this item to use it.

Activate to gain up to two hearts immediately, without exceeding starting hearts plus two. For example, a room starting with three hearts caps healing at five. The card is still spent when already at the cap.

It cannot revive an eliminated ghost. Ghosts may spend owned anytime cards, but healing leaves them at zero hearts; only Reset revives an already eliminated participant. Unlimited-lives settings disable this card.

### Plated Armor

**LEGENDARY / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Gain 3 armor that carries across rounds until spent.

Activate this item to use it.

Activate to add three armor points. Armor absorbs ordinary heart damage first, one point per damage, and remaining armor carries across later rounds while you hold Plated Armor. The card itself refreshes normally, so another activation can add more armor.

Armor does not use the heart cap and is not a mine-only shield. It grants no heart-removal points when lost. Reset explicitly clears active armor along with other buffs. Glass Cannon’s lethal unblocked-mine rule overrides armor; mine shields and yellow barriers can block that mine hit first.

### Echo Shard

**RARE / ANYTIME**

Link an eligible item for one automatic refresh each round; permanently spend this shard.

Select this item, then an eligible item in your hand.

Select another enabled card in your hand and permanently attach one automatic refresh per round. The target can be passive, charged, or already used, but linking a used target does not refresh it immediately.

After the target is used it becomes ready once, then its Echo budget is exhausted until next round. Charged cards refresh only when their last charge is spent. Disabled cards, Egg, Echo Shard itself, and already-linked cards are ineligible. Echo Shard remains permanently disabled afterward.

### Refresher

**LEGENDARY / ANYTIME**

Refresh your used items.

Activate this item to use it.

Restore every eligible card that was already used before this activation. A used charged card regains its normal capacity. Unused cards, including partly spent charged cards, gain no extra use or charge.

It cannot restore permanently disabled Egg or Echo Shard, or a card sacrificed for the current round. It does not refresh itself or reset an Echo budget. An Echo-linked Refresher therefore has a bounded second use rather than an infinite loop.

### Egg

**COMMON / ANYTIME**

Hatch an unowned item of this egg’s rarity; unopened eggs grow rarer each round.

Activate this item to use it.

Open anytime during a round to obtain a random unowned enabled item matching the Egg’s current rarity. The reward is usable immediately; eligible automatic effects such as Extra Heart can activate on receipt.

An unopened Egg advances common to rare to legendary at each later round and then stays legendary. A pregame Egg starts common in round one. Opening permanently disables it. If all enabled items of that rarity are owned, opening is rejected without spending it.

### Poison

**RARE / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Poison a player for the round; its hits cannot eliminate them.

Select this item, then a player.

Choose a living player to poison for the rest of the round. The first effect triggers after three victim actions, resets its counter, then needs four actions, five actions and so on. Extra applications create separate effects starting one above the highest existing threshold.

Each proc deals one nonlethal damage: Poison cannot remove a final heart. Armor and yellow barriers can absorb it. Actual heart loss awards source-attributed damage points with the full applicable underdog bonus. Items, automatic item activations, normal reveals and Trip or Force Hand reveals count; flags and individual cascade cells do not.

### Noxious Cloud

**LEGENDARY / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Poison everyone else. Poison hits also fog their next turn.

Activate this item to use it.

Apply a separate nonlethal Poison effect to every other living connected player. Each recipient resolves concealment, yellow barriers and Ricochet. It does not poison the user unless a reflection redirects an application.

On affected players, any poison source that actually deals damage also queues fog for their next turn. Blocked or zero damage does not queue fog. Separate poison counters have staggered thresholds. Only Dagger and mines can eliminate, so poison cannot take a player’s final heart.

### Curse

**LEGENDARY / ANYTIME**

Skip a player’s next turn and briefly lock their items.

Select this item, then a player.

Select a player to queue one skipped turn and immediately lock their manual and automatic items. The lock lasts 5 seconds at zero- or 10-second turn timers, or 5 seconds plus 10% of a longer configured timer.

An active turn may still reveal cells. Early and moved protected turns cannot lose their owed turn, though the lock can apply. Existing armor remains health. Conditions earned by Grow, Paranoid, Batteries and Galvanize while locked resolve when the lock ends, without another action.

### Reactive Barrier

**COMMON / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Lose 1 heart to gain a mine shield; refresh after your turn.

Automatic effect.

After losing one actual heart while holding this card, automatically gain one mine shield. Armor loss and blocked damage do not count. It cannot respond after elimination. With Divine Barrier, the reward is a yellow barrier instead.

After it triggers, refresh after your next turn ends. The card tracks only heart losses since acquisition or refresh. Curse defers automatic activation while locked. A mine shield blocks one complete mine hit; a yellow barrier can instead block a harmful item or damage event.

### Paranoid

**RARE / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Gain a mine shield after each full turn cycle.

Automatic effect.

Automatically gain one mine shield after each full turn cycle while holding the card. It is based on completed cycles, not the number of opponents or how many items they use. Acquisition partway through a cycle waits until a complete held cycle finishes.

Each owner receives at most one Paranoid reward per cycle, even with Refresher or Echo. A reward earned in the current cycle while Cursed can trigger after the lock expires. The shield lasts for the current round, and shields block mines only. Ghosts have no regular turn-cycle reward.

### Divine Barrier

**LEGENDARY / PASSIVE / DISABLED WITH UNLIMITED LIVES**

At 1 heart, clear debuffs and gain 2 yellow barriers. Similar barrier items are upgraded.

Automatic effect.

When you have exactly one heart and the card can activate, remove poison, fog, queued skips, Curse, and delayed or Zapped status, then gain two yellow barriers. The actual delayed queue position is restored too.

Holding this card upgrades Reactive Barrier’s reward from a mine shield to a yellow barrier. The one-heart rescue does not heal or revive a zero-heart player. A current Curse lock prevents automatic activation until it ends.

### Glass Cannon

**LEGENDARY / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Gain ×2 reveal points, but an unblocked mine eliminates you. Start each round down 1 heart.

Automatic effect.

While enabled, your safe reveals have a base multiplier of two. At the start of every round, lose one heart without being eliminated by that starting cost. If you reveal an unblocked mine, it eliminates you regardless of your remaining hearts or armor.

Mine shields and yellow barriers block the entire hit before the lethal rule. Down factors may still add to Glass Cannon: base two plus Double two plus Triple three is a seven-times item multiplier, before chess and underdog. The final points award always caps at eight-times base. The passive applies to reveals, not every combat or flag award.

### Pawn

**COMMON / PASSIVE**

Follow your previous clear vertically or diagonally for ×1.5 points.

Automatic effect.

Your first normal safe clear arms a chain at that cell. On a later turn, clear one or two cells vertically, or one cell diagonally, from the anchor to earn a 1.5 multiplier. Matching clears re-anchor the chain and keep the card active.

A nonmatching normal follow-up or a mine spends the card. Same-turn bonus moves and forced reveals do not evaluate the follow-up. Queen upgrades Pawn to 2 times. Overlapping chess patterns award only the single highest chess multiplier, while every matching card can stay active.

### Knight

**RARE / PASSIVE**

Follow your previous clear with a knight’s L-shaped move for ×1.5 points; play earlier.

Automatic effect.

Arm a chain with a normal safe clear. A later-turn normal clear one-by-two or two-by-one cells away earns a 1.5 chess multiplier. Matching clears re-anchor; a nonmatch or mine spends the card.

At round start a lone Knight gets double weight in the opening-order lottery. With Queen, the player receives highest opening priority and one extra normal cell clear during their opening turn. Queen owners are prioritized by acquisition time, with random tie resolution.

### Rook

**RARE / PASSIVE**

Clear along your previous row or column for ×1.5 points; start with an extra heart.

Automatic effect.

After arming on a normal safe clear, a later-turn normal clear in the same row or column earns a 1.5 chess multiplier. A match keeps the chain; a nonmatch or mine spends it.

Automatically gain one heart at round start. With Queen, replace that starting heart with a lasting yellow barrier. The starting-health passive does not spend the chess-chain use. Refresher can restore a failed chain.

### Bishop

**RARE / PASSIVE**

Clear diagonally from your previous clear for ×1.5 points; gain a Plant Mine each round.

Automatic effect.

After arming on a normal safe clear, a later-turn clear on either diagonal earns a 1.5 chess multiplier. Matching moves keep the chain active; nonmatching normal moves or mines spend it.

At round start, obtain one Plant Mine even if you already own one. This is the explicit exception to unique loot. With Queen, receive Silent Mine instead, also allowing the specified duplicate. The gift itself does not plant a mine.

### Queen

**LEGENDARY / PASSIVE**

Clear along your previous row, column or diagonal for ×2 points. Similar chess items are upgraded.

Automatic effect.

On its own, Queen rewards a normal safe clear that follows your previous clear along the same row, column or diagonal on a later turn with a two-times reveal multiplier. A matching chain moves its origin and stays armed; a mismatch spends it. Forced reveals do not advance chains.

Chess upgrades remain extra benefits: Pawn follow-ups become two-times, Queen plus Knight grants earlier opening priority and an extra clear, Rook’s starting heart becomes a yellow barrier, and Bishop grants Silent Mine. Only the highest matching chess multiplier applies. Total award multipliers, including underdog and other cards, cap at eight-times.

### Silent Scan

**RARE / ANYTIME**

Privately check whether a hidden cell is Mine or Safe.

Select this item, then a hidden cell.

Select an uncleared cell and privately learn its actual Mine or Safe value without opening it. Other players do not receive the marker or location through the public result.

Super Scans adds all uncleared neighboring cells. Reticent Scans preserves the private result. A scan is an oracle for the cell at that moment; later silent placement can make an old safe note unreliable.

### Double Scan

**RARE / ANYTIME / 2 CHARGES**

2 charges: publicly scan hidden cells.

Select this item, then a hidden cell.

Two charges per fresh card. Select an uncleared cell to publicly mark its actual Mine or Safe result and spend one charge. The card becomes used after its second activation.

Super Scans expands each charge to neighboring cells; Reticent Scans makes it private. Refresher restores two charges only when the card is fully used. Echo triggers at exhaustion rather than after the first partial charge.

### Super Scans

**LEGENDARY / ANYTIME / 2 CHARGES**

2 area scans. Similar scan items also check neighbors.

Select this item, then a hidden cell.

Two charges. Each activation scans a selected uncleared cell and all its uncleared adjacent cells publicly. Revealed neighbors are ignored.

Passive: every held scan-family card gains this area pattern, including Silent Scan, Double Scan, Reticent Scans and Risk Scanner. Risk Scanner remains a probability estimate rather than becoming Mine or Safe. Reticent Scans can make the area result private.

### Reticent Scans

**LEGENDARY / ANYTIME / 2 CHARGES**

2 private scans. All your scans become private.

Select this item, then a hidden cell.

Two charges. Each activation privately scans a selected uncleared cell for its actual Mine or Safe value. Exhausting both charges makes the card used.

Passive: all held scan-family results become private, including Scan, Double Scan, Super Scans and Risk Scanner. Super Scans can expand private scans to an area. Risk Scanner retains its probability semantics and approximation label.

### Duel

**COMMON / ANYTIME / AFTER FIRST CLEAR / DISABLED WITH UNLIMITED LIVES**

Your next clears compete; steal points and 1 heart without eliminating the loser.

Select this item, then a player.

After the opening, choose another living player. Each contestant’s next normal clear records its deduction or guess base points, before cascade, last-safe, item and underdog modifiers; a mine records zero. Trip and Force Hand clears do not enter the contest.

The higher base score wins, stealing the loser’s recorded base points up to their available score and dealing one nonlethal damage. Ties do nothing. A one-heart loser cannot be eliminated by Duel. The winner’s positive stolen award can receive full underdog and Adaptive modifiers, capped at eight-times; the loser loses only the base transfer.

### Hide 2 Numbers

**COMMON / ANYTIME / 2 CHARGES / AFTER FIRST CLEAR**

2 charges: hide revealed numbers from everyone else.

Select this item, then a revealed number.

Two charges. Select a revealed positive number to replace it with a purple question mark for every other player. You retain the true number in your own personalized view. The real board value is unchanged.

This is a board-targeted effect and specifically bypasses Ricochet and yellow barriers. It can trigger Compensate on affected players. Reset clears the concealment. Refresher restores capacity only after both charges are used.

### Hide 3 Numbers

**RARE / ANYTIME / 3 CHARGES / AFTER FIRST CLEAR**

3 charges: hide revealed numbers from everyone else.

Select this item, then a revealed number.

Three charges. Hide a revealed positive number from everyone except yourself, spending one charge per chosen cell. It cannot target mines, empty zero cells, hidden cells, or a number you already hid.

The effect uses server-side masking and is not merely visual styling. It bypasses Ricochet and yellow barriers, and all three charges must be spent before ordinary Refresher or Echo capacity restoration.

### Adaptive

**LEGENDARY / PASSIVE / DISABLED WITH UNLIMITED LIVES**

While at 1 heart, earn ×2 points from every source.

Automatic effect.

While you have exactly one heart and this card is enabled, double every positive award: clears, combat, item rewards and flags. It is a continuous passive and does not spend itself on each award. Curse temporarily suppresses it.

It no longer accumulates additive points from lost hearts or board changes, and no longer grants its own reactive barrier. Its multiplier combines with other item effects and the applicable underdog bonus, but a single award can never exceed eight times its unmodified base.

### Electrify

**COMMON / ANYTIME / 2 CHARGES / AFTER FIRST CLEAR**

2 charges: electrify cells so their clearer’s next turn timer is halved.

Select this item, then a hidden cell.

Two charges. Choose an uncleared cell per charge to electrify it. Anyone who later clears that cell receives the Zap effect: their next turn timer is halved, or in an untimed room their next turn moves back one place. The cell is not opened by placement.

Common Electrify no longer spreads. Holding Galvanize enables the 5% turn-end spread chance for owned electricity. Yellow barriers can block a cell-triggered Zap. The planter can earn disruption points when the effect actually lands on someone else; electricity itself is not a mine and does not remove hearts.

### Zap!

**COMMON / ANYTIME**

Halve a player’s next turn timer.

Select this item, then a player.

Select any living player. In a timed room, halve their next actual turn’s configured timer. For example, 10 seconds becomes 5. It does not shorten a turn already in progress, stack repeated Zaps or itself remove a heart.

With No timer, move their next turn one place later instead, preserving the earlier untimed behavior. Delay remains stronger because it sends a turn to the end of the cycle. Protection and Ricochet apply to direct zaps. Galvanize can turn a zap into an early turn instead. An unreflected successful negative application earns disruption points.

### Galvanize

**RARE / ANYTIME / 3 CHARGES / AFTER FIRST CLEAR**

3 charges: electrify or zap. Your electricity can spread; a zap can move you early.

Select this item, then a hidden cell to electrify or a player to zap.

Three charges: select an uncleared cell to electrify it, or a living player to zap them. Zapped means half the next timed turn, or one place later in untimed rooms. Own electricity has a five-percent chance per eligible source cell to spread to an adjacent uncleared cell at each turn end.

Passive: one zap against you can move you early instead. This interception refreshes after five owner actions. Curse suspends automatic interception and spread. Common Electrify no longer spreads on its own; it benefits from the Galvanize passive while held. Successful unreflected zaps can award disruption points.

### Shocking Reanimation

**LEGENDARY / ANYTIME / 5 CHARGES / AFTER FIRST CLEAR / DISABLED WITH UNLIMITED LIVES**

5 charges: electrify or zap. Sacrifice an electrical item to automatically revive.

Select this item, then a hidden cell to electrify or a player to zap.

Five charges. Electrify an uncleared cell or zap a selected player. The passive works even after the active charges are exhausted, as long as the card is enabled and automatic items are not locked.

When lethal damage would eliminate you, sacrifice an enabled electrical card for the rest of the round, prioritizing common rarity first. Return with two hearts and one yellow barrier. It can sacrifice itself. The event counts as one automatic activation, reveals the passive and sacrifice, and prevents an elimination award for that intercepted death.

### Grow

**COMMON / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Gain a heart after 6 actions, then 9 more; at most 2 each round.

Automatic effect.

Automatically gain one heart after six owner actions, then after nine more owner actions. There are at most two Grow activations in a round. Reveals, manual items and actual automatic item activations count; flags and individual cascade cells do not.

After the first activation, the card refreshes after your turn ends. Progress begins at acquisition. The heart cap is starting hearts plus two; a completed trigger waits for room below the cap. Curse defers activation. Its own automatic activation can contribute an action toward the next threshold. Each actual reward is announced in one Grow line.

### Compensate

**RARE / PASSIVE / DISABLED WITH UNLIMITED LIVES**

Automatically gain a heart when a negative effect reaches you.

Automatic effect.

When an applied negative effect reaches you, automatically gain one heart and spend this card. It triggers after targeting protections have succeeded, so an item blocked by Vanish or a barrier does not grant compensation.

It can react to direct damage, poison, turn movement and other applied negative effects. Because the heart is gained before damage is resolved, it can prevent a one-heart target from being eliminated by a one-damage attack. Curse blocks the activation.

### Batteries

**RARE / ANYTIME / 2 CHARGES / AFTER FIRST CLEAR**

2 charges: electrify or zap. Electricity earns points; actions restore charges.

Select this item, then a hidden cell to electrify or a player to zap.

Two charges. Electrify a selected uncleared cell or zap another player. While held and enabled, earn 1 base point each time any cell is newly electrified or a player is successfully zapped; Adaptive can double that gain; ordinary electricity rewards do not receive underdog bonuses.

After five owner actions, restore one charge up to the normal capacity of two. A full card cannot bank extra charges. Counters begin on acquisition and reset on an applicable refresh. An earned recharge waits through Curse and resolves on unlock.

### Vanish

**RARE / ANYTIME**

Prevent other players’ items from targeting you briefly.

Activate this item to use it.

Vanish prevents other players from selecting you with directly targeted items for six seconds plus ten percent of the configured turn timer. It does not stop a mine you reveal, already applied Poison, or board-wide hidden-number effects.

The card keeps its internal identity so old collections remain compatible, but its displayed name is Vanish. Shadow upgrades its expiry to grant a temporary yellow barrier. It does not revive an eliminated ghost and concealment does not change turn eligibility.

### Shadow

**LEGENDARY / ANYTIME**

Become untargetable, then gain a temporary yellow barrier. Similar concealment items are upgraded.

Activate this item to use it.

Become untargetable by other players’ directly targeted items for ten seconds plus fifteen percent of the configured turn timer. When concealment expires, gain one yellow barrier that lasts through your next turn unless consumed earlier.

Similar concealment items are upgraded: Vanish gains this expiry-barrier reward. Existing poison and board mines still matter. Curse defers the automatic expiry reward until unlock. The unique Shadow icon distinguishes this card from Scythe.

### Don Armor

**RARE / ANYTIME / DISABLED WITH UNLIMITED LIVES**

Gain a yellow barrier until your next turn ends.

Activate this item to use it.

Activate to gain one temporary yellow barrier. It expires after your next turn ends if not consumed first. A yellow barrier blocks one whole harmful item or damage hit, not just one heart.

Temporary barriers are consumed before lasting ones. They can stop multiplied mine damage, targeted harmful items or poison damage. They do not block the explicitly exempt hidden-number board effects; Curse prevents new automatic barrier consumption.

### Scatter

**COMMON / ANYTIME / AFTER FIRST CLEAR**

Plant 2 mines in random hidden cells.

Activate this item to use it.

After the first clear, plant up to two owned mines in randomly selected uncleared safe cells. Locations are not privately revealed to the caster. Normal counted placement updates old and future neighboring numbers and increments the counter for every mine added.

Holding Silent Mine makes every placement silent: numbers and counter remain unchanged, and placement use stays concealed until round end. If fewer safe hidden cells remain, plant only that many. With no valid destination, activation is rejected.

### Scatter 2x

**RARE / ANYTIME / AFTER FIRST CLEAR**

Plant 4 mines in random hidden cells.

Activate this item to use it.

After the opening, randomly plant up to four owned mines in distinct uncleared safe cells. Ordinary placement changes adjacent numbers immediately, including visible numbers, and adds each mine to the counted total.

It shares Scatter’s hidden-location and Silent Mine passive rules. The card does not create duplicate mines on occupied cells. Added-mine damage credit goes to its owner, and actual board additions can increase Adaptive bonuses.

### Reset

**LEGENDARY / ANYTIME / AFTER FIRST CLEAR**

Reset the board and active effects. Revive eliminated players with 3 hearts and take the first clear.

Activate this item to use it.

After the opening, generate a fresh hidden board with this round’s board preset. Clear active buffs, debuffs, shields, armor, electricity, flags, private notes and armed chess positions. Scores, collections and item usage remain. Eliminated participants return with three hearts; living players keep their hearts.

Shuffle the living turn order and reserve the first turn and first clear for the caster. Ghosts can use an owned Reset and thereby rejoin play; other healing cards cannot revive ghosts. Reset does not refresh the once-per-round haunt budget, so being eliminated again does not grant another haunt. A new board restarts danger-zone tracking and Expose payouts.

### Spin

**RARE / ANYTIME / AFTER FIRST CLEAR**

Randomly rotate the board and shuffle everyone’s turns.

Activate this item to use it.

After the opening, rotate the entire board by a random 90, 180 or 270 degrees clockwise or counterclockwise, then randomize the turn order. Revealed numbers remain normally oriented and retain their values in their new positions.

Mines, shared flags, electricity, clear ownership, private flags, private notes and chess anchors move with their cells. No cell is opened by the rotation. Board dimensions swap on quarter-turns of a rectangular board. The shuffled order begins a new cycle; Spin does not erase health, scores or collections.

