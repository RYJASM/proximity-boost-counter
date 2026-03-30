# OpenRCT2 Ride Rating Bonus Categories

All bonus functions found in `RideRatings.cpp`. These are applied on top of the base ratings for each ride.

---

## Tracked by Plugin

| Bonus | Description |
|---|---|
| `BonusProximity` | Converts the accumulated proximity score into an excitement delta. All `PROXIMITY_*` enums feed into this. |
| `BonusScenery` | Counts small/large scenery in an 11×11 grid around the station entrance (capped at 47 items). |

---

## Generic — Applied to Most Coaster Types

| Bonus | Description |
|---|---|
| `BonusLength` | Bonus from total track length. |
| `BonusDuration` | Bonus from total ride duration. |
| `BonusAverageSpeed` | Bonus from average train speed. |
| `BonusMaxSpeed` | Bonus from top speed reached. |
| `BonusGForces` | Bonus from lateral and vertical G-forces experienced. |
| `BonusTurns` | Bonus from number of turns (banked, sloped, etc.). |
| `BonusDrops` | Bonus from number of drops. |
| `BonusHoles` | Bonus from number of inversions. |
| `BonusSheltered` | Bonus from percentage of track that is sheltered (tunnels, buildings). |
| `BonusReversals` | Bonus from number of reversals (shuttle mode rides). |
| `BonusNumTrains` | Bonus for running multiple trains simultaneously. |
| `BonusTrainLength` | Bonus from number of cars per train. |
| `BonusSynchronisation` | Flat bonus if "Synchronise with adjacent stations" is enabled and an adjacent station from another ride exists. |

---

## Ride-Type-Specific

| Bonus | Applies To |
|---|---|
| `BonusMazeSize` | Maze — bonus from maze size. |
| `BonusRotations` | Rotating rides — bonus from number of rotations. |
| `BonusMotionSimulatorMode` | Motion Simulator — mode-specific bonus. |
| `BonusGoKartRace` | Go-Karts — race mode bonus. |
| `BonusRotoDrop` | Roto-Drop — height-based bonus. |
| `BonusTowerRide` | Tower rides — bonus from height. |
| `BonusReversedTrains` | Rides with reversed train option enabled. |
| `BonusOperationOption` | Various rides — uses the operating mode setting as a modifier. |
| `BonusOperationOptionFreefall` | Freefall rides — freefall-specific operating mode modifier. |
| `BonusDownwardLaunch` | Downward-launching rides — bonus from number of launches. |
| `BonusTopSpinMode` | Top Spin — mode-specific bonus. |
| `BonusSlideUnlimitedRides` | Slides — bonus for unlimited rides setting. |
| `Bonus3DCinemaMode` | 3D Cinema — mode-specific bonus. |
| `BonusLaunchedFreefallSpecial` | Launched Freefall — special combined mode bonus. |
| `BonusBoatHireNoCircuit` | Boat Hire — bonus when not set to circuit mode. |

---

## Notes

- The plugin currently focuses on **proximity** and **scenery** bonuses since these are the bonuses most directly influenced by **park layout and scenery placement**.
- The generic bonuses (length, speed, G-forces, etc.) are determined by the **track design** itself rather than the surrounding environment.
- `BonusSynchronisation` is an interesting edge case — it requires a specific operating mode setting AND a physical adjacency condition.
