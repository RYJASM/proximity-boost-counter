# Effective Excitement Contribution Calculation

How the plugin estimates how much of a ride's live excitement rating comes from proximity and station scenery bonuses.

---

## The Problem

The plugin already computes the raw proximity and scenery excitement deltas by walking the ride track and replicating the game's bonus logic. However, these deltas are calculated **before** two post-processing steps the game applies to the total excitement score:

1. An **intensity penalty** that scales the entire excitement value down if intensity is too high.
2. An **entry multiplier** that scales the entire excitement value up or down based on the vehicle variant.

Because both steps operate on the **total** excitement (not just individual bonuses), we can't simply read the live excitement and subtract our raw delta. We need to scale our deltas by the same factors the game would have applied to them.

---

## Data Sources

| Source | What it provides |
|---|---|
| `ride.excitement` (plugin API) | Live total excitement in raw internal units (÷100 = display value) |
| `ride.intensity` (plugin API) | Live intensity in raw internal units (÷100 = display value) |
| `ride.object.identifier` (plugin API) | The vehicle entry identifier e.g. `"rct2.ride.bmfl"` |
| `ENTRY_MULTIPLIERS` (bundled JSON) | Per-entry `{ e, i, n }` multiplier values extracted from OpenRCT2 object files |
| Plugin proximity analysis | Raw and effective proximity/scenery excitement deltas (already in display units) |

---

## Step 1 — Intensity Penalty Factor

Source reference: `RideRatingsApplyIntensityPenalty()` in `RideRatings.cpp`.

If a ride's intensity exceeds any of five thresholds, excitement is reduced by 25% per threshold crossed. The thresholds are checked sequentially, each multiplying the remaining excitement by 0.75:

| Threshold (raw) | Display | Factor applied |
|---|---|---|
| 1000 | 10.00 | × 0.75 |
| 1100 | 11.00 | × 0.75 |
| 1200 | 12.00 | × 0.75 |
| 1320 | 13.20 | × 0.75 |
| 1450 | 14.50 | × 0.75 |

A ride exceeding all five thresholds would have its excitement multiplied by `0.75^5 ≈ 0.237` — losing ~76% of its excitement.

```js
function getIntensityPenalty(ride) {
    var i = ride.intensity;
    var f = 1.0;
    if (i >= 1000) f *= 0.75;
    if (i >= 1100) f *= 0.75;
    if (i >= 1200) f *= 0.75;
    if (i >= 1320) f *= 0.75;
    if (i >= 1450) f *= 0.75;
    return f;
}
```

---

## Step 2 — Entry Multiplier Factor

Source reference: `RideRatingsApplyAdjustments()` in `RideRatings.cpp`.

After the intensity penalty, the game applies a per-vehicle-entry multiplier:

```cpp
ratings.excitement += (ratings.excitement * rideEntry->excitement_multiplier) >> 7;
```

This is equivalent to multiplying excitement by `(128 + e) / 128`, or `1 + (e / 128)`.

The multiplier values are stored per vehicle entry in OpenRCT2's ride object JSON files under the key `ratingMultipler` (note: typo in source — missing second `i`). These are extracted at build time by `extractors/extract_entry_multipliers.cjs` and bundled into the plugin as `ENTRY_MULTIPLIERS`.

```js
function getEntryMultiplierFactor(ride) {
    var id = ride.object ? ride.object.identifier : null;
    var m = id ? ENTRY_MULTIPLIERS[id] : null;
    var e = m ? m.e : 0;   // defaults to 0 if not in table (no adjustment)
    return 1 + (e / 128);
}
```

**Examples:**

| Identifier | e | Factor | Effect |
|---|---|---|---|
| `rct2.ride.bmfl` (B&M Floorless) | 10 | × 1.078 | +7.8% excitement |
| `rct2.ride.jski` (Jet Skis) | 75 | × 1.586 | +58.6% excitement |
| `rct2.ride.arrt1` (Arrow Corkscrew) | 0 | × 1.000 | no change |
| `rct2.ride.clift2` (Chairlift) | 0 | × 1.000 | no change |

If the ride uses a custom or unknown object entry not present in `ENTRY_MULTIPLIERS`, `e` defaults to `0` and the factor is `1.0` — a safe neutral fallback.

---

## Step 3 — Combined Scale Factor

Both adjustments are multiplicative and apply to the entire excitement value, so their combined effect is simply:

```js
var penaltyFactor    = getIntensityPenalty(ride);
var multiplierFactor = getEntryMultiplierFactor(ride);
var scaleFactor      = penaltyFactor * multiplierFactor;
```

---

## Step 4 — Effective Contribution (per-row)

