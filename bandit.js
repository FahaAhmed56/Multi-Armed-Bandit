// Multi-armed bandit strategies. No DOM, so they can be tested in Node.
// Each arm (slot machine) pays 1 with a hidden probability, else 0.
function mulberry32(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Beta(a, b) sample via two Gamma samples (Marsaglia-Tsang), used by Thompson sampling
function gamma(k, rand) {
  if (k < 1) return gamma(k + 1, rand) * Math.pow(rand(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { const u1 = rand(), u2 = rand(); x = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const beta = (a, b, rand) => { const x = gamma(a, rand), y = gamma(b, rand); return x / (x + y); };

class Agent {
  constructor(kind, nArms, rand, epsilon = 0.1) {
    Object.assign(this, { kind, rand, epsilon, pulls: new Array(nArms).fill(0), wins: new Array(nArms).fill(0), t: 0 });
  }
  mean(i) { return this.pulls[i] ? this.wins[i] / this.pulls[i] : 0; }
  choose() {
    const n = this.pulls.length, argmax = f => { let b = 0; for (let i = 1; i < n; i++) if (f(i) > f(b)) b = i; return b; };
    switch (this.kind) {
      case "random": return Math.floor(this.rand() * n);
      case "greedy":                                       // ε-greedy: explore 10% of the time, else best average so far
        return this.rand() < this.epsilon ? Math.floor(this.rand() * n) : argmax(i => this.mean(i) + (this.pulls[i] ? 0 : 1e9));
      case "ucb": {                                        // UCB1: optimism, average + bonus for rarely tried arms
        const untried = this.pulls.indexOf(0);
        if (untried >= 0) return untried;
        return argmax(i => this.mean(i) + Math.sqrt(2 * Math.log(this.t) / this.pulls[i]));
      }
      case "thompson":                                     // sample a plausible win rate per arm from its Beta belief, pick the highest
        return argmax(i => beta(1 + this.wins[i], 1 + this.pulls[i] - this.wins[i], this.rand));
    }
  }
  update(arm, reward) { this.t++; this.pulls[arm]++; this.wins[arm] += reward; }
}

// Run one strategy for `steps` pulls; returns cumulative regret history (wins missed vs always pulling the best arm)
function simulate(kind, probs, steps, rand) {
  const agent = new Agent(kind, probs.length, rand), best = Math.max(...probs), regret = [];
  let r = 0;
  for (let s = 0; s < steps; s++) {
    const arm = agent.choose(), reward = rand() < probs[arm] ? 1 : 0;
    agent.update(arm, reward); r += best - probs[arm]; regret.push(r);
  }
  return { agent, regret };
}

if (typeof module !== "undefined") module.exports = { Agent, simulate, mulberry32, beta };
