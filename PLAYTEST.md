# Sweep Brawl v0.8.0 acceptance

## Automated coverage

- Ghost eligibility, one use per round, harmless flags/spooks, anytime cards, no healing revival, Reset revival and ghost bots.
- Party pool and All items permissions; shared guaranteed rarity slots, fixed reroll rarities and unique loot.
- Obvious/Pattern/Deep deductions, forced/reckless guesses, Hail Mary eligibility, safe/underdog caps and the combined ×8 cap.
- Disruption credit, leader bounty, blocked/reflected effects, damage ownership and nonlethal Poison/Duel.
- Forced Jest, Risk Scanner point previews, broader Truth Check, private Expose, Adaptive, Queen, Reactive Barrier, Paranoid and capped Grow.
- Persistent Plated Armor, heart cap, lethal Glass Cannon and announced Danger zone.
- Timed Zap, untimed one-place fallback, common electricity without spread and Galvanize spread.
- Existing turn, preparation, reconnect, flag, draft, item, solver oracle and WebSocket privacy checks.

## Browser acceptance

Board controls update: new lobbies default to 15 seconds, the timer is inside the board bar, floating log panels are absent, and flags use reversible local previews. Cells/cards acknowledge pending actions immediately, duplicate clicks are ignored while pending, and Sites polling yields to active player requests.

Sites responsiveness patch: idle room polls return a small unchanged response without a storage write until the heartbeat is due. Verified the timer dropdown remains open across polls and a second player joining, and its chosen value persists. Hosting/client tests cover unchanged state suppression and the read-only idle path.

Checked October 28, 2026: ghost flag budget and icon, ghost-owned anytime items, disabled turn-only items, merged Risk Scanner preview, Reset revival/first clear, independent ghost spook, zero-mine results, shared flag payout, Party default, all four bot selectors, and layouts at 390×844 and 844×390. Browser console had no warnings or errors. The procedural cues are wired and covered by interaction checks; a human listening pass remains recommended. All 26 PDF pages were rendered and reviewed; all 62 item names were verified. The public WebSocket smoke test passed with two independent clients.

- Verify one ghost can use a haunt and owned anytime cards while spectators cannot.
- Verify avatar popups and persistent personal explanations after damage, shield blocks, Fog and Zap.
- Use F/V, right-click, touch-size layout and zoom on desktop, portrait and short landscape.
- Confirm action sounds respect mute/volume after a user gesture.
- Confirm Party is default, All items has 62 entries, and no Postulate card remains.
- Check results omit the zero-mine accolade and include shared flag payouts.
- Inspect all rulebook pages and the README GIF.

## Human follow-up

Play several games with people on separate devices, including cellular and Wi-Fi. Compare Easy and Hard bot deduction rewards, underdog point shares, elimination frequency and readability. Balance values remain named starting points, not a guarantee of a particular winner. Rooms are in memory, and the temporary preview requires this computer and sharing process to stay running.
