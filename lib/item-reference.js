// The player-facing cards stay concise. This reference documents the actual rules.
export const ITEM_DETAILS={
  scan:[
    'Choose one uncleared cell. A public Mine or Safe marker is placed without opening it. The result checks the actual cell, including a silent mine. The card is usable during preparation, on your turn, or while waiting.',
    'Super Scans expands the result to neighboring uncleared cells. Reticent Scans makes the result private. The guaranteed first opening may relocate mines; public Scan markers are refreshed then. Later silent placement can invalidate an earlier safe result without announcing its location.'
  ],
  risk_scanner:[
    "Choose an uncleared cell. Publish its modeled counted-mine probability and privately show the base points it would earn if safe. This includes the former Postulate point preview; it never checks the real mine map to calculate that preview. Before the opening, preview the 15-point opening base; cascades and other bonuses are extra.",
    "The estimate uses the viewer’s available numbered information. Reticent Scans keeps the risk result private; Super Scans adds neighboring uncleared cells. A private potential-points note accompanies the selected cell. Approximate search results and silent mines can make modeled risk unreliable. Marks become stale when the board changes."
  ],
  truth_check:[
    "Choose any uncleared flagged cell visible to you: a shared flag, your own private flag, or a private flag shown by Expose. Privately mark the actual cell Mine or Safe without opening it. It can be used anytime during a live round, including by a ghost.",
    "Unflagged hidden private flags do not become targetable merely because another player secretly owns one. The check result and private flag information are sent only to the user. The first opening may relocate mines and makes older private results stale."
  ],
  shield:[
    'Automatically consume this card when you reveal a mine. It blocks the entire mine hit, including a multiplied Double, Triple, Quadruple Down, or Glass Cannon hit. Safe reveals do not spend it.',
    'It does not block direct attacks, poison, point transfers or skipped turns. A yellow barrier is used before this card. Curse prevents automatic activation. Echo can provide a second block after the first use, and Refresher can restore a used card.'
  ],
  double_down:[
    'Activate on your own turn after the opening. All your reveal points and bonuses during that turn are multiplied by 2; an unblocked mine costs 2 hearts. Activation itself costs no heart.',
    'It normally cannot stack with another Down card. With Glass Cannon, add 2 to the existing multiplier instead. Mine shields and yellow barriers block the full mine hit. Comeback is applied after reveal and item multipliers.'
  ],
  plant_mine:[
    'After the first clear, choose any uncleared cell. If it was safe, plant an owned counted mine: increase the mine counter by one and update adjacent numbers, including numbers already revealed. Already-mined targets still spend the card without adding another mine.',
    'Holding Silent Mine changes this and all your other planted mines into silent mines. Those placements do not change numbers or the counter, and their card use stays concealed until round end. Owned-mine damage, eliminations and assists are credited to the planter.'
  ],
  extra_heart:[
    "Automatically add one heart at the start of each round, subject to the starting-hearts-plus-two cap. A newly obtained ready Extra Heart can also auto-activate during a live round for a living player.",
    "This does not revive a ghost. Curse can defer automatic activation until unlock. Echo can provide one additional eligible refresh per round, but neither Echo nor Refresher bypasses the heart cap. Unlimited-lives rooms disable the card."
  ],
  skip:[
    'Use on your turn and select any living connected player, including yourself. If their turn is active it ends immediately; otherwise their next turn is skipped. The card opens no cell and gives no reveal points.',
    'An early or reordered protected turn cannot be skipped. Vanish prevents targeting, a yellow barrier blocks the item, and Ricochet can redirect it. The normal timer-expiry rule still applies to an active player.'
  ],
  reverse:[
    'Activate anytime during preparation or play to reverse the remaining normal turns. Players already across the cycle divider do not receive another turn in the same cycle.',
    'Early-turn and strong Delay priorities are preserved. Subsequent cycles follow the reversed direction. Reverse is a room-order change, so it is not a targeted harmful item and does not trigger Ricochet.'
  ],
  fog:[
    'Apply one pending fogged turn to every other living connected player. On each affected player’s next turn, revealed numbers in their server view become question marks; everyone else retains their normal view.',
    'Each recipient resolves their own Vanish, yellow barrier and Ricochet protection. Reflections may fog the caster. Multiple applications queue separate affected turns. Fog does not change real numbers or the mine layout.'
  ],
  trip:[
    "The next living player immediately clears a random uncleared cell. If another player caused this reveal, the victim receives zero reveal points, including cascade and last-safe bonuses. If alive, they still keep their normal move. The forced clear is an action for their poison and action counters.",
    "Mines can eliminate, award damage credit to a mine owner or forcing source, and receive the danger-zone penalty. Chess chains and Duel do not use forced clears. Protection or Ricochet can block or redirect the effect. Reset reserves its caster’s opening, so Trip cannot steal it."
  ],
  force_hand:[
    "On your own turn, select any living player, including yourself, then an uncleared cell to reveal immediately for them. Another player earns zero points from this forced reveal; a self-targeted extra clear can score normally. A surviving target retains their regular move.",
    "A mine can eliminate and attributes damage to its planter or forcing source. Ghosts cannot manually use this your-turn card because they have no regular turn. Protection and Ricochet apply; Reset’s reserved first clear cannot be stolen. The reveal counts as an action but does not advance chess chains or Duel."
  ],
  silent_mine:[
    'After the opening, select an uncleared cell to plant an owned silent mine. It never contributes to adjacent numbers or the counted mine total. Zero-cell cascades do not automatically open silent mines.',
    'Passive: every other mine you plant, including Plant Mine and Scatter, is silent as well. Secret placement use is announced only at round end. A Scan can detect the actual mine, but Risk Scanner models counted mines only. An already-mined target still spends the card.'
  ],
  expose:[
    "Privately inspect all current shared and private flags on uncleared cells, including their owner colors, and privately check whether each flagged cell is an actual mine. Flags remain in place. A public Exposed! announcement signals the card use without publishing anyone’s private flag positions.",
    "Earn 10 base points per wrong flag owner and visibility type. A player’s shared and private flags on one safe cell are two flags. Each caster can score a given unchanged board-cell-owner-visibility combination only once, so Refresher cannot repeatedly farm it. Another caster has a separate payout budget. Snapshot results do not reveal future private flag changes."
  ],
  ricochet:[
    'Automatically redirect a targeted harmful item to a random other living connected player, possibly its original caster. The card is then used. Reflections do not recursively trigger another Ricochet.',
    'Vanish and yellow barriers are checked before Ricochet. Scythe protects each reflecting owner but hurts its caster at most once. A reflected Duel changes the opponent; if it returns to the challenger it fizzles. Board concealment and untargeted order changes are not reflected.'
  ],
  hit:[
    'Select any living connected player to deal one heart of nonlethal damage. Armor can absorb it first; the target is left with at least one heart. Trying to remove a protected last heart earns no damage points.',
    'Vanish, yellow barriers and Ricochet apply. Mine shields do not block this attack. The responsible other player earns 5 base points for each actual heart removed, before comeback.'
  ],
  dagger:[
    'Select any living connected player and deal one damage. If it removes their final heart after armor and protection, they are eliminated. It applies no separate skip or status effect.',
    'Unlike Hit, this can eliminate. Vanish, yellow barriers and Ricochet apply, while mine shields do not. Reanimation resolves before the elimination bonus is awarded.'
  ],
  scythe:[
    'Deal one nonlethal damage to every other living connected player. Each target keeps at least one heart; armor can absorb damage. The caster earns damage points for hearts actually removed.',
    'Recipients resolve Vanish, yellow barriers and Ricochet independently. Every reflecting owner stays protected, but multiple reflections hurt the caster only once total and do not chain. The reflected hit remains nonlethal.'
  ],
  triple_down:[
    'On your own turn after the opening, multiply your reveal reward by 3 and set an unblocked mine hit to 3 hearts. There is no immediate activation cost.',
    'Normal Down cards cannot stack. Glass Cannon instead adds 3 to the existing turn multiplier. Reveal bonuses participate in the multiplication; comeback is added afterward. Mine shields and yellow barriers block the full hit.'
  ],
  quadruple_down:[
    'On your own turn after the opening, multiply your reveal reward by 4 and set an unblocked mine hit to 4 hearts. Activating the card does not immediately remove hearts.',
    'With Glass Cannon, add 4 to the current multiplier. Otherwise it cannot stack with another Down. The effect ends with your turn; a full mine block also blocks the multiplied damage.'
  ],
  jest:[
    "Choose another living player. Queue a forced Quadruple Down for their next actual turn: four times reveal points and four-heart mine damage. The player receives no inventory card and cannot decline or spend the queued effect early. Skipped turns do not consume it.",
    "Existing concealment, yellow barriers and Ricochet apply. The target must not already have a queued forced Down. Glass Cannon combines with Down factors as usual, but an unblocked mine eliminates a Glass Cannon holder. The 8-times total award cap still applies. Successful unreflected use earns disruption points."
  ],
  delay:[
    'Select a living connected player and move their upcoming turn to the end of the current cycle. If their turn is active or already completed, the delay applies in the next cycle.',
    'In an untimed room this is stronger than Zapped, which moves only one place back. In timed rooms Zapped halves a timer rather than changing order. The delayed player still receives an owed turn and is protected from Skip. Vanish, yellow barriers and Ricochet can stop or redirect the application.'
  ],
  double_mine_shield:[
    'Activate to add two mine-shield charges for this round. Each charge blocks an entire mine hit, regardless of its Down multiplier, and is consumed automatically when needed.',
    'Charges do not protect against attacks or poison. A yellow barrier, then a ready Mine Shield card, is consumed before these charges. Curse prevents automatic use. Unspent charges disappear when the round ends or Reset removes active buffs.'
  ],
  double_hearts:[
    "Activate to gain up to two hearts immediately, without exceeding starting hearts plus two. For example, a room starting with three hearts caps healing at five. The card is still spent when already at the cap.",
    "It cannot revive an eliminated ghost. Ghosts may spend owned anytime cards, but healing leaves them at zero hearts; only Reset revives an already eliminated participant. Unlimited-lives settings disable this card."
  ],
  plated_armor:[
    "Activate to add three armor points. Armor absorbs ordinary heart damage first, one point per damage, and remaining armor carries across later rounds while you hold Plated Armor. The card itself refreshes normally, so another activation can add more armor.",
    "Armor does not use the heart cap and is not a mine-only shield. It grants no heart-removal points when lost. Reset explicitly clears active armor along with other buffs. Glass Cannon’s lethal unblocked-mine rule overrides armor; mine shields and yellow barriers can block that mine hit first."
  ],
  echo_shard:[
    'Select another enabled card in your hand and permanently attach one automatic refresh per round. The target can be passive, charged, or already used, but linking a used target does not refresh it immediately.',
    'After the target is used it becomes ready once, then its Echo budget is exhausted until next round. Charged cards refresh only when their last charge is spent. Disabled cards, Egg, Echo Shard itself, and already-linked cards are ineligible. Echo Shard remains permanently disabled afterward.'
  ],
  refresher:[
    'Restore every eligible card that was already used before this activation. A used charged card regains its normal capacity. Unused cards, including partly spent charged cards, gain no extra use or charge.',
    'It cannot restore permanently disabled Egg or Echo Shard, or a card sacrificed for the current round. It does not refresh itself or reset an Echo budget. An Echo-linked Refresher therefore has a bounded second use rather than an infinite loop.'
  ],
  egg:[
    'Open anytime during a round to obtain a random unowned enabled item matching the Egg’s current rarity. The reward is usable immediately; eligible automatic effects such as Extra Heart can activate on receipt.',
    'An unopened Egg advances common to rare to legendary at each later round and then stays legendary. A pregame Egg starts common in round one. Opening permanently disables it. If all enabled items of that rarity are owned, opening is rejected without spending it.'
  ],
  poison:[
    "Choose a living player to poison for the rest of the round. The first effect triggers after three victim actions, resets its counter, then needs four actions, five actions and so on. Extra applications create separate effects starting one above the highest existing threshold.",
    "Each proc deals one nonlethal damage: Poison cannot remove a final heart. Armor and yellow barriers can absorb it. Actual heart loss awards source-attributed damage points with the full applicable underdog bonus. Items, automatic item activations, normal reveals and Trip or Force Hand reveals count; flags and individual cascade cells do not."
  ],
  noxious_cloud:[
    "Apply a separate nonlethal Poison effect to every other living connected player. Each recipient resolves concealment, yellow barriers and Ricochet. It does not poison the user unless a reflection redirects an application.",
    "On affected players, any poison source that actually deals damage also queues fog for their next turn. Blocked or zero damage does not queue fog. Separate poison counters have staggered thresholds. Only Dagger and mines can eliminate, so poison cannot take a player’s final heart."
  ],
  curse:[
    'Select a player to queue one skipped turn and immediately lock their manual and automatic items. The lock lasts 5 seconds at zero- or 10-second turn timers, or 5 seconds plus 10% of a longer configured timer.',
    'An active turn may still reveal cells. Early and moved protected turns cannot lose their owed turn, though the lock can apply. Existing armor remains health. Conditions earned by Grow, Paranoid, Batteries and Galvanize while locked resolve when the lock ends, without another action.'
  ],
  reactive_barrier:[
    "After losing one actual heart while holding this card, automatically gain one mine shield. Armor loss and blocked damage do not count. It cannot respond after elimination. With Divine Barrier, the reward is a yellow barrier instead.",
    "After it triggers, refresh after your next turn ends. The card tracks only heart losses since acquisition or refresh. Curse defers automatic activation while locked. A mine shield blocks one complete mine hit; a yellow barrier can instead block a harmful item or damage event."
  ],
  paranoid:[
    "Automatically gain one mine shield after each full turn cycle while holding the card. It is based on completed cycles, not the number of opponents or how many items they use. Acquisition partway through a cycle waits until a complete held cycle finishes.",
    "Each owner receives at most one Paranoid reward per cycle, even with Refresher or Echo. A reward earned in the current cycle while Cursed can trigger after the lock expires. The shield lasts for the current round, and shields block mines only. Ghosts have no regular turn-cycle reward."
  ],
  divine_barrier:[
    'When you have exactly one heart and the card can activate, remove poison, fog, queued skips, Curse, and delayed or Zapped status, then gain two yellow barriers. The actual delayed queue position is restored too.',
    'Holding this card upgrades Reactive Barrier’s reward from a mine shield to a yellow barrier. The one-heart rescue does not heal or revive a zero-heart player. A current Curse lock prevents automatic activation until it ends.'
  ],
  glass_cannon:[
    "While enabled, your safe reveals have a base multiplier of two. At the start of every round, lose one heart without being eliminated by that starting cost. If you reveal an unblocked mine, it eliminates you regardless of your remaining hearts or armor.",
    "Mine shields and yellow barriers block the entire hit before the lethal rule. Down factors may still add to Glass Cannon: base two plus Double two plus Triple three is a seven-times item multiplier, before chess and underdog. The final points award always caps at eight-times base. The passive applies to reveals, not every combat or flag award."
  ],
  pawn:[
    'Your first normal safe clear arms a chain at that cell. On a later turn, clear one or two cells vertically, or one cell diagonally, from the anchor to earn a 1.5 multiplier. Matching clears re-anchor the chain and keep the card active.',
    'A nonmatching normal follow-up or a mine spends the card. Same-turn bonus moves and forced reveals do not evaluate the follow-up. Queen upgrades Pawn to 2 times. Overlapping chess patterns award only the single highest chess multiplier, while every matching card can stay active.'
  ],
  knight:[
    'Arm a chain with a normal safe clear. A later-turn normal clear one-by-two or two-by-one cells away earns a 1.5 chess multiplier. Matching clears re-anchor; a nonmatch or mine spends the card.',
    'At round start a lone Knight gets double weight in the opening-order lottery. With Queen, the player receives highest opening priority and one extra normal cell clear during their opening turn. Queen owners are prioritized by acquisition time, with random tie resolution.'
  ],
  rook:[
    'After arming on a normal safe clear, a later-turn normal clear in the same row or column earns a 1.5 chess multiplier. A match keeps the chain; a nonmatch or mine spends it.',
    'Automatically gain one heart at round start. With Queen, replace that starting heart with a lasting yellow barrier. The starting-health passive does not spend the chess-chain use. Refresher can restore a failed chain.'
  ],
  bishop:[
    'After arming on a normal safe clear, a later-turn clear on either diagonal earns a 1.5 chess multiplier. Matching moves keep the chain active; nonmatching normal moves or mines spend it.',
    'At round start, obtain one Plant Mine even if you already own one. This is the explicit exception to unique loot. With Queen, receive Silent Mine instead, also allowing the specified duplicate. The gift itself does not plant a mine.'
  ],
  queen:[
    "On its own, Queen rewards a normal safe clear that follows your previous clear along the same row, column or diagonal on a later turn with a two-times reveal multiplier. A matching chain moves its origin and stays armed; a mismatch spends it. Forced reveals do not advance chains.",
    "Chess upgrades remain extra benefits: Pawn follow-ups become two-times, Queen plus Knight grants earlier opening priority and an extra clear, Rook’s starting heart becomes a yellow barrier, and Bishop grants Silent Mine. Only the highest matching chess multiplier applies. Total award multipliers, including underdog and other cards, cap at eight-times."
  ],
  silent_scan:[
    'Select an uncleared cell and privately learn its actual Mine or Safe value without opening it. Other players do not receive the marker or location through the public result.',
    'Super Scans adds all uncleared neighboring cells. Reticent Scans preserves the private result. A scan is an oracle for the cell at that moment; later silent placement can make an old safe note unreliable.'
  ],
  double_scan:[
    'Two charges per fresh card. Select an uncleared cell to publicly mark its actual Mine or Safe result and spend one charge. The card becomes used after its second activation.',
    'Super Scans expands each charge to neighboring cells; Reticent Scans makes it private. Refresher restores two charges only when the card is fully used. Echo triggers at exhaustion rather than after the first partial charge.'
  ],
  super_scans:[
    'Two charges. Each activation scans a selected uncleared cell and all its uncleared adjacent cells publicly. Revealed neighbors are ignored.',
    'Passive: every held scan-family card gains this area pattern, including Silent Scan, Double Scan, Reticent Scans and Risk Scanner. Risk Scanner remains a probability estimate rather than becoming Mine or Safe. Reticent Scans can make the area result private.'
  ],
  reticent_scans:[
    'Two charges. Each activation privately scans a selected uncleared cell for its actual Mine or Safe value. Exhausting both charges makes the card used.',
    'Passive: all held scan-family results become private, including Scan, Double Scan, Super Scans and Risk Scanner. Super Scans can expand private scans to an area. Risk Scanner retains its probability semantics and approximation label.'
  ],
  duel:[
    "After the opening, choose another living player. Each contestant’s next normal clear records its deduction or guess base points, before cascade, last-safe, item and underdog modifiers; a mine records zero. Trip and Force Hand clears do not enter the contest.",
    "The higher base score wins, stealing the loser’s recorded base points up to their available score and dealing one nonlethal damage. Ties do nothing. A one-heart loser cannot be eliminated by Duel. The winner’s positive stolen award can receive full underdog and Adaptive modifiers, capped at eight-times; the loser loses only the base transfer."
  ],
  hide_two_numbers:[
    'Two charges. Select a revealed positive number to replace it with a purple question mark for every other player. You retain the true number in your own personalized view. The real board value is unchanged.',
    'This is a board-targeted effect and specifically bypasses Ricochet and yellow barriers. It can trigger Compensate on affected players. Reset clears the concealment. Refresher restores capacity only after both charges are used.'
  ],
  hide_three_numbers:[
    'Three charges. Hide a revealed positive number from everyone except yourself, spending one charge per chosen cell. It cannot target mines, empty zero cells, hidden cells, or a number you already hid.',
    'The effect uses server-side masking and is not merely visual styling. It bypasses Ricochet and yellow barriers, and all three charges must be spent before ordinary Refresher or Echo capacity restoration.'
  ],
  adaptive:[
    "While you have exactly one heart and this card is enabled, double every positive award: clears, combat, item rewards and flags. It is a continuous passive and does not spend itself on each award. Curse temporarily suppresses it.",
    "It no longer accumulates additive points from lost hearts or board changes, and no longer grants its own reactive barrier. Its multiplier combines with other item effects and the applicable underdog bonus, but a single award can never exceed eight times its unmodified base."
  ],
  electrify:[
    "Two charges. Choose an uncleared cell per charge to electrify it. Anyone who later clears that cell receives the Zap effect: their next turn timer is halved, or in an untimed room their next turn moves back one place. The cell is not opened by placement.",
    "Common Electrify no longer spreads. Holding Galvanize enables the 5% turn-end spread chance for owned electricity. Yellow barriers can block a cell-triggered Zap. The planter can earn disruption points when the effect actually lands on someone else; electricity itself is not a mine and does not remove hearts."
  ],
  zap:[
    "Select any living player. In a timed room, halve their next actual turn’s configured timer. For example, 10 seconds becomes 5. It does not shorten a turn already in progress, stack repeated Zaps or itself remove a heart.",
    "With No timer, move their next turn one place later instead, preserving the earlier untimed behavior. Delay remains stronger because it sends a turn to the end of the cycle. Protection and Ricochet apply to direct zaps. Galvanize can turn a zap into an early turn instead. An unreflected successful negative application earns disruption points."
  ],
  galvanize:[
    "Three charges: select an uncleared cell to electrify it, or a living player to zap them. Zapped means half the next timed turn, or one place later in untimed rooms. Own electricity has a five-percent chance per eligible source cell to spread to an adjacent uncleared cell at each turn end.",
    "Passive: one zap against you can move you early instead. This interception refreshes after five owner actions. Curse suspends automatic interception and spread. Common Electrify no longer spreads on its own; it benefits from the Galvanize passive while held. Successful unreflected zaps can award disruption points."
  ],
  shocking_reanimation:[
    'Five charges. Electrify an uncleared cell or zap a selected player. The passive works even after the active charges are exhausted, as long as the card is enabled and automatic items are not locked.',
    'When lethal damage would eliminate you, sacrifice an enabled electrical card for the rest of the round, prioritizing common rarity first. Return with two hearts and one yellow barrier. It can sacrifice itself. The event counts as one automatic activation, reveals the passive and sacrifice, and prevents an elimination award for that intercepted death.'
  ],
  grow:[
    "Automatically gain one heart after six owner actions, then after nine more owner actions. There are at most two Grow activations in a round. Reveals, manual items and actual automatic item activations count; flags and individual cascade cells do not.",
    "After the first activation, the card refreshes after your turn ends. Progress begins at acquisition. The heart cap is starting hearts plus two; a completed trigger waits for room below the cap. Curse defers activation. Its own automatic activation can contribute an action toward the next threshold. Each actual reward is announced in one Grow line."
  ],
  compensate:[
    'When an applied negative effect reaches you, automatically gain one heart and spend this card. It triggers after targeting protections have succeeded, so an item blocked by Vanish or a barrier does not grant compensation.',
    'It can react to direct damage, poison, turn movement and other applied negative effects. Because the heart is gained before damage is resolved, it can prevent a one-heart target from being eliminated by a one-damage attack. Curse blocks the activation.'
  ],
  batteries:[
    'Two charges. Electrify a selected uncleared cell or zap another player. While held and enabled, earn 1 base point each time any cell is newly electrified or a player is successfully zapped; Adaptive can double that gain; ordinary electricity rewards do not receive underdog bonuses.',
    'After five owner actions, restore one charge up to the normal capacity of two. A full card cannot bank extra charges. Counters begin on acquisition and reset on an applicable refresh. An earned recharge waits through Curse and resolves on unlock.'
  ],
  hide:[
    "Vanish prevents other players from selecting you with directly targeted items for six seconds plus ten percent of the configured turn timer. It does not stop a mine you reveal, already applied Poison, or board-wide hidden-number effects.",
    "The card keeps its internal identity so old collections remain compatible, but its displayed name is Vanish. Shadow upgrades its expiry to grant a temporary yellow barrier. It does not revive an eliminated ghost and concealment does not change turn eligibility."
  ],
  shadow:[
    "Become untargetable by other players’ directly targeted items for ten seconds plus fifteen percent of the configured turn timer. When concealment expires, gain one yellow barrier that lasts through your next turn unless consumed earlier.",
    "Similar concealment items are upgraded: Vanish gains this expiry-barrier reward. Existing poison and board mines still matter. Curse defers the automatic expiry reward until unlock. The unique Shadow icon distinguishes this card from Scythe."
  ],
  don_armor:[
    'Activate to gain one temporary yellow barrier. It expires after your next turn ends if not consumed first. A yellow barrier blocks one whole harmful item or damage hit, not just one heart.',
    'Temporary barriers are consumed before lasting ones. They can stop multiplied mine damage, targeted harmful items or poison damage. They do not block the explicitly exempt hidden-number board effects; Curse prevents new automatic barrier consumption.'
  ],
  scatter:[
    'After the first clear, plant up to two owned mines in randomly selected uncleared safe cells. Locations are not privately revealed to the caster. Normal counted placement updates old and future neighboring numbers and increments the counter for every mine added.',
    'Holding Silent Mine makes every placement silent: numbers and counter remain unchanged, and placement use stays concealed until round end. If fewer safe hidden cells remain, plant only that many. With no valid destination, activation is rejected.'
  ],
  scatter_2x:[
    'After the opening, randomly plant up to four owned mines in distinct uncleared safe cells. Ordinary placement changes adjacent numbers immediately, including visible numbers, and adds each mine to the counted total.',
    'It shares Scatter’s hidden-location and Silent Mine passive rules. The card does not create duplicate mines on occupied cells. Added-mine damage credit goes to its owner, and actual board additions can increase Adaptive bonuses.'
  ],
  reset:[
    "After the opening, generate a fresh hidden board with this round’s board preset. Clear active buffs, debuffs, shields, armor, electricity, flags, private notes and armed chess positions. Scores, collections and item usage remain. Eliminated participants return with three hearts; living players keep their hearts.",
    "Shuffle the living turn order and reserve the first turn and first clear for the caster. Ghosts can use an owned Reset and thereby rejoin play; other healing cards cannot revive ghosts. Reset does not refresh the once-per-round haunt budget, so being eliminated again does not grant another haunt. A new board restarts danger-zone tracking and Expose payouts."
  ],
  spin:[
    'After the opening, rotate the entire board by a random 90, 180 or 270 degrees clockwise or counterclockwise, then randomize the turn order. Revealed numbers remain normally oriented and retain their values in their new positions.',
    'Mines, shared flags, electricity, clear ownership, private flags, private notes and chess anchors move with their cells. No cell is opened by the rotation. Board dimensions swap on quarter-turns of a rectangular board. The shuffled order begins a new cycle; Spin does not erase health, scores or collections.'
  ],
};
