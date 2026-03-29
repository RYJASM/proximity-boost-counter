/// <reference path="../distribution/openrct2.d.ts" />

// Copyright (C) 2026 RYJASM
// Licensed under the GNU General Public License v3.0.

import { button, compute, groupbox, horizontal, label, listview, store, twoway, vertical, window as flexWindow } from "openrct2-flexui";

registerPlugin({
    name: "Proximity Boost Counter",
    version: "1.1.0",
    authors: ["RYJASM"],
    type: "local",
    licence: "GNU General Public License v3.0",
    minApiVersion: 110,
    targetApiVersion: 110,
    main: function () {
        if (typeof ui === "undefined") {
            return;
        }

        ui.registerMenuItem("Proximity Boost Counter", function () {
            startRidePicker();
        });

        if (ui.registerShortcut) {
            ui.registerShortcut({
                id: "proximity-boost-counter.open",
                text: "[Proximity Boost Counter] Open",
                bindings: ["CTRL+P", "GUI+P"],
                callback: function () {
                    startRidePicker();
                }
            });
        }
    }
});

var TILE_SIZE = 32;
var Z_STEP = 8;

var DIR_DELTA = [
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 }
];

var selectedRideId = null;
var SYNC_DEPART_FLAG = 1 << 5;
var currentResultsWindow = null;

var RIDE_MODE_NAMES = [
    "Normal",
    "Continuous circuit",
    "Reverse incline launched shuttle",
    "Powered launch passthrough",
    "Shuttle",
    "Boat hire",
    "Upward launch",
    "Rotating lift",
    "Station to station",
    "Single ride per admission",
    "Unlimited rides per admission",
    "Maze",
    "Race",
    "Dodgems",
    "Swing",
    "Shop stall",
    "Rotation",
    "Forward rotation",
    "Backward rotation",
    "Film: Avenging Aviators",
    "3D Cinema: Mouse Tails",
    "Space Rings",
    "Top Spin: Beginners",
    "LIM powered launch",
    "Motion Simulator: Thrill Riders",
    "3D Cinema: Storm Chasers",
    "3D Cinema: Space Raiders",
    "Top Spin: Intense",
    "Top Spin: Berserk",
    "Haunted House",
    "Circus",
    "Downward launch",
    "Crooked House",
    "Freefall drop",
    "Continuous circuit block sectioned",
    "Powered launch",
    "Powered launch block sectioned"
];

var COASTER_MODES = {
    1: true,  // Continuous circuit
    2: true,  // Reverse incline launched shuttle
    3: true,  // Powered launch passthrough
    4: true,  // Shuttle
    6: true,  // Upward launch
    8: true,  // Station to station
    23: true, // LIM powered launch
    31: true, // Downward launch
    34: true, // Continuous circuit block sectioned
    35: true, // Powered launch
    36: true  // Powered launch block sectioned
};

var RIDE_TYPES = {
    BOAT_HIRE: 8,
    GHOST_TRAIN: 50,
    LAUNCHED_FREEFALL: 12,
    OBSERVATION_TOWER: 14,
    SPIRAL_SLIDE: 21,
    GO_KARTS: 22,
    LOG_FLUME: 23,
    MOTION_SIMULATOR: 38,
    CINEMA_3D: 39,
    TOP_SPIN: 40,
    ROTO_DROP: 69
};



