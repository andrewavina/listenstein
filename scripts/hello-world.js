import fs from "node:fs";
import path from "node:path";

console.log("Hello, World!");
// -----------------------
// Tiny deterministic PRNG
// -----------------------
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------
// Config
// -----------------------
const DATASET = (process.env.DATASET || "agents").toLowerCase(); // "agents" | "security_events"
const COUNT = parseInt(process.env.COUNT || "50000", 10);
const SEED = parseInt(process.env.SEED || "1337", 10);

const outDir = path.resolve(process.cwd(), "data");
const outFile = path.join(outDir, `${DATASET}-${COUNT}.json`);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const randInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;

// -----------------------
// Generators
// -----------------------
function randomName(i) {
  const first = ["Alex","Sam","Jordan","Taylor","Casey","Drew","Avery","Riley","Quinn","Morgan","Jamie","Cameron","Hayden","Parker","Skyler"];
  const last  = ["Lopez","Kim","Patel","Garcia","Nguyen","Johnson","Williams","Brown","Davis","Miller","Wilson","Martinez","Anderson","Thomas","Hernandez"];
  return `${pick(first)} ${pick(last)} #${i}`;
}

function isoRecent(secondsBackMax = 60 * 60 * 24 * 7) {
  const now = Date.now();
  const delta = randInt(0, secondsBackMax) * 1000;
  return new Date(now - delta).toISOString();
}

// Agents dataset (call-center style)
function generateAgentsRow(i) {
  const statusWeights = [
    ["available", 0.55],
    ["busy", 0.25],
    ["break", 0.10],
    ["offline", 0.10],
  ];
  const queueWeights = [
    ["sales", 0.35],
    ["support", 0.45],
    ["billing", 0.20],
  ];
  const weightedPick = (weights) => {
    const x = rnd();
    let acc = 0;
    for (const [val, w] of weights) {
      acc += w;
      if (x <= acc) return val;
    }
    return weights[weights.length - 1][0];
  };

  const id = `a-${i}`;
  return {
    id,
    name: randomName(i),
    status: weightedPick(statusWeights),              // filterable
    queue: weightedPick(queueWeights),                // filterable
    callsToday: randInt(0, 80),                       // sortable
    avgHandleTimeSec: randInt(120, 900),             // sortable
    durationSec: randInt(0, 1800),                   // sortable
    type: pick(["voice", "chat", "email"]),          // filterable
    updatedAt: isoRecent(),                           // sortable
  };
}

// Security events dataset (Corelight-ish)
function randomIp() {
  return `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}
function generateSecurityEventRow(i) {
  const id = `e-${i}`;
  return {
    id,
    timestamp: isoRecent(60 * 60 * 24 * 3),          // last 3 days
    srcIp: randomIp(),                                // filterable
    dstIp: randomIp(),                                // filterable
    protocol: pick(["tcp", "udp", "icmp"]),           // filterable
    bytesIn: randInt(0, 5_000_000),                   // sortable
    bytesOut: randInt(0, 5_000_000),                  // sortable
    severity: pick(["low", "med", "high", "crit"]),   // filterable/sortable
    rule: pick(["zeek", "suricata", "yara"]),         // filterable
    assetId: `asset-${randInt(1, 10000)}`,            // filterable
    type: "network_event",
    updatedAt: isoRecent(),                           // sortable
  };
}

// -----------------------
// Main
// -----------------------
console.time(`generate ${DATASET} ${COUNT}`);
let rows;
if (DATASET === "agents") {
  rows = Array.from({ length: COUNT }, (_, i) => generateAgentsRow(i + 1));
} else if (DATASET === "security_events") {
  rows = Array.from({ length: COUNT }, (_, i) => generateSecurityEventRow(i + 1));
} else {
  console.error(`Unknown DATASET="${DATASET}". Use "agents" or "security_events".`);
  process.exit(1);
}
fs.writeFileSync(outFile, JSON.stringify(rows), "utf8");
console.timeEnd(`generate ${DATASET} ${COUNT}`);
console.log(`✅ Wrote ${rows.length.toLocaleString()} rows → ${path.relative(process.cwd(), outFile)}`);
