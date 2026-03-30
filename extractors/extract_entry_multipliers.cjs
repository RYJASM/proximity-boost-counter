// extract_entry_multipliers.cjs
// Scans OpenRCT2 ride object JSON files and extracts ratingMultipler values.
// Outputs: src/entry_multipliers.json
//
// Usage: node extractors/extract_entry_multipliers.cjs
// Run this whenever you update OpenRCT2 to regenerate the data.

const fs = require('fs');
const path = require('path');

// Folders to scan — add more source packs if needed
const OBJECT_DIRS = [
    'C:\\Program Files\\OpenRCT2\\data\\object\\rct2\\ride',
    'C:\\Program Files\\OpenRCT2\\data\\object\\rct1\\ride',
    'C:\\Program Files\\OpenRCT2\\data\\object\\rct2tt\\ride',
    'C:\\Program Files\\OpenRCT2\\data\\object\\rct2ww\\ride',
    'C:\\Program Files\\OpenRCT2\\data\\object\\official\\ride',
];

const OUTPUT_FILE = path.resolve(__dirname, '..', 'src', 'entry_multipliers.json');

function scanDir(dir, results) {
    if (!fs.existsSync(dir)) {
        console.log('  (skipping, not found): ' + dir);
        return;
    }

    var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.json'); });
    console.log('  Scanning ' + files.length + ' files in: ' + dir);

    files.forEach(function(file) {
        var fullPath = path.join(dir, file);
        var identifier = file.replace(/\.json$/, '');

        try {
            var raw = fs.readFileSync(fullPath, 'utf8');
            var data = JSON.parse(raw);

            var properties = data.properties;
            if (!properties) return;

            // Note: "ratingMultipler" is a typo in the OpenRCT2 source — missing second 'i'
            var ratingMultipler = properties.ratingMultipler;
            if (!ratingMultipler) return;

            var e = ratingMultipler.excitement || 0;
            var i = ratingMultipler.intensity || 0;
            var n = ratingMultipler.nausea || 0;

            // Only store non-zero entries to keep table small
            if (e !== 0 || i !== 0 || n !== 0) {
                if (results[identifier]) {
                    console.warn('  WARNING: duplicate identifier: ' + identifier);
                }
                results[identifier] = { e: e, i: i, n: n };
            }
        } catch (err) {
            console.warn('  ERROR reading ' + file + ': ' + err.message);
        }
    });
}

var results = {};
OBJECT_DIRS.forEach(function(dir) {
    scanDir(dir, results);
});

var count = Object.keys(results).length;
console.log('\nFound ' + count + ' ride entries with non-zero rating multipliers.\n');

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 4), 'utf8');
console.log('Written to: ' + OUTPUT_FILE);
console.log('\nSample entries:');
var keys = Object.keys(results).sort();
keys.slice(0, 10).forEach(function(k) {
    console.log('  ' + k + ' -> e:' + results[k].e + ' i:' + results[k].i + ' n:' + results[k].n);
});