var RIDE_TYPE_MODIFIERS = {"0":{"BonusLength":{"t":"6000","e":"819","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"140434","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"51366","i":"85019","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"400497","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"36864","i":"30384","n":"49648"},"BonusTurns":{"t":"0","e":"28235","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"43690","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"36864","i":"30384","n":"49648"}},"1":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 5)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"123987","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"59578"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"34952","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"12850","i":"28398","n":"30427"},"BonusReversedTrains":{"t":"0","e":"2","i":"20","n":"30"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 50)","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"59578"}},"2":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 10)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"32768","i":"23831","n":"79437"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"48036"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6971","i":"0","n":"0"},"RequirementDropHeight":{"t":"8","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xC0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 60)","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"32768","i":"23831","n":"79437"}},"3":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 42)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"29789","n":"55606"},"BonusTurns":{"t":"0","e":"26749","i":"29552","n":"57186"},"BonusDrops":{"t":"0","e":"29127","i":"39009","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"15291","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"12","n":"20"},"BonusProximity":{"t":"0","e":"15657","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 30)","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"29789","n":"55606"}},"4":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"20480","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"25700","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"1","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"20480","i":"23831","n":"49648"}},"5":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusTrainLength":{"t":"0","e":"140434","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"-6425","i":"6553","n":"23405"},"BonusProximity":{"t":"0","e":"8946","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"20915","i":"0","n":"0"},"RequirementLength":{"t":"0xC80000","e":"2","i":"2","n":"2"},"RequirementUnsheltered":{"t":"4","e":"4","i":"1","n":"1"}},"6":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusTrainLength":{"t":"0","e":"93622","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"70849","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"218453","n":"0"},"BonusDuration":{"t":"150","e":"21845","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"5140","i":"6553","n":"18724"},"BonusProximity":{"t":"0","e":"8946","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"16732","i":"0","n":"0"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementUnsheltered":{"t":"4","e":"4","i":"1","n":"1"}},"7":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 45)","i":"RideRating::make(0, 15)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"34179","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"58254","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"19275","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"13943","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x80000","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 30)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xC80000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"8":{"BonusBoatHireNoCircuit":{"t":"0","e":"RideRating::make(0, 20)","i":"0","n":"0"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"22310","i":"0","n":"0"}},"9":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 8)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"102400","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"8","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"3","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"102400","i":"35746","n":"49648"}},"10":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 75)","i":"RideRating::make(0, 9)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"20480","i":"20852","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"25700","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"4","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x80000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xF00000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"20480","i":"20852","n":"49648"}},"11":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 15)","i":"RideRating::make(0, 00)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"11437"},"BonusDrops":{"t":"0","e":"8738","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"12850","i":"6553","n":"4681"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementLength":{"t":"0xC80000","e":"8","i":"2","n":"2"}},"12":{"BonusDownwardLaunch":{"t":"0","e":"RideRating::make(0, 30)","i":"RideRating::make(0, 65)","n":"RideRating::make(0, 45)"},"BonusLaunchedFreefallSpecial":{"t":"0","e":"0","i":"1355917","n":"451972"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"}},"13":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 20)","i":"RideRating::make(0, 00)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"65536","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementMaxSpeed":{"t":"0xC0000","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 20)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"65536","i":"23831","n":"49648"}},"14":{"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"83662","i":"0","n":"0"},"BonusTowerRide":{"t":"0","e":"45875","i":"0","n":"26214"},"RequirementUnsheltered":{"t":"5","e":"4","i":"1","n":"1"}},"15":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"15","n":"30"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"14","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"16":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 50)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"65536","i":"29789","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x8C0000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"65536","i":"29789","n":"49648"}},"17":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"19275","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"21472","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"16732","i":"0","n":"0"},"RequirementDropHeight":{"t":"8","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"35746","n":"49648"}},"18":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"7430","i":"3476","n":"4574"},"BonusSheltered":{"t":"0","e":"-19275","i":"21845","n":"23405"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"},"RequirementLength":{"t":"0x960000","e":"2","i":"2","n":"2"},"RequirementStations":{"t":"1","e":"0","i":"2","n":"1"},"RequirementUnsheltered":{"t":"4","e":"4","i":"1","n":"1"}},"19":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"12","n":"20"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"20":{"BonusMazeSize":{"t":"100","e":"1","i":"2","n":"0"},"BonusScenery":{"t":"0","e":"22310","i":"0","n":"0"}},"21":{"BonusSlideUnlimitedRides":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 20)","n":"RideRating::make(0, 25)"},"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"}},"22":{"BonusLength":{"t":"700","e":"32768","i":"0","n":"0"},"BonusGoKartRace":{"t":"4","e":"RideRating::make(1, 40)","i":"RideRating::make(0, 50)","n":"0"},"BonusTurns":{"t":"0","e":"4458","i":"3476","n":"5718"},"BonusDrops":{"t":"0","e":"8738","i":"5461","n":"6553"},"BonusSheltered":{"t":"0","e":"2570","i":"8738","n":"2340"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"16732","i":"0","n":"0"},"RequirementUnsheltered":{"t":"6","e":"2","i":"1","n":"1"}},"23":{"BonusLength":{"t":"2000","e":"7208","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"531372","i":"655360","n":"301111"},"BonusDuration":{"t":"300","e":"13107","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"22291","i":"20860","n":"4574"},"BonusDrops":{"t":"0","e":"69905","i":"62415","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"}},"24":{"BonusLength":{"t":"2000","e":"6225","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 30)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"115130","i":"159411","n":"106274"},"BonusDuration":{"t":"500","e":"13107","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"29721","i":"22598","n":"5718"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"31314","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"13943","i":"0","n":"0"},"RequirementDropHeight":{"t":"2","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xC80000","e":"2","i":"2","n":"2"}},"25":{"BonusOperationOption":{"t":"0","e":"1","i":"-2","n":"0"},"BonusNumTrains":{"t":"4","e":"RideRating::make(0, 80)","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"}},"26":{"BonusOperationOption":{"t":"0","e":"5","i":"5","n":"10"},"BonusScenery":{"t":"0","e":"16732","i":"0","n":"0"}},"27":{"BonusOperationOption":{"t":"0","e":"11","i":"22","n":"22"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"}},"28":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"30":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"32":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"33":{"BonusRotations":{"t":"0","e":"5","i":"5","n":"5"},"BonusScenery":{"t":"0","e":"19521","i":"0","n":"0"}},"35":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"36":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"37":{"BonusRotations":{"t":"0","e":"25","i":"25","n":"25"},"BonusScenery":{"t":"0","e":"41831","i":"0","n":"0"}},"38":{"BonusMotionSimulatorMode":{"t":"0","e":"0","i":"0","n":"0"}},"39":{"Bonus3DCinemaMode":{"t":"0","e":"0","i":"0","n":"0"}},"40":{"BonusTopSpinMode":{"t":"0","e":"0","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"}},"41":{"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"}},"42":{"BonusLength":{"t":"6000","e":"327","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 60)","i":"RideRating::make(0, 15)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"436906","i":"436906","n":"320398"},"BonusGForces":{"t":"0","e":"24576","i":"41704","n":"59578"},"BonusSheltered":{"t":"0","e":"12850","i":"28398","n":"11702"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"25"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"34","e":"2","i":"2","n":"2"}},"43":{"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"83662","i":"0","n":"0"},"BonusTowerRide":{"t":"0","e":"45875","i":"0","n":"26214"},"RequirementUnsheltered":{"t":"5","e":"4","i":"1","n":"1"}},"44":{"BonusLength":{"t":"4000","e":"1146","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"97418","i":"141699","n":"70849"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"58254","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"20","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"1","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"35746","n":"49648"}},"45":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"46":{"BonusRotations":{"t":"0","e":"20","i":"20","n":"20"},"BonusScenery":{"t":"0","e":"13943","i":"0","n":"0"}},"47":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"48":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"49":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"50":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 15)","i":"RideRating::make(0, 00)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"11437"},"BonusDrops":{"t":"0","e":"8738","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"25700","i":"6553","n":"4681"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementLength":{"t":"0xB40000","e":"2","i":"2","n":"2"}},"51":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"32768","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"12","n":"20"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"32768","n":"49648"}},"52":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"34555","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"15"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"34555","n":"49648"}},"53":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"28672","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x50000","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xFA0000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"28672","i":"35746","n":"49648"}},"54":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 8)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"102400","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"102400","i":"35746","n":"49648"}},"55":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"4","i":"1","n":"1"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"1","n":"1"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"1","n":"1"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"56":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"4","i":"1","n":"1"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"1","n":"1"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"1","n":"1"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"57":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"2","i":"1","n":"1"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"1","n":"1"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"1","n":"1"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"58":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"2","i":"1","n":"1"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"1","n":"1"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"1","n":"1"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"59":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"110592","i":"29789","n":"59578"},"BonusTurns":{"t":"0","e":"52012","i":"26075","n":"45749"},"BonusDrops":{"t":"0","e":"43690","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementLength":{"t":"0xD20000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"110592","i":"29789","n":"59578"}},"60":{"BonusLength":{"t":"2000","e":"7208","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"797059","i":"655360","n":"301111"},"BonusDuration":{"t":"500","e":"13107","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"22291","i":"20860","n":"4574"},"BonusDrops":{"t":"0","e":"87381","i":"93622","n":"62259"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"}},"61":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 15)","i":"RideRating::make(0, 00)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"4574"},"BonusDrops":{"t":"0","e":"8738","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"12850","i":"6553","n":"4681"},"BonusProximity":{"t":"0","e":"8946","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementLength":{"t":"0xA00000","e":"2","i":"2","n":"2"}},"62":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"4","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"63":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusTrainLength":{"t":"0","e":"93622","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"70849","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"218453","n":"0"},"BonusDuration":{"t":"150","e":"21845","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"5140","i":"6553","n":"18724"},"BonusProximity":{"t":"0","e":"12525","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementUnsheltered":{"t":"4","e":"4","i":"1","n":"1"}},"64":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"38130","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"4","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"38130","n":"49648"}},"65":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusReversals":{"t":"6","e":"RideRating::make(0, 20)","i":"RideRating::make(0, 20)","n":"RideRating::make(0, 20)"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"28672","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementReversals":{"t":"1","e":"8","i":"1","n":"1"},"RequirementLength":{"t":"0xC80000","e":"2","i":"1","n":"1"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"28672","i":"23831","n":"49648"}},"66":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 20)","i":"RideRating::make(0, 04)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"97418","i":"123987","n":"70849"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"44683","n":"89367"},"BonusTurns":{"t":"0","e":"26749","i":"52150","n":"57186"},"BonusDrops":{"t":"0","e":"29127","i":"53052","n":"55705"},"BonusSheltered":{"t":"0","e":"15420","i":"34952","n":"35108"},"BonusProximity":{"t":"0","e":"9841","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"3904","i":"0","n":"0"},"RequirementInversions":{"t":"1","e":"4","i":"1","n":"1"},"RequirementNumDrops":{"t":"1","e":"4","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"44683","n":"89367"}},"67":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"0"},"BonusHoles":{"t":"31","e":"5","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"5140","i":"6553","n":"4681"},"BonusProximity":{"t":"0","e":"15657","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"27887","i":"0","n":"0"},"RequirementHoles":{"t":"1","e":"8","i":"2","n":"2"}},"68":{"BonusLength":{"t":"6000","e":"819","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"140434","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"51366","i":"85019","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"400497","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"36864","i":"30384","n":"49648"},"BonusTurns":{"t":"0","e":"28235","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"43690","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"20","n":"20"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"16","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"36864","i":"30384","n":"49648"}},"69":{"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"25098","i":"0","n":"0"},"BonusRotoDrop":{"t":"0","e":"0","i":"0","n":"0"}},"70":{"BonusOperationOption":{"t":"0","e":"1","i":"-2","n":"0"},"BonusNumTrains":{"t":"4","e":"RideRating::make(0, 80)","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"}},"71":{"NoModifier":{"t":"0","e":"0","i":"0","n":"0"}},"72":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 15)","i":"RideRating::make(0, 00)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"4574"},"BonusDrops":{"t":"0","e":"8738","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"5140","i":"6553","n":"2340"},"BonusProximity":{"t":"0","e":"8946","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementLength":{"t":"0x8C0000","e":"2","i":"2","n":"2"}},"73":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 42)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"30980","n":"55606"},"BonusTurns":{"t":"0","e":"26749","i":"29552","n":"57186"},"BonusDrops":{"t":"0","e":"29127","i":"39009","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"15291","n":"35108"},"BonusProximity":{"t":"0","e":"15657","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 30)","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"30980","n":"55606"}},"74":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"20480","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"25700","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"8","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"1","e":"2","i":"2","n":"2"},"RequirementSplashdown":{"t":"0","e":"8","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"20480","i":"23831","n":"49648"}},"75":{"BonusLength":{"t":"6000","e":"327","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 60)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"509724","i":"364088","n":"320398"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"59578"},"BonusSheltered":{"t":"0","e":"15420","i":"21845","n":"11702"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"34","e":"4","i":"1","n":"1"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"59578"}},"76":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 8)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"102400","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"8","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"3","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"102400","i":"35746","n":"49648"}},"77":{"BonusOperationOption":{"t":"0","e":"10","i":"20","n":"20"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"}},"78":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"22310","i":"0","n":"0"}},"79":{"BonusLength":{"t":"2000","e":"7208","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusMaxSpeed":{"t":"0","e":"531372","i":"655360","n":"301111"},"BonusDuration":{"t":"500","e":"13107","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"22291","i":"20860","n":"4574"},"BonusDrops":{"t":"0","e":"78643","i":"93622","n":"62259"},"BonusProximity":{"t":"0","e":"13420","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"}},"81":{"BonusOperationOption":{"t":"0","e":"1","i":"16","n":"16"},"BonusScenery":{"t":"0","e":"19521","i":"0","n":"0"}},"86":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 42)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"29789","n":"55606"},"BonusTurns":{"t":"0","e":"26749","i":"29552","n":"57186"},"BonusDrops":{"t":"0","e":"29127","i":"39009","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"15291","n":"35108"},"BonusProximity":{"t":"0","e":"15657","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"20","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"29789","n":"55606"}},"87":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"20480","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"25700","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 50)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"20480","i":"23831","n":"49648"}},"88":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"29789","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"19275","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"21472","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"16732","i":"0","n":"0"},"RequirementLength":{"t":"0x10E0000","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"29789","n":"49648"}},"90":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"15","n":"20"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"10","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"10","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"91":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"20","n":"30"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"92":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"32768","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"20","n":"30"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"32768","n":"49648"}},"93":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 15)","i":"RideRating::make(0, 00)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"14860","i":"0","n":"11437"},"BonusDrops":{"t":"0","e":"8738","i":"0","n":"0"},"BonusSheltered":{"t":"0","e":"12850","i":"6553","n":"4681"},"BonusProximity":{"t":"0","e":"11183","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"8366","i":"0","n":"0"},"RequirementLength":{"t":"0xC80000","e":"8","i":"2","n":"2"}},"94":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 8)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"102400","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"29721","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementLateralGs":{"t":"MakeFixed16_2dp(1, 50)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0xAA0000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"102400","i":"35746","n":"49648"}},"95":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"20480","i":"23831","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"25700","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"10","n":"12"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"9760","i":"0","n":"0"},"RequirementDropHeight":{"t":"6","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0x70000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"20480","i":"23831","n":"49648"}},"96":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"400497","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"34179","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"34952","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"15","n":"25"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"14","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"97":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"36864","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"15","n":"25"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"14","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 40)","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"98":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 75)","i":"RideRating::make(0, 5)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"300","e":"26214","i":"0","n":"0"},"BonusTurns":{"t":"0","e":"29721","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"8738","i":"5461","n":"6553"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementMaxSpeed":{"t":"0x50000","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"}},"99":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"34555","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"12","n":"22"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"1","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"1","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"1","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"1","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"1","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"34555","n":"49648"}},"100":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 10)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"123987","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"59578"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"34952","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"12850","i":"28398","n":"30427"},"BonusReversedTrains":{"t":"0","e":"2","i":"20","n":"30"},"BonusProximity":{"t":"0","e":"17893","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"5577","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 50)","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"59578"}},"101":{"BonusLength":{"t":"6000","e":"764","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"291271","i":"436906","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"24576","i":"35746","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"34767","n":"45749"},"BonusDrops":{"t":"0","e":"29127","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"15420","i":"32768","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"15","n":"20"},"BonusProximity":{"t":"0","e":"20130","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"6693","i":"0","n":"0"},"RequirementDropHeight":{"t":"10","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"10","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"24576","i":"35746","n":"49648"}},"102":{"BonusLength":{"t":"6000","e":"873","i":"0","n":"0"},"BonusSynchronisation":{"t":"0","e":"RideRating::make(0, 40)","i":"RideRating::make(0, 05)","n":"0"},"BonusTrainLength":{"t":"0","e":"187245","i":"0","n":"0"},"BonusMaxSpeed":{"t":"0","e":"44281","i":"88562","n":"35424"},"BonusAverageSpeed":{"t":"0","e":"364088","i":"655360","n":"0"},"BonusDuration":{"t":"150","e":"26214","i":"0","n":"0"},"BonusGForces":{"t":"0","e":"40960","i":"34555","n":"49648"},"BonusTurns":{"t":"0","e":"26749","i":"43458","n":"45749"},"BonusDrops":{"t":"0","e":"40777","i":"46811","n":"49152"},"BonusSheltered":{"t":"0","e":"16705","i":"30583","n":"35108"},"BonusReversedTrains":{"t":"0","e":"2","i":"12","n":"22"},"BonusProximity":{"t":"0","e":"22367","i":"0","n":"0"},"BonusScenery":{"t":"0","e":"11155","i":"0","n":"0"},"RequirementDropHeight":{"t":"12","e":"2","i":"2","n":"2"},"RequirementMaxSpeed":{"t":"0xA0000","e":"2","i":"2","n":"2"},"RequirementNegativeGs":{"t":"MakeFixed16_2dp(0, 10)","e":"2","i":"2","n":"2"},"RequirementLength":{"t":"0x1720000","e":"2","i":"2","n":"2"},"RequirementNumDrops":{"t":"2","e":"2","i":"2","n":"2"},"PenaltyLateralGs":{"t":"0","e":"40960","i":"34555","n":"49648"}}};

var BUCKETS = [
        { key: "water_over", label: "Over water", kind: "perPiece", cap: 60 },
        { key: "water_touch", label: "Skimming water", kind: "perPiece", cap: 22 },
        { key: "water_low", label: "1 unit above water", kind: "perPiece", cap: 10 },
        { key: "water_high", label: "8+ units above water", kind: "perPiece", cap: 40 },
        { key: "surface_touch", label: "Touching ground", kind: "perPiece", cap: 70 },
        { key: "queue_path_over", label: "Over queue", kind: "seeded", cap: 12, seed: 8 },
        { key: "queue_path_touch_above", label: "Queue touching track bottom", kind: "presence" },
        { key: "queue_path_touch_under", label: "Queue touching track top", kind: "presence" },
        { key: "path_touch_above", label: "Path touching track bottom", kind: "seeded", cap: 20, seed: 10 },
        { key: "path_touch_under", label: "Path touching track top", kind: "seeded", cap: 20, seed: 10 },
        { key: "own_track_touch_above", label: "Own track touching", kind: "seeded", cap: 15, seed: 10 },
        { key: "own_track_close_above", label: "Own track near-miss", kind: "perPiece", cap: 5 },
        { key: "foreign_track_above_or_below", label: "Other ride same tile", kind: "seeded", cap: 15, seed: 10 },
        { key: "foreign_track_touch_above", label: "Other ride touching", kind: "seeded", cap: 15, seed: 10 },
        { key: "foreign_track_close_above", label: "Other ride near-miss", kind: "perPiece", cap: 5 },
        { key: "scenery_track_above", label: "Side scenery below track", kind: "perPiece", cap: 35 },
        { key: "scenery_track_overlapping", label: "Side scenery into track band", kind: "perPiece", cap: 35 },
        { key: "own_station_touch_above", label: "Over own station", kind: "presence" },
        { key: "own_station_close_above", label: "Near own station", kind: "presence" },
        { key: "track_through_vertical_loop", label: "Track through loop", kind: "seeded", cap: 6, seed: 4 },
        { key: "path_through_vertical_loop", label: "Path through loop", kind: "seeded", cap: 6, seed: 4 },
        { key: "intersecting_vertical_loop", label: "Intersecting loops", kind: "presence" },
        { key: "through_vertical_loop", label: "Passing under loop", kind: "seeded", cap: 6, seed: 4 },
        { key: "path_side_close", label: "Path alongside", kind: "seeded", cap: 20, seed: 10 },
        { key: "foreign_track_side_close", label: "Other ride alongside", kind: "seeded", cap: 20, seed: 10 },
        { key: "surface_side_close", label: "Cliff/trench wall alongside", kind: "seeded", cap: 20, seed: 10 }
];



var TABLE_ROWS = BUCKETS;

var latestResult = null;
var selectedBucketKey = null;
var rideLabelStore = store("");
var statusLabelStore = store("");
var rowsStore = store([]);
var selectedCellStore = store(null);
var detailModeStore = store("empty"); // "empty" | "proximity" | "factor"
var detailDescStore = store("Excitement boosts from nearby scenery, paths, and other rides for the selected ride.");
var detailImpactStore = store("");
var detailMinStore = store("n/a");
var detailMaxStore = store("n/a");
var detailRuleStore = store("n/a");
var detailCurrentStore = store("n/a");
var detailStatusStore = store("n/a");
var detailPerUnitStore = store("");
var detailTotalStore = store("");
var detailRawStore = store("n/a");
var detailEffectiveStore = store("n/a");
var detailDescDisplayStore = store("");
var detailImpactDisplayStore = store("");
var detailDescLineStores = [store(""), store(""), store(""), store(""), store(""), store("")];
var detailDescLineVisibilityStores = [store("none"), store("none"), store("none"), store("none"), store("none"), store("none")];

var DETAIL_DESC_WRAP = 67;
var DETAIL_IMPACT_WRAP = 67;
var DETAIL_DESC_MAX_LINES = 6;


var BUCKET_INFO = {
    water_over: {
        description: "Counts track pieces whose bottom is at or above the water surface on the same tile.",
        impact: "Base proximity score: up to 60 pieces at 0.666656 each."
    },
    water_touch: {
        description: "Counts track pieces whose bottom is exactly at the water surface.",
        impact: "Base proximity score: up to 22 pieces at 2.272720 each. Stacks with 'Over water'."
    },
    water_low: {
        description: "Counts track pieces whose bottom is exactly 1 player unit (5 ft) above the water surface.",
        impact: "Base proximity score: up to 10 pieces at 2.0 each. Stacks with 'Over water'."
    },
    water_high: {
        description: "Counts track pieces whose bottom is at least 8 player units (40 ft) above the water surface.",
        impact: "Base proximity score: up to 40 pieces at 0.625 each. Stacks with 'Over water'."
    },
    surface_touch: {
        description: "Counts track pieces whose bottom is exactly at ground level on their tile.",
        impact: "Base proximity score: up to 70 pieces at 1.714279 each."
    },
    queue_path_over: {
        description: "Counts queue path pieces on the same tile whose top is at or below the bottom of the track.",
        impact: "Base proximity score: min(raw + 8, 12) at 6.25 each. Huge seeded bonus."
    },
    queue_path_touch_above: {
        description: "Triggered when the top of a queue path exactly touches the bottom of the track.",
        impact: "Adds a one-time 40 proximity score if present anywhere."
    },
    queue_path_touch_under: {
        description: "Triggered when the bottom of a queue path exactly touches the top of the track.",
        impact: "Adds a one-time 45 proximity score if present anywhere."
    },
    path_touch_above: {
        description: "Counts normal path pieces whose top exactly touches the bottom of the track.",
        impact: "Base proximity score: min(raw + 10, 20) at 3.75 each."
    },
    path_touch_under: {
        description: "Counts normal path pieces whose bottom exactly touches the top of the track.",
        impact: "Base proximity score: min(raw + 10, 20) at 4.25 each."
    },
    own_track_touch_above: {
        description: "Counts same-ride track pieces on the same tile with zero vertical gap.",
        impact: "Base proximity score: min(raw + 10, 15) at 3.333328 each."
    },
    own_track_close_above: {
        description: "Counts same-ride track near-misses on the same tile with a 5 ft to 25 ft gap.",
        impact: "Base proximity score: up to 5 pieces at 6.0 each."
    },
    foreign_track_above_or_below: {
        description: "Counts other rides' track on the same tile above or below the selected ride's track.",
        impact: "Base proximity score: min(raw + 10, 15) at 2.666656 each."
    },
    foreign_track_touch_above: {
        description: "Counts other rides' track on the same tile with zero vertical gap.",
        impact: "Base proximity score: min(raw + 10, 15) at 4.666656 each."
    },
    foreign_track_close_above: {
        description: "Counts other rides' track near-misses on the same tile with a 5 ft to 25 ft gap.",
        impact: "Base proximity score: up to 5 pieces at 9.0 each."
    },
    scenery_track_above: {
        description: "Counts side-adjacent scenery that stays below the bottom of the track while overlapping vertically.",
        impact: "Base proximity score: up to 35 pieces at 1.428558 each."
    },
    scenery_track_overlapping: {
        description: "Counts side-adjacent scenery that rises into the track's vertical band.",
        impact: "Base proximity score: up to 35 pieces at 0.857132 each."
    },
    own_station_touch_above: {
        description: "Triggered when the ride passes directly over its own station with zero gap.",
        impact: "Adds a one-time 55 proximity score if present anywhere."
    },
    own_station_close_above: {
        description: "Triggered when the ride passes near its own station with a 5 ft to 25 ft gap.",
        impact: "Adds a one-time 25 proximity score if present anywhere."
    },
    track_through_vertical_loop: {
        description: "Counts other rides' track passing through a vertical loop window at 90 degrees.",
        impact: "Base proximity score: min(raw + 4, 6) at 20.0 each."
    },
    path_through_vertical_loop: {
        description: "Counts path pieces passing through a vertical loop window.",
        impact: "Base proximity score: min(raw + 4, 6) at 15.0 each."
    },
    intersecting_vertical_loop: {
        description: "Triggered when another vertical loop intersects this ride's vertical loop at 90 degrees.",
        impact: "Adds a one-time 100 proximity score if present anywhere."
    },
    through_vertical_loop: {
        description: "Counts track pieces passing beneath another ride's vertical loop within the source height window.",
        impact: "Base proximity score: min(raw + 4, 6) at 10.0 each."
    },
    path_side_close: {
        description: "Counts normal path on the tile to the left or right of the track within 1 player unit vertically.",
        impact: "Base proximity score: min(raw + 10, 20) at 1.75 each."
    },
    foreign_track_side_close: {
        description: "Counts other rides' track on the tile to the left or right within 1 player unit vertically.",
        impact: "Base proximity score: min(raw + 10, 20) at 2.25 each."
    },
    surface_side_close: {
        description: "Counts side-adjacent land walls or trench walls that rise high enough beside the track.",
        impact: "Base proximity score: min(raw + 10, 20) at 2.5 each."
    },
    
};

function startRidePicker() {
        ui.showError("Proximity Boost Counter", "Use the crosshair to click a ride or ride vehicle to analyze it.");
        ui.activateTool({
            id: "proximity-boost-counter.pick-ride",
            cursor: "cross_hair",
            filter: ["ride", "entity"],
            onDown: function (e) {
                var ride = resolveRideFromEvent(e);
                if (!ride) {
                    ui.showError("Proximity Boost Counter", "Could not resolve a ride from that click.");
                    return;
                }

                if (!isCoasterRide(ride)) {
                    ui.showError("Proximity Boost Counter", "Please select a roller coaster.");
                    return;
                }

                if (ui.tool && ui.tool.cancel) {
                    ui.tool.cancel();
                }

                selectedRideId = ride.id;
                latestResult = analyzeRide(ride);
                openResultsWindow(latestResult);
            }
        });
}

    function isCoasterRide(ride) {
        if (!ride || ride.mode === undefined || ride.mode === null) {
            return false;
        }
        return !!COASTER_MODES[ride.mode];
    }

function resolveRideFromEvent(e) {
        if (e && e.entityId !== undefined && e.entityId !== null) {
            var entity = map.getEntity(e.entityId);
            if (entity && entity.type === "car" && entity.ride !== undefined && entity.ride !== null) {
                return map.getRide(entity.ride);
            }
        }

        if (!e || !e.mapCoords) {
            return null;
        }

        var tileX = Math.floor(e.mapCoords.x / TILE_SIZE);
        var tileY = Math.floor(e.mapCoords.y / TILE_SIZE);
        var tile = map.getTile(tileX, tileY);

        if (e.tileElementIndex !== undefined && e.tileElementIndex !== null && e.tileElementIndex >= 0 && e.tileElementIndex < tile.numElements) {
            var primary = tile.getElement(e.tileElementIndex);
            var rideFromPrimary = getRideFromTileElement(primary);
            if (rideFromPrimary) {
                return rideFromPrimary;
            }
        }

        var i;
        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            var ride = getRideFromTileElement(el);
            if (ride) {
                return ride;
            }
        }

        return null;
}