The plugin replicates `ride_ratings_get_proximity_score` exactly. Each bucket in `boosts.json` carries `scoreHelper`, `scoreMult`, `scoreFixed`, and (for `queue_path_over`) `scorePreAdd` taken directly from the source.

`computeBucketScore(rawCount, bucket)` implements the three helper functions:

```js
// helper_1: floor(min(x, cap) * scoreMult / 65536)
// helper_2: if x > 0, x += seed; floor(min(x, cap) * scoreMult / 65536)
// helper_3: rawCount > 0 ? scoreFixed : 0
// scorePreAdd (queue_path_over only): always adds 8 before helper_1, even when raw = 0
function computeBucketScore(rawCount, bucket) {
    var h = bucket.scoreHelper;
    if (!h) return 0;
    if (h === 3) return rawCount > 0 ? bucket.scoreFixed : 0;
    var x = rawCount;
    if (bucket.scorePreAdd) x += bucket.scorePreAdd;      // unconditional
    else if (h === 2 && x > 0 && bucket.seed) x += bucket.seed; // conditional
    return Math.floor((Math.min(x, bucket.cap) * bucket.scoreMult) / 65536);
}
```

Each bucket's score contribution is then converted to an excitement delta and scaled:

```js
var bScore  = computeBucketScore(rawCount, bucket);  // score units
var excite  = Math.floor((bScore * BonusProximity_e) / 65536) / 100; // display units
var impact  = excite * scaleFactor;  // post-penalty, post-multiplier
```

For the total proximity excitement shown in the header summary, all bucket scores are summed first, then `BonusProximity.e` is applied once to the total — matching the game's single multiply exactly.

**queue_path_over baseline:** The `scorePreAdd` of 8 means this bucket contributes a minimum of `min(8, 12) × 6.25 = 50` proximity score points even when there are no queue paths. This is the game's built-in baseline and is now correctly included in impact calculations.

---

## Step 5 — "Without" Estimate *(not yet implemented)*

The math supports computing a single "excitement without proximity/scenery" estimate:

```
final_with    = (base + other + proximity + scenery) × penalty × multiplier
final_without = (base + other                      ) × penalty × multiplier
difference    =                (proximity + scenery) × penalty × multiplier
```

So the total contribution of all proximity and scenery rows combined could produce:

```js
var liveDisplay      = ride.excitement / 100;
var totalProxImpact  = /* sum of all row impactCells */;
var totalScenery     = sceneryBase * scaleFactor;
var withoutBoth      = liveDisplay - totalProxImpact - totalScenery;
```

This is not currently shown in the UI but follows directly from the per-row data already computed.

---

## Implemented Output

The Impact column appears in the results listview alongside the existing Total / Scored / Cap columns. Each proximity bucket row shows its individual scaled contribution. The Scenery row shows its full scaled scenery excitement delta.

Example (B&M Floorless, intensity 11.50, one penalty threshold crossed):

| Factor | Total | Scored | Cap | Impact |
|---|---|---|---|---|
| Ride next to ride | 8 | 8 | 15 | +0.09 |
| Ride next to coaster | 3 | 3 | 15 | +0.03 |
| ... | ... | ... | ... | ... |
| Station scenery | 12 | 12 | 47 | +0.27 |

Intensity penalty: × 0.75, Entry multiplier (bmfl): × 1.078, Scale factor: × 0.809

---

## Accuracy & Limitations

| Factor | Accuracy |
|---|---|
| Proximity delta | Exact — `computeBucketScore` replicates all three helper functions from `ride_ratings_get_proximity_score` including per-bucket `scoreMult` values sourced directly from the C++ source. `BonusProximity.e` is applied once to the total score, matching the game exactly. |
| Proximity baseline | Exact — `queue_path_over` always contributes a minimum of 50 score points (preAdd=8) even with no queue paths. This is now included in all impact and summary calculations. |
| Scenery delta | Exact for above-ground stations. For underground stations the game returns a fixed score of `40` (equivalent to 8 pieces at 5 each) — this value itself is exact. The only approximation risk is in *detecting* underground: the plugin compares the surface tile's base height to the station's base Z, which may differ slightly on sloped terrain where `TileElementHeight()` (used by the game) accounts for slope interpolation that the API doesn't directly expose. |
| Intensity penalty | Exact — computed from the live `ride.intensity` value |
| Entry multiplier | Exact for known vanilla RCT2 entries; defaults to ×1.0 for unknown custom content |
| Air time bonus | Not accounted for — this is an additive post-multiplier bonus; small for most coasters |

The air time bonus (`BonusAirTime`) is applied after the entry multiplier and is not part of what proximity/scenery add, so it doesn't meaningfully affect this estimate.
