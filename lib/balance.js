// Playtest tuning lives here rather than inside item handlers.
export const BALANCE=Object.freeze({safeComebackCap:1.25,underdogCap:3,totalAwardCap:8,comebackExponent:1.5,comebackFloor:100,disruptionPoints:10,leaderBounty:5,recklessGuess:5,forcedGuessBase:10,forcedGuessRisk:60,hailMaryRisk:.4,heartCapBonus:2,dangerFraction:.25,dangerMineBonus:1,reactiveHearts:1,growThresholds:[6,9],wrongFlagPoints:10,ghostSpookMs:1200,zapTimerFactor:.5,personalCalloutMs:6500});
export const PARTY_ITEMS=Object.freeze(['scan','risk_scanner','truth_check','shield','double_down','plant_mine','extra_heart','hit','reactive_barrier','grow','electrify','zap','skip','reverse','fog','trip','dagger','triple_down','delay','double_hearts','double_mine_shield','poison','don_armor','silent_mine','force_hand','jest','quadruple_down','ricochet','refresher','reset']);
export const DRAFT_GUARANTEES=Object.freeze([
 {rare:1,legendary:0,bonusChance:40,bonus:'rare'},
 {rare:1,legendary:0,bonusChance:100,bonus:'rare',legendaryUpgradeChance:35},
 {rare:1,legendary:1,bonusChance:35,bonus:'legendary'},
 {rare:2,legendary:1,bonusChance:50,bonus:'legendary'},
 {rare:1,legendary:2,bonusChance:50,bonus:'legendary'},
]);