function getRideFromTileElement(el) {
        if (!el || el.isGhost) {
            return null;
        }

        if ((el.type === "track" || el.type === "footpath" || el.type === "entrance") && el.ride !== undefined && el.ride !== null) {
            return map.getRide(el.ride);
        }

        return null;
}

function analyzeRide(ride) {
        var result = {
            rideId: ride.id,
            rideName: ride.name,
            raw: createZeroCounts(),
            effective: createZeroCounts(),
            other: createOtherAnalysis(),
            trackStats: createTrackStats(),
            notes: [],
            debug: {
                segmentsWalked: 0,
                trackBlocksScored: 0
            }
        };

        if (!ride || ride.classification !== "ride") {
            result.notes.push("Selected object is not a ride with track.");
            return finalizeResult(result);
        }

        if (!hasAnyStationEntrance(ride)) {
            result.notes.push("Ride has no station entrance. Source ratings skip proximity scoring in that case.");
            return finalizeResult(result);
        }

        scanRideTrackElements(ride, result.raw, result.debug, result.trackStats);
        if (result.debug.trackBlocksScored === 0) {
            result.notes.push("No track elements for the selected ride were found during the full-map scan.");
        }
        result.notes.push("Sheltered-track rows use an estimate because the exact sheltered-length counter is not exposed to plugins.");

        return finalizeResult(result);
}

