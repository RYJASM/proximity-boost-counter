# Source Verification Log

Values verified against OpenRCT2-develop-unmodified source.
Source file: `src/openrct2/ride/RideRatings.cpp`

---

## Water Proximity Bucket Multipliers

Verified at `RideRatings.cpp` lines 1383–1386 via `get_proximity_score_helper_1(count, cap, mult)`.
Formula: `floor(min(count, cap) * mult / 65536)`

| Bucket | Source hex | Decimal | Cap | boosts.json `scoreMult` | Match |
|---|---|---|---|---|---|
| water_over | `0x00AAAA` | 43690 | 60 | 43690 | ✓ |
| water_touch | `0x0245D1` | 148945 | 22 | 148945 | ✓ |
| water_low | `0x020000` | 131072 | 10 | 131072 | ✓ |
| water_high | `0x00A000` | 40960 | 40 | 40960 | ✓ |

---

## BonusProximity Excitement Coefficient

Verified at `src/openrct2/ride/rtd/coaster/HyperTwister.h` line 84.
Also applies to GigaCoaster (same value).

```
{ RatingsModifierType::BonusProximity, 0, 20130, 0, 0 }
```

| Field | Value |
|---|---|
| `e` (excitement) | 20130 |
| `i` (intensity) | 0 |
| `n` (nausea) | 0 |

Plugin proxCoeff logged as `20130` — matches source. ✓

---

## Intensity Penalty vs Entry Multiplier Order of Operations

Verified at `RideRatings.cpp` lines 1050–1051:

```cpp
RideRatingsApplyIntensityPenalty(ratings);   // runs FIRST — checks raw pre-multiplier intensity
RideRatingsApplyAdjustments(ride, ratings);  // runs SECOND — applies ratingMultipler
```

**Conclusion:** The intensity threshold check uses intensity *before* the entry multiplier is applied. `ride.intensity` from the plugin API is post-multiplier, so it must be divided by `(1 + intensityMult/128)` before comparing against the 1000/1100/1200/1320/1450 thresholds.

Fix applied in `getIntensityPenalty()`.

---

## Entry Multiplier for rct2.ride.bmrb (Hyper-Twister wide cars)

Verified at `src/openrct2/ride/rtd/...` via `ratingMultipler` in object JSON.

| Field | Value | Factor |
|---|---|---|
| excitement (`e`) | 15 | `1 + 15/128 = 1.117188` |
| intensity (`i`) | 3 | `1 + 3/128 = 1.023438` |
| nausea (`n`) | 0 | `1.0` |

Plugin logged `id=rct2.ride.bmrb e=15 factor=1.1171875` — matches source. ✓
Pre-mult intensity at 10.20 display: `1020 / 1.023438 = 996.64` — below 1000, no penalty. ✓

---

## Remaining Estimate Gap (Water Boost)

With all source values confirmed correct, a small gap remains between our estimate and the measured game delta.

| | Value |
|---|---|
| Water bucket score total | 133 |
| `floor(133 * 20130 / 65536)` | 40 centiunits |
| After entry multiplier (`40 + floor(40 * 15/128)`) | 44 centiunits = **0.44** |
| Measured game delta (16.43 − 16.02) | **0.41** |

The entry multiplier (`RideRatingsApplyAdjustments`) is applied to the *entire* excitement total, not the water portion in isolation:

```
delta = 40 + floor((base + 40) * 15/128) − floor(base * 15/128)
```

The second and third terms don't simplify to `floor(40 * 15/128) = 4` — their difference depends on `base`. With `base ≈ 1434 centiunits`, those terms contribute `172 − 168 = 4`, giving `delta = 44`. The actual measured delta is 41, suggesting either a small difference in the actual base value or an additional adjustment not yet accounted for. All bucket scores and coefficients are verified correct.
