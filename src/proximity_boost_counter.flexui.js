/// <reference path="../distribution/openrct2.d.ts" />

// Copyright (C) 2026 RYJASM
// Licensed under the GNU General Public License v3.0.

import { button, compute, groupbox, horizontal, label, listview, store, tab, tabwindow, twoway, vertical } from "openrct2-flexui";

registerPlugin({
    name: "Proximity Boost Counter",
    version: "1.2.2",
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
            openEmptyWindow();
        });

        if (ui.registerShortcut) {
            ui.registerShortcut({
                id: "proximity-boost-counter.open",
                text: "[Proximity Boost Counter] Open",
                bindings: ["CTRL+P", "GUI+P"],
                callback: function () {
                    openEmptyWindow();
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



var RIDE_TYPE_MODIFIERS = __RIDE_TYPES_DATA_PLACEHOLDER__;

function getTableRowByKey(key) {
    var i;
    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        if (PROXIMITY_DATA[i].key === key) {
            return PROXIMITY_DATA[i];
        }
    }
    return null;
}

var PROXIMITY_DATA = __PROXIMITY_DATA_PLACEHOLDER__;
var ENTRY_MULTIPLIERS = __ENTRY_MULTIPLIERS_PLACEHOLDER__;

var latestResult = null;
var selectedBucketKey = null;
var windowTitleStore = store("Proximity Boost Counter");
var rideLabelStore = store("");
var statusLabelStore = store("");
var excitementSummaryStore = store("");
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


function startRidePicker() {
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

    result.other.bonus_scenery_total = buildSceneryBoostAnalysis(ride);

    scanRideTrackElements(ride, result.raw, result.debug, result.trackStats);
    if (result.debug.trackBlocksScored === 0) {
        result.notes.push("No track elements for the selected ride were found during the full-map scan.");
    }

    result._ride = ride;
    var _modifiers = getRideModifiers(ride);
    result._requirementPenalty = getRequirementPenalty(ride, _modifiers, result.trackStats);
    result._scaleFactor = getScaleFactor(ride) * result._requirementPenalty;

    // Note if the ride hasn't completed a test circuit yet (excitement = unrated).
    var exc = ride.excitement;
    if (exc === undefined || exc === null || exc < 0 || exc >= 0xFFFF) {
        result.notes.push("Ride has no excitement rating yet (still testing or never tested). Proximity counts are valid, but the excitement summary requires a rated ride.");
    } else if (ride.status === "testing" || ride.status === "simulating") {
        result.notes.push("Ride is currently testing. The excitement shown is from the most recently completed test run.");
    }

    return finalizeResult(result);
}

function finalizeResult(result) {
    var i;
    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        var bucket = PROXIMITY_DATA[i];
        result.effective[bucket.key] = getEffectiveCount(bucket, result.raw[bucket.key]);
    }
    return result;
}

function createZeroCounts() {
    var counts = {};
    var i;
    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        counts[PROXIMITY_DATA[i].key] = 0;
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
        stationTiles: []
    };
}

function createOtherAnalysis() {
    return {
        bonus_scenery_total: {
            description: getTableRowByKey("bonus_scenery_total").description,
            impact: getTableRowByKey("bonus_scenery_total").impact,
            minValue: "0.00",
            maxValue: "n/a",
            rule: "n/a",
            current: "0.00",
            status: "No data",
            rawFound: "0",
            countedTowardCap: "0",
            cap: "47",
            perUnitImpact: "",
            totalImpact: ""
        }
    };
}

function getRideModifiers(ride) {
    if (!ride || ride.type === undefined || ride.type === null) {
        return null;
    }
    return RIDE_TYPE_MODIFIERS[String(ride.type)] || null;
}

function buildSceneryBoostAnalysis(ride) {
    var base = createOtherAnalysis().bonus_scenery_total;
    var modifiers = getRideModifiers(ride);
    var scenery = getApproxSceneryScore(ride);
    var capItems = 47;
    var countedItems = Math.min(scenery.sceneryItems || 0, capItems);

    base.rawFound = String(scenery.sceneryItems || 0);
    base.countedTowardCap = String(countedItems);
    base.cap = String(capItems);

    var bonusScenery = modifiers ? modifiers.BonusScenery : null;
    if (!bonusScenery) {
        base.current = "0.00";
        base.status = "Ride type has no scenery bonus modifier";
        base.rule = "BonusScenery not defined for this ride type.";
        return base;
    }

    var coeffExpr = bonusScenery.e;
    var coeffRaw = parseSourceInteger(coeffExpr);
    if (coeffRaw === null) {
        base.current = "0.00";
        base.status = "Unsupported scenery coefficient";
        base.rule = "Could not parse BonusScenery excitement coefficient.";
        return base;
    }

    var contribution = computeShiftedContribution(scenery.score, coeffExpr);
    var perItem = getApproxPerUnitContribution(coeffExpr, 5);

    base.minValue = "0.00";
    base.maxValue = formatFixed(computeShiftedContribution(capItems * 5, coeffExpr), 2);
    base.rule = "Counts up to 47 pieces of scenery towards the boost score. If station is underground, a fixed count of 40 items is used.";
    base.current = formatFixed(contribution, 2);
    base.status = scenery.underground
        ? "Underground station fallback used"
        : "Scenery items counted: " + String(scenery.sceneryItems);
    base.perUnitImpact = perItem !== null
        ? "Per scenery item: " + formatRatingDelta(perItem)
        : "";
    base.totalImpact = "Total from current scenery score: " + formatRatingDelta(contribution);

    return base;
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

// Returns true if the track piece is underground (terrain surface base is above track base).
// This matches the game's sheltered-by-terrain condition: surfaceElement.GetBaseZ() > vehicleZ.
// Unlike isLikelySheltered, this does NOT trigger on scenery, walls, or paths above the track.
function isUnderground(tile, trackEl) {
    var i;
    for (i = 0; i < tile.numElements; i++) {
        var el = tile.getElement(i);
        if (!el || el.isGhost || el.type !== "surface") {
            continue;
        }
        // Surface base height above track base height = track is embedded in terrain.
        return el.baseHeight > trackEl.baseHeight;
    }
    return false;
}

function collectTrackStats(tile, tileX, tileY, el, stats) {
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
            return { score: 200, sceneryItems: 40, underground: true };
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
                // The game walks the track piece-by-piece via TrackBlockGetNext, which always
                // lands on sequence 0 (the primary block). Secondary blocks of multi-tile pieces
                // are never visited. Skip them so our counts match the game's proximity walk.
                if (el.sequence !== 0) {
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
            if (el.ride !== input.ride && isVerticalLoop(el.trackType) && (el.sequence === 3 || el.sequence === 6)) {
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

function getIntensityPenalty(ride) {
    if (!ride) return 1.0;
    var id = ride.object ? ride.object.identifier : null;
    var m = id ? ENTRY_MULTIPLIERS[id] : null;
    var intensityMult = m ? (m.i || 0) : 0;
    // The game checks intensity thresholds BEFORE applying the entry multiplier
    // (RideRatingsApplyIntensityPenalty runs before RideRatingsApplyAdjustments).
    // ride.intensity is post-multiplier, so reverse it out first.
    var iRaw = ride.intensity / (1 + intensityMult / 128);
    var f = 1.0;
    if (iRaw >= 1000) f *= 0.75;
    if (iRaw >= 1100) f *= 0.75;
    if (iRaw >= 1200) f *= 0.75;
    if (iRaw >= 1320) f *= 0.75;
    if (iRaw >= 1450) f *= 0.75;
    return f;
}

function getEntryMultiplierFactor(ride) {
    if (!ride) return 1.0;
    var id = ride.object ? ride.object.identifier : null;
    var m = id ? ENTRY_MULTIPLIERS[id] : null;
    var e = m ? m.e : 0;
    return 1 + (e / 128);
}

function getScaleFactor(ride) {
    return getIntensityPenalty(ride) * getEntryMultiplierFactor(ride);
}

// Computes the multiplier from requirement penalty checks (values <= 1.0).
// The game divides the ENTIRE rating (including proximity/scenery boost) by these
// divisors when minimum track requirements are not met, and does so BEFORE the
// intensity penalty.  Only checks that have clear unit matches to the plugin API
// are implemented here; others (MaxSpeed, NegativeGs, Length) need unit research.
//
// RelaxRequirementsIfInversions: RequirementDropHeight, RequirementNumDrops, and
// RequirementNegativeGs are SKIPPED by the game when the ride has inversions.
// We proxy this with trackStats.inversionPieces > 0.
function getRequirementPenalty(ride, modifiers, trackStats) {
    if (!modifiers || !ride) return 1.0;
    var penalty = 1.0;

    // Skip drop-related requirements if ride has inversions (RelaxRequirementsIfInversions).
    var hasInversions = trackStats && (trackStats.inversionPieces || 0) > 0;

    if (!hasInversions) {
        // RequirementDropHeight: excitement /= e  if highestDropHeight < threshold.
        // Both sides in game height units; API ride.highestDropHeight matches.
        if (modifiers.RequirementDropHeight) {
            var dropThresh = parseSourceInteger(modifiers.RequirementDropHeight.t);
            var dropDiv = parseSourceInteger(modifiers.RequirementDropHeight.e);
            if (dropThresh !== null && dropDiv !== null && dropDiv > 1 &&
                ride.highestDropHeight < dropThresh) {
                penalty /= dropDiv;
            }
        }

        // RequirementNumDrops: excitement /= e  if numDrops < threshold.
        // API ride.numDrops is the same integer count as C++ ride.numDrops.
        if (modifiers.RequirementNumDrops) {
            var dropsThresh = parseSourceInteger(modifiers.RequirementNumDrops.t);
            var dropsDiv = parseSourceInteger(modifiers.RequirementNumDrops.e);
            if (dropsThresh !== null && dropsDiv !== null && dropsDiv > 1 &&
                ride.numDrops < dropsThresh) {
                penalty /= dropsDiv;
            }
        }
    }

    return penalty;
}

// Replicates ride_ratings_get_sheltered_ratings + RideRatingsApplyBonusSheltered.
// shelteredLength is accumulated during vehicle testing and is not exposed to plugins;
// we estimate it from the fraction of primary track pieces that are sheltered.
//   shelteredLengthShifted ≈ fraction * 1000  (1000 = the excitement cap)
//   numShelteredSections   ≈ round(fraction * 11) (11 = the section count cap)
// Banking/rotating flags are detected from segment geometry.
function computeBonusShelteredImpact(result, scaleFactor, modifiers) {
    if (!modifiers || !modifiers.BonusSheltered) return 0;
    var bonusShelteredE = parseSourceInteger(modifiers.BonusSheltered.e);
    if (bonusShelteredE === null || bonusShelteredE === 0) return 0;

    var stats = result.trackStats;
    if (!stats || stats.primaryTrackPieces === 0) return 0;

    var shelteredFraction = Math.min(stats.shelteredPrimaryPieces / stats.primaryTrackPieces, 1.0);
    if (shelteredFraction <= 0) return 0;

    // ride_ratings_get_sheltered_ratings(ride) reproduction:
    var shelteredLengthShifted = Math.round(shelteredFraction * 1000);
    var shelteredLengthUpTo1000 = Math.min(shelteredLengthShifted, 1000);
    var numShelteredSections = Math.min(Math.round(shelteredFraction * 11), 11);

    var subExcitement = Math.floor((shelteredLengthUpTo1000 * 9175) / 65536);
    if (stats.bankingWhileSheltered) subExcitement += 20;  // kBankingWhileSheltered
    if (stats.rotatingWhileSheltered) subExcitement += 20; // kRotatingWhileSheltered
    subExcitement += Math.floor((numShelteredSections * 774516) / 65536);

    // RideRatingsApplyBonusSheltered: (subRating.e * modifier.e) >> 16 / 100
    var exciteDelta = Math.floor((subExcitement * bonusShelteredE) / 65536) / 100;
    return exciteDelta * scaleFactor;
}

// Implements the per-bucket scoring from ride_ratings_get_proximity_score.
// helper_1(x, max, mult): floor(min(x, max) * mult / 65536)
// helper_2(x, addIfNotZero, max, mult): result=x; if(result>0) result+=seed; floor(min(result,max)*mult/65536)
// helper_3(x, fixed): x > 0 ? fixed : 0
// scorePreAdd: added unconditionally before helper_1 (only queue_path_over, preAdd=8)
function computeBucketScore(rawCount, bucket) {
    var h = bucket.scoreHelper;
    if (!h) return 0;
    if (h === 3) {
        return rawCount > 0 ? (bucket.scoreFixed || 0) : 0;
    }
    var x = rawCount;
    if (bucket.scorePreAdd) {
        x += bucket.scorePreAdd;
    } else if (h === 2 && x > 0 && bucket.seed) {
        x += bucket.seed;
    }
    var mult = bucket.scoreMult || 0;
    var cap = bucket.cap || 0;
    return Math.floor((Math.min(x, cap) * mult) / 65536);
}

function getEmptyRows() {
    var rows = [];
    var i;
    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        var rowDef = PROXIMITY_DATA[i];
        var capCell;
        if (rowDef.kind) {
            capCell = rowDef.kind === "presence" ? "-" : String(rowDef.cap);
        } else if (rowDef.key === "bonus_scenery_total") {
            capCell = "47";
        } else if (rowDef.key === "bonus_sheltered_total") {
            capCell = "11";
        } else {
            capCell = "-";
        }
        rows.push([
            lightRowText(rowDef.label),
            lightRowText("-"),
            lightRowText("-"),
            lightRowText(capCell),
            lightRowText("-")
        ]);
    }
    return rows;
}

function getRows(result) {
    var rows = [];
    var i;
    var scaleFactor = (result && result._scaleFactor) ? result._scaleFactor : null;
    var modifiers = (result && result._ride) ? getRideModifiers(result._ride) : null;
    var bonusProxCoeff = modifiers && modifiers.BonusProximity ? modifiers.BonusProximity.e : null;

    // Pre-compute the one-floored total excitement so per-bucket values are
    // proportional shares rather than independently floored. This matches how
    // the game applies a single floor to the combined proximity score, and
    // ensures row values sum to the same total shown in the excitement summary.
    var bCoeffParsed = bonusProxCoeff ? parseSourceInteger(bonusProxCoeff) : null;
    var totalProxScoreForRows = 0;
    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        if (PROXIMITY_DATA[i].kind) {
            totalProxScoreForRows += computeBucketScore(result.raw[PROXIMITY_DATA[i].key] || 0, PROXIMITY_DATA[i]);
        }
    }
    var totalExciteForRows = (bCoeffParsed !== null && totalProxScoreForRows > 0)
        ? Math.floor((totalProxScoreForRows * bCoeffParsed) / 65536)
        : null;

    for (i = 0; i < PROXIMITY_DATA.length; i++) {
        var rowDef = PROXIMITY_DATA[i];

        if (rowDef.kind) {
            var effCount = result.effective[rowDef.key];
            var impactCell = "-";
            if (scaleFactor !== null && totalExciteForRows !== null && totalProxScoreForRows > 0) {
                var rawCnt = result.raw[rowDef.key] || 0;
                var bScore = computeBucketScore(rawCnt, rowDef);
                if (bScore > 0) {
                    var excite = (bScore / totalProxScoreForRows) * totalExciteForRows / 100;
                    impactCell = formatRatingDelta(excite * scaleFactor);
                }
            }
            rows.push([
                lightRowText(rowDef.label),
                lightRowText(String(result.raw[rowDef.key])),
                lightRowText(String(effCount)),
                lightRowText(rowDef.kind === "presence" ? "-" : String(rowDef.cap)),
                lightRowText(impactCell)
            ]);
            continue;
        }

        var analysis = result && result.other ? result.other[rowDef.key] : null;
        var totalCell = analysis && analysis.current ? String(analysis.current) : "n/a";
        var scoredCell = "-";
        var capCell = analysis && analysis.maxValue ? String(analysis.maxValue) : "-";
        var sceneryImpact = "-";

        if (rowDef.key === "bonus_scenery_total") {
            totalCell = analysis && analysis.rawFound ? String(analysis.rawFound) : "0";
            scoredCell = analysis && analysis.countedTowardCap ? String(analysis.countedTowardCap) : "0";
            capCell = analysis && analysis.cap ? String(analysis.cap) : "47";
            if (analysis && analysis.current !== undefined && scaleFactor !== null) {
                var sceneryBase = parseFloat(analysis.current);
                if (!isNaN(sceneryBase)) {
                    sceneryImpact = formatRatingDelta(sceneryBase * scaleFactor);
                }
            }
        } else if (rowDef.key === "bonus_sheltered_total") {
            totalCell = analysis && analysis.rawFound ? String(analysis.rawFound) : "0";
            scoredCell = analysis && analysis.estimatedSections !== undefined ? String(analysis.estimatedSections) : "0";
            capCell = "11";
            if (analysis && analysis.current !== undefined && scaleFactor !== null) {
                var shelteredBase = parseFloat(analysis.current);
                if (!isNaN(shelteredBase) && shelteredBase > 0) {
                    sceneryImpact = formatRatingDelta(shelteredBase * scaleFactor);
                }
            }
        }

        rows.push([
            lightRowText(rowDef.label),
            lightRowText(totalCell),
            lightRowText(scoredCell),
            lightRowText(capCell),
            lightRowText(sceneryImpact)
        ]);
    }

    return rows;
}

function getBucketByRow(row) {
    if (row === undefined || row === null || row < 0 || row >= PROXIMITY_DATA.length) {
        return null;
    }
    return PROXIMITY_DATA[row];
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
    if (!bucketKey || !getTableRowByKey(bucketKey)) {
        var emptyDescription = "Estimated excitement boosts from nearby scenery, paths, and ride interactions (assuming ideal conditions).";
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

    var info = getTableRowByKey(bucketKey);
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

function computeExcitementSummary(result) {
    if (!result || result.rideId === undefined || result.rideId === null) {
        return "";
    }
    // Always re-read from the API so Refresh picks up the latest excitement and intensity.
    var ride = map.getRide(result.rideId);
    if (!ride) {
        return "";
    }
    var live = ride.excitement;
    if (live === undefined || live === null) {
        return "";
    }
    // During testing before the first full circuit, excitement = 0xFFFF = -1 (unrated).
    if (live < 0 || live >= 0xFFFF) {
        var testingStatus = (ride.status === "testing" || ride.status === "simulating")
            ? "Ride is still testing"
            : "Ride has no excitement rating yet";
        return "{WINDOW_COLOUR_2}" + testingStatus;
    }
    var liveDisplay = live / 100;
    // Recompute scale factor from live intensity so the penalty reflects the current rating.
    // Re-apply requirement penalty from scan-time (highestDropHeight and numDrops
    // don't change between tests, but intensity may have changed since last scan).
    var scaleFactor = getScaleFactor(ride) * (result._requirementPenalty || 1.0);
    var modifiers = getRideModifiers(ride);
    var bonusProxCoeff = modifiers && modifiers.BonusProximity ? modifiers.BonusProximity.e : null;

    var totalProxScore = 0;
    var j;
    for (j = 0; j < PROXIMITY_DATA.length; j++) {
        var bucket = PROXIMITY_DATA[j];
        if (!bucket.scoreHelper) continue;
        totalProxScore += computeBucketScore(result.raw[bucket.key] || 0, bucket);
    }
    var proxCoeff = bonusProxCoeff ? parseSourceInteger(bonusProxCoeff) : null;
    var totalProxImpact = proxCoeff !== null
        ? (Math.floor((totalProxScore * proxCoeff) / 65536) / 100 * scaleFactor)
        : 0;

    var sceneryAnalysis = result.other && result.other.bonus_scenery_total ? result.other.bonus_scenery_total : null;
    var sceneryBase = sceneryAnalysis ? parseFloat(sceneryAnalysis.current) : 0;
    var sceneryImpact = isNaN(sceneryBase) ? 0 : (sceneryBase * scaleFactor);

    // Sheltered boost is dynamic — accumulated from vehicle speed during testing —
    // and cannot be approximated reliably from a static scan.  It is shown in the
    // listview row for reference but is NOT included in the base/boost split here.
    // The summary shows only placement-controlled factors: proximity + scenery.
    var totalBoost = totalProxImpact + sceneryImpact;
    var withoutBoosts = liveDisplay - totalBoost;
    var boostStr = formatRatingDelta(totalBoost);

    // {WINDOW_COLOUR_2} = light pink (default label color for this window theme)
    // {BLACK} = base excitement (absorbs sheltered + other dynamic terms)
    // {WHITE} = boost delta (proximity + scenery only)
    return "{WINDOW_COLOUR_2}Excitement: " + withoutBoosts.toFixed(2)
        + "{WINDOW_COLOUR_2} {WHITE}" + boostStr
        + "{WINDOW_COLOUR_2} = " + liveDisplay.toFixed(2);
}

function applyResultToWindowStores(result) {
    rideLabelStore.set(result.rideName + " (#" + result.rideId + ")");
    excitementSummaryStore.set(computeExcitementSummary(result));
    statusLabelStore.set("Track Pieces: " + (result.trackStats ? result.trackStats.primaryTrackPieces : "?"));
    rowsStore.set(getRows(result));
    applyDetailToStores(result, selectedBucketKey);
}

var resultsWindowTemplate = tabwindow({
    title: windowTitleStore,
    width: { value: 380, min: 380, max: 380 },
    height: { value: 420, min: 220, max: 438 },
    position: "center",
    colours: [26, 26, 26],
    onClose: function () {
        currentResultsWindow = null;
    },
    onTabChange: function (index) {
        windowTitleStore.set(index === 0 ? "Proximity Boost Counter" : "About Proximity Boost Counter");
    },
    tabs: [
        tab({
            image: 5238,
            padding: 8,
            content: [
                horizontal({
                    content: [
                        vertical({
                            width: "1w",
                            spacing: 2,
                            content: [
                                label({ text: rideLabelStore }),
                                label({ text: excitementSummaryStore }),
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
                        { header: "Factor", width: 146 },
                        { header: "Total", width: 44 },
                        { header: "Scored", width: 44 },
                        { header: "Cap", width: 44 },
                        { header: "Est. Impact", width: 54 }
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
        }),
        tab({
            image: 5367,
            height: { value: 344, min: 344, max: 344 },
            padding: 8,
            content: [
                vertical({
                    spacing: 8,
                    content: [
                        groupbox({
                            text: "{WHITE}Total",
                            content: [
                                label({ text: "Number of qualifying track pieces found, uncapped." })
                            ]
                        }),
                        groupbox({
                            text: "{WHITE}Scored",
                            content: [
                                label({ text: "The capped count used in the actual calculation. Some factors" }),
                                label({ text: "add a seed bonus the moment you have any qualifying piece at all." })
                            ]
                        }),
                        groupbox({
                            text: "{WHITE}Cap",
                            content: [
                                label({ text: "The maximum number of pieces that contribute to this factor's"}),
                                label({ text: "score." })
                            ]
                        }),
                        groupbox({
                            text: "{WHITE}Est. Impact",
                            content: [
                                label({ text: "Approximate excitement gain under ideal conditions. Assumes" }),
                                label({ text: "no intensity penalty and uses known vehicle multipliers. Custom" }),
                                label({ text: "train types may not report accurate values." })

                            ]
                        }),
                        vertical({
                            spacing: 2,  // pixels between each label
                            content: [
                                label({ text: "Copyright (C) 2026 RYJASM" }),
                                label({ text: "Licensed under the GNU General Public License v3.0" })
                            ]
                        })
                    ]
                })
            ]
        })
    ]
});

function openEmptyWindow() {
    if (currentResultsWindow) {
        return;
    }
    rideLabelStore.set("{WHITE}No ride selected");
    excitementSummaryStore.set("Press \"Pick Ride\" to select a coaster");
    statusLabelStore.set("");
    rowsStore.set(getEmptyRows());
    selectedCellStore.set(null);
    applyDetailToStores(null, null);
    currentResultsWindow = resultsWindowTemplate;
    resultsWindowTemplate.open();
}

function openResultsWindow(result) {
    selectedCellStore.set(null);
    applyResultToWindowStores(result);

    if (currentResultsWindow) {
        refreshWindowData();
        return;
    }

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