function finalizeResult(result) {
        var i;
        for (i = 0; i < BUCKETS.length; i++) {
            var bucket = BUCKETS[i];
            result.effective[bucket.key] = getEffectiveCount(bucket, result.raw[bucket.key]);
        }
        return result;
}

function createZeroCounts() {
        var counts = {};
        var i;
        for (i = 0; i < BUCKETS.length; i++) {
            counts[BUCKETS[i].key] = 0;
        }
        return counts;
}

function createTrackStats() {
        return {
            primaryTrackPieces: 0,
            flatTurns: 0,
            bankedTurns: 0,
            slopedTurns: 0,
            helixSections: 0,
            inversionPieces: 0,
            golfHoles: 0,
            reverserPieces: 0,
            waterSplashPieces: 0,
            waterfallPieces: 0,
            whirlpoolPieces: 0,
            spinningTunnelPieces: 0,
            shelteredEstimate: 0,
            stationTiles: []
        };
}

function createOtherAnalysis() {
        return {};
}



function hasAnyStationEntrance(ride) {
        var i;
        for (i = 0; i < ride.stations.length; i++) {
            var station = ride.stations[i];
            if (station && station.entrance) {
                return true;
            }
        }
        return false;
}

function formatFixed(value, digits) {
        if (value === null || value === undefined || isNaN(value)) {
            return "n/a";
        }
        return Number(value).toFixed(digits);
}

