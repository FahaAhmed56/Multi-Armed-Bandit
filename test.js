// Run with: node test.js
const assert = require("assert");
const { simulate, mulberry32, beta } = require("./bandit.js");
let passed = 0; const test = (n, f) => { f(); passed++; console.log("  ✓ " + n); };

test("Beta sampler has the right mean (Beta(3,7) ≈ 0.30)", () => {
  const r = mulberry32(1); let s = 0; for (let i = 0; i < 20000; i++) s += beta(3, 7, r);
  assert.ok(Math.abs(s / 20000 - 0.3) < 0.01);
});

const KINDS = ["random", "greedy", "ucb", "thompson"];
const avg = {};
test("average regret over 200 random games of 1,000 pulls", () => {
  const r = mulberry32(7);
  for (const k of KINDS) avg[k] = { regret: 0, best: 0 };
  for (let g = 0; g < 200; g++) {
    const probs = Array.from({ length: 5 }, () => r() * 0.8 + 0.05), bestArm = probs.indexOf(Math.max(...probs));
    for (const k of KINDS) {
      const { agent, regret } = simulate(k, probs, 1000, mulberry32(g * 31 + k.length));
      avg[k].regret += regret.at(-1) / 200;
      avg[k].best += (agent.pulls.indexOf(Math.max(...agent.pulls)) === bestArm) / 200;
    }
  }
  for (const k of KINDS) console.log(`    ${k.padEnd(9)} regret ${avg[k].regret.toFixed(1).padStart(6)} | most-pulled arm was the best ${(avg[k].best * 100).toFixed(0)}% of games`);
});
test("every learning strategy beats random by a wide margin", () => {
  for (const k of ["greedy", "ucb", "thompson"]) assert.ok(avg[k].regret < avg.random.regret / 3, k);
});
test("Thompson sampling has the lowest regret", () => {
  assert.ok(avg.thompson.regret < avg.ucb.regret && avg.thompson.regret < avg.greedy.regret);
});
console.log(`\nAll ${passed} tests passed ✓`);
