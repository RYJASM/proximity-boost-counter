# OpenRCT2 Excitement Calculation Pipeline

How the game goes from an empty ride to a final Excitement rating shown in the ride window.

---

## Phase 1 — State Machine Initialization

The game does not calculate all rides at once. Instead, it runs a state machine that processes one ride across multiple game ticks.

**State sequence:**

```
STATE_FIND_NEXT_RIDE → INITIALISE → STATE_2 (forward loop) → CALCULATE → done
                                                  ↓
                                             STATE_4 → STATE_5 (backward loop) → CALCULATE
```

- `STATE_FIND_NEXT_RIDE` — picks the next open ride to process.
- `INITIALISE` — zeroes out all 26 proximity score counters, then finds the station start tile.
- `STATE_2` — **primary proximity pass**, walks the track forward tile-by-tile.
- `STATE_4 / STATE_5` — **secondary proximity pass**, walks the track backward (used for shuttle / dead-end layouts that can't loop).
- `CALCULATE` — runs all the bonus functions and finalises the rating.

---

## Phase 2 — Proximity Score Accumulation

For every track tile visited, the game calls `ride_ratings_score_close_proximity()`, which:

### A. Checks the same tile (directly below/above the track)
Increments counters for things on the **same tile column**:
- Ground-level surface → `SURFACE_TOUCH`
- Water presence → `WATER_OVER`, `WATER_TOUCH`, `WATER_LOW`, `WATER_HIGH`
- Path directly below touching → `PATH_TOUCH_ABOVE`
- Path directly above touching → `PATH_TOUCH_UNDER`
- Queue path → `QUEUE_PATH_OVER`, `QUEUE_PATH_TOUCH_ABOVE`, `QUEUE_PATH_TOUCH_UNDER`
- Foreign ride track → `FOREIGN_TRACK_ABOVE_OR_BELOW`, `FOREIGN_TRACK_TOUCH_ABOVE`, `FOREIGN_TRACK_CLOSE_ABOVE`
- Own track → `OWN_TRACK_TOUCH_ABOVE`, `OWN_TRACK_CLOSE_ABOVE`, `OWN_STATION_TOUCH_ABOVE`, `OWN_STATION_CLOSE_ABOVE`
- Passing through a vertical loop → `THROUGH_VERTICAL_LOOP`

### B. Checks the left and right adjacent tiles
Calls `ride_ratings_score_close_proximity_in_direction()` for both sides:
- Raised surface walls → `SURFACE_SIDE_CLOSE`
- Path within 1 unit (5ft) height → `PATH_SIDE_CLOSE`
- Foreign track within 1 unit (5ft) height → `FOREIGN_TRACK_SIDE_CLOSE`
- Scenery → `SCENERY_SIDE_ABOVE` or `SCENERY_SIDE_BELOW`

### C. Checks for vertical loop interactions
Calls `ride_ratings_score_close_proximity_loops()` if the current tile is a vertical loop:
- Path through the loop → `PATH_TROUGH_VERTICAL_LOOP`
- Another ride through the loop → `TRACK_THROUGH_VERTICAL_LOOP`
- Two intersecting loops → `INTERSECTING_VERTICAL_LOOP`

---

## Phase 3 — Proximity Score Conversion

`ride_ratings_get_proximity_score()` converts the 26 raw accumulated counters into a single integer score.

Each counter has a cap and a fixed-point multiplier. The three helper functions handle the math:

| Helper | Formula | Used for |
|---|---|---|
| `helper_1` | `floor(min(x, cap) * multiplier / 65536)` | Simple per-piece caps (water, surface, scenery) |
| `helper_2` | result = x; if (x > 0) result += seed; `floor(min(result, cap) * multiplier / 65536)` | Seeded bonuses — zero count stays zero, non-zero gets a minimum seed added before capping |
| `helper_3` | `x == 0 ? 0 : flat_value` | One-time presence bonuses (loop intersections, station touches) |

**Special case — `QUEUE_PATH_OVER`:** Uses `helper_1` but with an unconditional `+8` pre-added to the raw count before capping at 12. This means even with **zero** queue paths, the bucket always contributes `min(0+8, 12) × 6.25 = 50` to the proximity score — a built-in baseline. The cap of 4 additional queue paths above the baseline raises it to 75 max.

The result is a single proximity score integer. This is then stored in `state.ProximityTotal`.

---

## Phase 4 — Bonus Application (RideRatingsCalculate)

The game starts with the ride type's **base ratings** (a fixed excitement/intensity/nausea tuple defined per ride type), then iterates through a list of modifiers and applies each one:

### Applied in order:
1. `BonusLength` — adds excitement based on total track length.
2. `BonusSynchronisation` — flat add if synced to adjacent station.
3. `BonusTrainLength` — bonus for longer trains.
4. `BonusMaxSpeed` — bonus for top speed.
5. `BonusAverageSpeed` — bonus for average speed.
6. `BonusDuration` — bonus for ride duration.
7. `BonusGForces` — bonus from G-forces (lateral and vertical).
8. `BonusTurns` — bonus from number/type of turns.
9. `BonusDrops` — bonus from number of drops.
10. `BonusSheltered` — bonus from % of sheltered track.
11. **`BonusProximity`** — converts the proximity score from Phase 3 into an excitement delta using the ride type's `BonusProximity` coefficient (`proximity_score * coefficient >> 16`).
12. **`BonusScenery`** — independently counts scenery near the station (11×11 tile grid, capped at 47 items, 5pts each) and adds a flat excitement delta.
13. Ride-type-specific bonuses (rotations, operation mode, etc.)
14. Requirement checks (minimum length, speed, drops, etc.) — these **subtract** excitement if the ride doesn't meet thresholds.
15. Penalty checks (excessive lateral Gs, etc.)

---

## Phase 5 — Post-Processing Adjustments

After all bonuses and requirements are applied:

1. **`RideRatingsApplyIntensityPenalty`**
   - If intensity exceeds thresholds (1.00, 1.10, 1.20, 1.32, 1.45), excitement is reduced by 25% per threshold exceeded.
   - A very intense ride can lose up to ~76% of its excitement here.

2. **`RideRatingsApplyAdjustments`**
   - Applies a per-ride-*entry* multiplier (not ride type — this is per vehicle variant).
   - Adds a bonus for total air time if the ride type supports it.

3. **Scripting hook** — if any plugins subscribe to `ride.ratings.calculate`, they can modify the final ratings here before they are written.

---

## Phase 6 — Final Score Written to Ride

The computed `ratings.excitement` (and intensity/nausea) tuple is stored directly on the ride object. The ride window reads and displays this value, divided by 100, as the familiar `X.XX` format.

---

## Summary Flow

```
Ride tile walked
    → Proximity counters incremented (26 types)
        → ride_ratings_get_proximity_score() → single int
            → BonusProximity converts int → excitement delta
    
Base ratings
    + BonusLength
    + BonusDuration / Speed / GForces / Turns / etc.
    + BonusProximity (from above)
    + BonusScenery (independent 11x11 grid scan)
    - Requirements not met
    - Intensity penalty
    × Entry multiplier
    + Air time bonus
    → Final excitement stored on ride
        ÷ 100 → displayed in ride window
```