function formatSpeed(value) {
        return formatFixed(value, 2) + " mph";
}

function formatSeconds(value) {
        return formatFixed(value, 2) + " s";
}

function formatLength(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return "n/a";
        }
        try {
            return context.formatString("{LENGTH}", Math.round(value));
        }
        catch (e) {
            return formatFixed(value, 2) + " length";
        }
}

function formatHeightUnits(value) {
        return String(value) + " units (" + formatFixed(value * 5, 1) + " ft)";
}

function shortenCell(text, maxLength) {
        if (!text) {
            return "-";
        }
        var value = String(text);
        if (value.length <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1)) + "…";
}

    function lightRowText(value) {
        return "{WHITE}" + String(value);
    }

function wrapTextToWidth(text, maxLineLength) {
        if (!text) {
            return "";
        }

        var normalized = String(text).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (!normalized) {
            return "";
        }

        var words = normalized.split(" ");
        var lines = [];
        var current = "";
        var i;

        for (i = 0; i < words.length; i++) {
            var word = words[i];

            while (word.length > maxLineLength) {
                if (current) {
                    lines.push(current);
                    current = "";
                }
                lines.push(word.substring(0, maxLineLength));
                word = word.substring(maxLineLength);
            }

            if (!current) {
                current = word;
            }
            else if ((current.length + 1 + word.length) <= maxLineLength) {
                current += " " + word;
            }
            else {
                lines.push(current);
                current = word;
            }
        }

        if (current) {
            lines.push(current);
        }

        return lines.join("\n");
}

function applyDescriptionLines(wrappedDescription) {
        var lines = wrappedDescription ? String(wrappedDescription).split("\n") : [""];
        if (lines.length === 0) {
            lines = [""];
        }

        var i;
        for (i = 0; i < DETAIL_DESC_MAX_LINES; i++) {
            if (i < lines.length) {
                detailDescLineStores[i].set(lines[i]);
                detailDescLineVisibilityStores[i].set("visible");
            }
            else {
                detailDescLineStores[i].set("");
                detailDescLineVisibilityStores[i].set("none");
            }
        }
}

function applyDetailLayout(mode, description, impact) {
        var wrappedDesc = wrapTextToWidth(description, DETAIL_DESC_WRAP);
        var wrappedImpact = wrapTextToWidth(impact, DETAIL_IMPACT_WRAP);

        detailDescDisplayStore.set(wrappedDesc);
        detailImpactDisplayStore.set(wrappedImpact);
        applyDescriptionLines(wrappedDesc);
}

function getRideModeName(mode) {
        if (mode >= 0 && mode < RIDE_MODE_NAMES.length) {
            return RIDE_MODE_NAMES[mode];
        }
        return "Mode " + mode;
}

function safeGetStationIndex(trackEl) {
        try {
            return trackEl.station;
        }
        catch (e) {
            return null;
        }
}


function parseSourceInteger(expr) {
        if (!expr) {
            return null;
        }
        if (/^-?\d+$/.test(expr)) {
            return parseInt(expr, 10);
        }
        if (/^0x[0-9a-f]+$/i.test(expr)) {
            return parseInt(expr, 16);
        }
        return null;
}

function parseRatingLiteral(expr) {
        if (!expr) {
            return null;
        }
        var match = /^RideRating::make\((-?\d+),\s*(\d+)\)$/.exec(expr);
        if (match) {
            return parseInt(match[1], 10) + (parseInt(match[2], 10) / 100);
        }
        return null;
}

function parseFixed2Literal(expr) {
        if (!expr) {
            return null;
        }
        var match = /^MakeFixed16_2dp\((-?\d+),\s*(\d+)\)$/.exec(expr);
        if (match) {
            return parseInt(match[1], 10) + (parseInt(match[2], 10) / 100);
        }
        return null;
}

function parseFixed16Expr(expr) {
        var intValue = parseSourceInteger(expr);
        if (intValue !== null) {
            return intValue / 65536;
        }
        return parseFixed2Literal(expr);
}

function parseThresholdValue(factorKey, expr) {
        if (!expr) {
            return null;
        }
        switch (factorKey) {
            case "bonus_length":
            case "req_length":
            case "ride_specific_tower":
            case "ride_specific_roto_drop":
                if (/^0x/i.test(expr)) {
                    return parseInt(expr, 16) / 65536;
                }
                return parseSourceInteger(expr);
            case "bonus_duration":
                return parseSourceInteger(expr);
            case "req_drop_height":
                return parseSourceInteger(expr);
            case "req_max_speed":
                return parseFixed16Expr(expr);
            case "req_negative_gs":
            case "req_lateral_gs":
                return parseFixed2Literal(expr) !== null ? parseFixed2Literal(expr) : parseSourceInteger(expr);
            case "req_num_drops":
            case "req_inversions":
            case "req_unsheltered":
            case "req_reversals":
            case "req_holes":
            case "req_stations":
            case "ride_specific_go_karts":
            case "bonus_reversals":
            case "bonus_holes":
            case "bonus_num_trains":
                return parseSourceInteger(expr);
            default:
                return parseSourceInteger(expr);
        }
}

function formatRatingDelta(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return "n/a";
        }
        return (value >= 0 ? "+" : "") + formatFixed(value, 2);
}

function computeShiftedContribution(units, coeffExpr) {
        var coeff = parseSourceInteger(coeffExpr);
        if (coeff === null) {
            return null;
        }
        return Math.floor((units * coeff) / 65536) / 100;
}

function getApproxPerUnitContribution(coeffExpr, unitScale) {
        var coeff = parseSourceInteger(coeffExpr);
        if (coeff === null) {
            return null;
        }
        return (coeff / 65536 / 100) * unitScale;
}

function formatTargetText(factorKey, target) {
        if (target === null || target === undefined || isNaN(target)) {
            return null;
        }
        switch (factorKey) {
            case "bonus_length":
            case "req_length":
            case "ride_specific_tower":
            case "ride_specific_roto_drop":
                return formatLength(target);
            case "bonus_duration":
                return formatSeconds(target);
            case "req_drop_height":
                return formatHeightUnits(target);
            case "req_max_speed":
                return formatSpeed(target);
            case "req_negative_gs":
            case "req_lateral_gs":
                return formatFixed(target, 2) + " G";
            case "req_unsheltered":
                return target + "/8 sheltered";
            default:
                return String(target);
        }
}

function appendAnalysisExtra(other, key, text) {
        if (!text || !other[key]) {
            return;
        }
        if (other[key].extra) {
            other[key].extra += "\n" + text;
        }
        else {
            other[key].extra = text;
        }
}

function parseDirectRatingValue(expr) {
        var literal = parseRatingLiteral(expr);
        if (literal !== null) {
            return literal;
        }
        var raw = parseSourceInteger(expr);
        if (raw !== null) {
            return raw / 100;
        }
        return null;
}

function buildPenaltyDivisionText(modifier, zeroExcitement) {
        var exciteDiv = parseSourceInteger(modifier.e);
        var intensityDiv = parseSourceInteger(modifier.i);
        var nauseaDiv = parseSourceInteger(modifier.n);
        var parts = [];
        if (zeroExcitement) {
            parts.push("excitement becomes 0");
        }
        else {
            parts.push("excitement /" + (exciteDiv !== null ? exciteDiv : "?"));
        }
        parts.push("intensity /" + (intensityDiv !== null ? intensityDiv : "?"));
        parts.push("nausea /" + (nauseaDiv !== null ? nauseaDiv : "?"));
        return parts.join(", ");
}

function isPrimaryTrackBlock(el) {
        return el.sequence === null || el.sequence === 0;
}

function isLikelySheltered(tile, trackEl) {
        var i;
        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            if (!el || el.isGhost || el === trackEl) {
                continue;
            }

            if (el.type === "surface" && el.baseHeight > trackEl.clearanceHeight) {
                return true;
            }

            if (el.baseZ >= trackEl.clearanceZ) {
                if (
                    el.type === "small_scenery" ||
                    el.type === "large_scenery" ||
                    el.type === "wall" ||
                    el.type === "footpath" ||
                    el.type === "entrance"
                ) {
                    return true;
                }
            }
        }
        return false;
}

function collectTrackStats(tile, tileX, tileY, el, stats) {
        if (isLikelySheltered(tile, el)) {
            stats.shelteredEstimate++;
        }

        if (safeGetStationIndex(el) !== null) {
            stats.stationTiles.push({
                x: tileX,
                y: tileY,
                z: el.baseZ,
                direction: el.direction
            });
        }

        if (!isPrimaryTrackBlock(el)) {
            return;
        }

        stats.primaryTrackPieces++;

        var segment = context.getTrackSegment(el.trackType);
        if (!segment) {
            return;
        }

        if (segment.isBankedTurn) {
            stats.bankedTurns++;
        }
        else if (segment.isSlopedTurn) {
            stats.slopedTurns++;
        }
        else if (segment.turnDirection && segment.turnDirection !== "straight") {
            stats.flatTurns++;
        }

        if (segment.isHelix) {
            stats.helixSections++;
        }
        if (segment.countsAsInversion || segment.isInversion) {
            stats.inversionPieces++;
        }
        if (segment.countsAsGolfHole) {
            stats.golfHoles++;
        }

        var description = (segment.description || "").toLowerCase();
        if (description.indexOf("reverser") !== -1) {
            stats.reverserPieces++;
        }
        if (description.indexOf("spinning tunnel") !== -1) {
            stats.spinningTunnelPieces++;
        }
        if (description.indexOf("waterfall") !== -1) {
            stats.waterfallPieces++;
        }
        if (description.indexOf("whirlpool") !== -1) {
            stats.whirlpoolPieces++;
        }
        if (
            description.indexOf("water splash") !== -1 ||
            description.indexOf("watersplash") !== -1 ||
            description.indexOf("splashdown") !== -1
        ) {
            stats.waterSplashPieces++;
        }
}

function getTrainInfo(ride) {
        var heads = ride.vehicles || [];
        var numTrains = 0;
        var carsPerTrain = 0;
        var reversedTrains = 0;
        var i;

        for (i = 0; i < heads.length; i++) {
            var headId = heads[i];
            if (headId === null || headId === undefined) {
                continue;
            }

            var car = map.getEntity(headId);
            if (!car || car.type !== "car") {
                continue;
            }

            numTrains++;
            if (car.isReversed) {
                reversedTrains++;
            }

            var cars = 0;
            var current = car;
            while (current && current.type === "car") {
                cars++;
                if (current.nextCarOnTrain === null || current.nextCarOnTrain === undefined) {
                    break;
                }
                current = map.getEntity(current.nextCarOnTrain);
            }

            if (cars > carsPerTrain) {
                carsPerTrain = cars;
            }
        }

        return {
            numTrains: numTrains,
            carsPerTrain: carsPerTrain,
            reversedTrains: reversedTrains
        };
}

function getApproxSceneryScore(ride) {
        if (!ride.stations || ride.stations.length === 0 || !ride.stations[0]) {
            return { score: 0, sceneryItems: 0, underground: false };
        }

        var station = ride.stations[0];
        var tileX = Math.floor(station.start.x / TILE_SIZE);
        var tileY = Math.floor(station.start.y / TILE_SIZE);
        if (tileX < 0 || tileY < 0 || tileX >= map.size.x || tileY >= map.size.y) {
            return { score: 0, sceneryItems: 0, underground: false };
        }

        var startTile = map.getTile(tileX, tileY);
        var i;
        for (i = 0; i < startTile.numElements; i++) {
            var startEl = startTile.getElement(i);
            if (startEl && !startEl.isGhost && startEl.type === "surface" && startEl.baseZ > station.start.z) {
                return { score: 40, sceneryItems: 0, underground: true };
            }
        }

        var items = 0;
        var minX = Math.max(tileX - 5, 0);
        var maxX = Math.min(tileX + 5, map.size.x - 1);
        var minY = Math.max(tileY - 5, 0);
        var maxY = Math.min(tileY + 5, map.size.y - 1);
        var x;
        var y;
        for (y = minY; y <= maxY; y++) {
            for (x = minX; x <= maxX; x++) {
                var tile = map.getTile(x, y);
                for (i = 0; i < tile.numElements; i++) {
                    var el = tile.getElement(i);
                    if (!el || el.isGhost) {
                        continue;
                    }
                    if (el.type === "small_scenery" || el.type === "large_scenery") {
                        items++;
                    }
                }
            }
        }

        return {
            score: Math.min(items, 47) * 5,
            sceneryItems: items,
            underground: false
        };
}

function hasAdjacentStationTrack(stats, rideId) {
        var i;
        for (i = 0; i < stats.stationTiles.length; i++) {
            var stationTile = stats.stationTiles[i];
            var leftDir = (stationTile.direction + 1) & 3;
            var rightDir = (stationTile.direction + 3) & 3;
            if (hasForeignStationOnSide(stationTile, leftDir, rideId) || hasForeignStationOnSide(stationTile, rightDir, rideId)) {
                return true;
            }
        }
        return false;
}

function hasForeignStationOnSide(stationTile, direction, rideId) {
        var x = stationTile.x + DIR_DELTA[direction].x;
        var y = stationTile.y + DIR_DELTA[direction].y;
        if (x < 0 || y < 0 || x >= map.size.x || y >= map.size.y) {
            return false;
        }

        var tile = map.getTile(x, y);
        var i;
        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            if (!el || el.isGhost || el.type !== "track") {
                continue;
            }
            if (el.ride !== rideId && safeGetStationIndex(el) !== null) {
                return true;
            }
        }
        return false;
}






function scanRideTrackElements(ride, counts, debug, stats) {
        var x;
        var y;
        for (y = 0; y < map.size.y; y++) {
            for (x = 0; x < map.size.x; x++) {
                var tile = map.getTile(x, y);
                var i;
                for (i = 0; i < tile.numElements; i++) {
                    var el = tile.getElement(i);
                    if (!el || el.isGhost || el.type !== "track") {
                        continue;
                    }
                    if (el.ride !== ride.id) {
                        continue;
                    }

                    debug.trackBlocksScored++;
                    collectTrackStats(tile, x, y, el, stats);
                    scoreCloseProximity(counts, el, {
                        x: x * TILE_SIZE,
                        y: y * TILE_SIZE,
                        z: el.baseZ,
                        direction: el.direction
                    });
                }
            }
        }
}

function scoreCloseProximity(counts, input, pos) {
        var tileX = Math.floor(pos.x / TILE_SIZE);
        var tileY = Math.floor(pos.y / TILE_SIZE);
        var tile = map.getTile(tileX, tileY);
        var currentSurfaceBaseHeight = null;
        var i;

        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            if (!el || el.isGhost) {
                continue;
            }

            if (el.type === "surface") {
                currentSurfaceBaseHeight = el.baseHeight;
                if (el.baseZ === pos.z) {
                    inc(counts, "surface_touch");
                }

                if (el.waterHeight !== 0) {
                    var z = el.waterHeight;
                    if (z <= pos.z) {
                        inc(counts, "water_over");
                        if (z === pos.z) {
                            inc(counts, "water_touch");
                        }
                        z += 16;
                        if (z === pos.z) {
                            inc(counts, "water_low");
                        }
                        z += 112;
                        if (z <= pos.z) {
                            inc(counts, "water_high");
                        }
                    }
                }
            }
            else if (el.type === "footpath") {
                if (!el.isQueue) {
                    if (el.clearanceZ === input.baseZ) {
                        inc(counts, "path_touch_above");
                    }
                    if (el.baseZ === input.clearanceZ) {
                        inc(counts, "path_touch_under");
                    }
                }
                else {
                    if (el.clearanceZ <= input.baseZ) {
                        inc(counts, "queue_path_over");
                    }
                    if (el.clearanceZ === input.baseZ) {
                        inc(counts, "queue_path_touch_above");
                    }
                    if (el.baseZ === input.clearanceZ) {
                        inc(counts, "queue_path_touch_under");
                    }
                }
            }
            else if (el.type === "track") {
                if (isVerticalLoop(el.trackType) && (el.sequence === 3 || el.sequence === 6)) {
                    if (el.baseHeight - input.clearanceHeight <= 10) {
                        inc(counts, "through_vertical_loop");
                    }
                }

                if (el.ride !== input.ride) {
                    inc(counts, "foreign_track_above_or_below");
                    if (el.clearanceZ === input.baseZ) {
                        inc(counts, "foreign_track_touch_above");
                    }
                    if (el.clearanceHeight + 2 <= input.baseHeight && el.clearanceHeight + 10 >= input.baseHeight) {
                        inc(counts, "foreign_track_close_above");
                    }
                    if (input.clearanceZ === el.baseZ) {
                        inc(counts, "foreign_track_touch_above");
                    }
                    if (input.clearanceHeight + 2 === el.baseHeight && input.clearanceHeight + 10 >= el.baseHeight) {
                        inc(counts, "foreign_track_close_above");
                    }
                }
                else {
                    var isStation = safeGetStationIndex(el) !== null;
                    if (el.clearanceHeight === input.baseHeight) {
                        inc(counts, "own_track_touch_above");
                        if (isStation) {
                            inc(counts, "own_station_touch_above");
                        }
                    }
                    if (el.clearanceHeight + 2 <= input.baseHeight && el.clearanceHeight + 10 >= input.baseHeight) {
                        inc(counts, "own_track_close_above");
                        if (isStation) {
                            inc(counts, "own_station_close_above");
                        }
                    }

                    if (input.clearanceZ === el.baseZ) {
                        inc(counts, "own_track_touch_above");
                        if (isStation) {
                            inc(counts, "own_station_touch_above");
                        }
                    }
                    if (input.clearanceHeight + 2 <= el.baseHeight && input.clearanceHeight + 10 >= el.baseHeight) {
                        inc(counts, "own_track_close_above");
                        if (isStation) {
                            inc(counts, "own_station_close_above");
                        }
                    }
                }
            }
        }

        scoreSideProximity(counts, input, tileX, tileY, (input.direction + 1) & 3, currentSurfaceBaseHeight);
        scoreSideProximity(counts, input, tileX, tileY, (input.direction + 3) & 3, currentSurfaceBaseHeight);
        scoreLoopProximity(counts, input, tileX, tileY);
}

function scoreSideProximity(counts, input, tileX, tileY, direction, currentSurfaceBaseHeight) {
        var dx = DIR_DELTA[direction].x;
        var dy = DIR_DELTA[direction].y;
        var x = tileX + dx;
        var y = tileY + dy;

        if (x < 0 || y < 0 || x >= map.size.x || y >= map.size.y) {
            return;
        }

        var tile = map.getTile(x, y);
        var i;
        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            if (!el || el.isGhost) {
                continue;
            }

            if (el.type === "surface") {
                if (currentSurfaceBaseHeight !== null && currentSurfaceBaseHeight <= input.baseHeight) {
                    if (input.clearanceHeight <= el.baseHeight) {
                        inc(counts, "surface_side_close");
                    }
                }
            }
            else if (el.type === "footpath") {
                if (Math.abs(input.baseZ - el.baseZ) <= 2 * Z_STEP) {
                    inc(counts, "path_side_close");
                }
            }
            else if (el.type === "track") {
                if (el.ride !== input.ride) {
                    if (Math.abs(input.baseZ - el.baseZ) <= 2 * Z_STEP) {
                        inc(counts, "foreign_track_side_close");
                    }
                }
            }
            else if (el.type === "small_scenery" || el.type === "large_scenery") {
                if (el.baseZ < input.clearanceZ) {
                    if (input.baseZ > el.clearanceZ) {
                        inc(counts, "scenery_track_above");
                    }
                    else {
                        inc(counts, "scenery_track_overlapping");
                    }
                }
            }
        }
}

function scoreLoopProximity(counts, input, tileX, tileY) {
        if (!isVerticalLoop(input.trackType)) {
            return;
        }

        scoreLoopHelper(counts, input, tileX, tileY);

        var dx = DIR_DELTA[input.direction].x;
        var dy = DIR_DELTA[input.direction].y;
        var x = tileX + dx;
        var y = tileY + dy;
        if (x >= 0 && y >= 0 && x < map.size.x && y < map.size.y) {
            scoreLoopHelper(counts, input, x, y);
        }
}

function scoreLoopHelper(counts, input, tileX, tileY) {
        var tile = map.getTile(tileX, tileY);
        var i;
        for (i = 0; i < tile.numElements; i++) {
            var el = tile.getElement(i);
            if (!el || el.isGhost) {
                continue;
            }

            if (el.type === "footpath") {
                var pathDiff = el.baseHeight - input.baseHeight;
                if (pathDiff >= 0 && pathDiff <= 16) {
                    inc(counts, "path_through_vertical_loop");
                }
            }
            else if (el.type === "track") {
                var isRightAngle = ((el.direction ^ input.direction) & 1) !== 0;
                if (isRightAngle) {
                    var zDiff = el.baseHeight - input.baseHeight;
                    if (zDiff >= 0 && zDiff <= 16) {
                        inc(counts, "track_through_vertical_loop");
                        if (isVerticalLoop(el.trackType)) {
                            inc(counts, "intersecting_vertical_loop");
                        }
                    }
                }
            }
        }
}

function isVerticalLoop(trackType) {
        return trackType === 40 || trackType === 41;
}

function inc(counts, key) {
        counts[key] = (counts[key] || 0) + 1;
}

function getEffectiveCount(bucket, raw) {
        if (bucket.kind === "presence") {
            return raw > 0 ? 1 : 0;
        }
        if (bucket.kind === "seeded") {
            if (raw <= 0) {
                return 0;
            }
            return Math.min(raw + bucket.seed, bucket.cap);
        }
        return Math.min(raw, bucket.cap);
}

function getRows(result) {
        var rows = [];
        var i;
        for (i = 0; i < BUCKETS.length; i++) {
            var bucket = BUCKETS[i];
            rows.push([
                lightRowText(bucket.label),
                lightRowText(String(result.raw[bucket.key])),
                lightRowText(String(result.effective[bucket.key])),
                lightRowText(bucket.kind === "presence" ? "-" : String(bucket.cap))
            ]);
        }

        return rows;
}

function getBucketByRow(row) {
        if (row === undefined || row === null || row < 0 || row >= TABLE_ROWS.length) {
            return null;
        }
        return TABLE_ROWS[row];
}

function normalizeImpactText(text) {
        if (!text) {
            return "";
        }
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/^\s+|\s+$/g, "");
}

function getFactorImpactText(analysis, impact) {
        if (!impact) {
            return "";
        }
        if (!analysis) {
            return impact;
        }

        var perUnit = analysis.perUnitImpact || "";
        var total = analysis.totalImpact || "";
        if (!perUnit && !total) {
            return impact;
        }

        var impactNorm = normalizeImpactText(impact);
        var perUnitNorm = normalizeImpactText(perUnit);
        var totalNorm = normalizeImpactText(total);
        var overlapsPerUnit = perUnitNorm && impactNorm.indexOf(perUnitNorm) >= 0;
        var overlapsTotal = totalNorm && impactNorm.indexOf(totalNorm) >= 0;

        if (overlapsPerUnit || overlapsTotal || String(impact).length > 120) {
            return "";
        }

        return impact;
}

function applyDetailToStores(result, bucketKey) {
        if (!bucketKey || !BUCKET_INFO[bucketKey]) {
            var emptyDescription = "Excitement boosts from nearby scenery, paths, and other rides.";
            detailDescStore.set(emptyDescription);
            detailImpactStore.set("");
            detailMinStore.set("n/a");
            detailMaxStore.set("n/a");
            detailRuleStore.set("n/a");
            detailCurrentStore.set("n/a");
            detailStatusStore.set("n/a");
            detailPerUnitStore.set("");
            detailTotalStore.set("");
            detailRawStore.set("n/a");
            detailEffectiveStore.set("n/a");
            detailModeStore.set("empty");
            applyDetailLayout("empty", emptyDescription, "");
            return;
        }

        var info = BUCKET_INFO[bucketKey];
        var hasLiveCounts = result && result.raw && Object.prototype.hasOwnProperty.call(result.raw, bucketKey);
        var analysis = result && result.other ? result.other[bucketKey] : null;
        var description = analysis && analysis.description ? analysis.description : info.description;
        var impact = analysis && analysis.impact ? analysis.impact : info.impact;
        var factorImpact = getFactorImpactText(analysis, impact);

        detailDescStore.set(description);

        if (hasLiveCounts) {
            detailImpactStore.set(impact);
            detailRawStore.set(String(result.raw[bucketKey]));
            detailEffectiveStore.set(String(result.effective[bucketKey]));
            detailModeStore.set("proximity");
            applyDetailLayout("proximity", description, impact);
        } else {
            detailImpactStore.set(factorImpact);
            detailMinStore.set(analysis && analysis.minValue ? analysis.minValue : "n/a");
            detailMaxStore.set(analysis && analysis.maxValue ? analysis.maxValue : "n/a");
            detailRuleStore.set(analysis && analysis.rule ? analysis.rule : "n/a");
            detailCurrentStore.set(analysis ? analysis.current : "n/a");
            detailStatusStore.set(analysis ? analysis.status : "n/a");
            detailPerUnitStore.set(analysis && analysis.perUnitImpact ? analysis.perUnitImpact : "");
            detailTotalStore.set(analysis && analysis.totalImpact ? analysis.totalImpact : "");
            detailModeStore.set("factor");
            applyDetailLayout("factor", description, factorImpact);
        }
}

function applyResultToWindowStores(result) {
        rideLabelStore.set(result.rideName + " (#" + result.rideId + ")");
        statusLabelStore.set("Track elements found: " + result.debug.trackBlocksScored);
        rowsStore.set(getRows(result));
        applyDetailToStores(result, selectedBucketKey);
}

var resultsWindowTemplate = flexWindow({
            title: "Proximity Boost Counter",
            width: { value: 380, min: 380, max: 380 },
            height: { value: 400, min: 220, max: 428 },
            position: "center",
            padding: 8,
            colours: [26, 26],
            onClose: function () {
                currentResultsWindow = null;
            },
            content: [
                horizontal({
                    content: [
                        vertical({
                            width: "1w",
                            spacing: 2,
                            content: [
                                label({ text: rideLabelStore }),
                                label({ text: statusLabelStore })
                            ]
                        }),
                        button({
                            text: "Refresh",
                            width: 66,
                            height: 18,
                            onClick: function () {
                                refreshWindowData();
                            }
                        }),
                        button({
                            text: "Pick Ride",
                            width: 66,
                            height: 18,
                            onClick: function () {
                                startRidePicker();
                            }
                        })
                    ]
                }),
                listview({
                    height: "1w",
                    isStriped: true,
                    canSelect: true,
                    scrollbars: "vertical",
                    columns: [
                        { header: "Factor", width: 200 },
                        { header: "Total", width: 44 },
                        { header: "Scored", width: 44 },
                        { header: "Cap", width: 44 }
                    ],
                    items: rowsStore,
                    selectedCell: twoway(selectedCellStore),
                    onClick: function (item) {
                        var bucket = getBucketByRow(item);
                        if (!bucket) {
                            return;
                        }
                        selectedBucketKey = bucket.key;
                        applyDetailToStores(latestResult, selectedBucketKey);
                    }
                }),
                // description text label
                vertical({
                    spacing: 0,
                    content: [
                        label({ text: detailDescLineStores[0], visibility: detailDescLineVisibilityStores[0] }),
                        label({ text: detailDescLineStores[1], visibility: detailDescLineVisibilityStores[1] }),
                        label({ text: detailDescLineStores[2], visibility: detailDescLineVisibilityStores[2] }),
                        label({ text: detailDescLineStores[3], visibility: detailDescLineVisibilityStores[3] }),
                        label({ text: detailDescLineStores[4], visibility: detailDescLineVisibilityStores[4] }),
                        label({ text: detailDescLineStores[5], visibility: detailDescLineVisibilityStores[5] })
                    ]
                })
            ]
});

function openResultsWindow(result) {
        if (currentResultsWindow) {
            currentResultsWindow.close();
        }

        selectedCellStore.set(null);
        applyResultToWindowStores(result);
        currentResultsWindow = resultsWindowTemplate;
        refreshWindowData();
        resultsWindowTemplate.open();
}

function refreshWindowData() {
        if (selectedRideId === null || selectedRideId === undefined) {
            return;
        }

        var ride = map.getRide(selectedRideId);
        if (!ride) {
            return;
        }

        latestResult = analyzeRide(ride);
        applyResultToWindowStores(latestResult);
}

