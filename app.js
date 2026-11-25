const $ = id => document.getElementById(id);
const N = 5, STEPS = 1000, YOU_PULLS = 50;
const STRATS = [
  { kind: "random", name: "Random", color: "#ef4444", note: "never learns" },
  { kind: "greedy", name: "ε-greedy (10%)", color: "#f59e0b", note: "best so far, explores 10%" },
  { kind: "ucb", name: "UCB1", color: "#3b82f6", note: "optimism for untried machines" },
  { kind: "thompson", name: "Thompson sampling", color: "#22c55e", note: "samples from its beliefs" },
];
let probs, you, revealed = false, results = null, anim = null;

function newGame() {
  cancelAnimationFrame(anim);
  probs = Array.from({ length: N }, () => +(Math.random() * 0.8 + 0.05).toFixed(2));
  you = { left: YOU_PULLS, wins: 0, pulls: new Array(N).fill(0), won: new Array(N).fill(0) };
  revealed = false; results = null;
  renderMachines(); drawChart(0); $("table").innerHTML = "";
}

function renderMachines() {
  const best = probs.indexOf(Math.max(...probs));
  $("machines").innerHTML = probs.map((p, i) => `
    <button class="machine ${revealed && i === best ? "best" : ""}" data-i="${i}" ${you.left ? "" : "disabled"}>
      <span class="emoji">🎰</span><b>Machine ${i + 1}</b>
      <span>${you.pulls[i] ? `${you.won[i]}/${you.pulls[i]} wins` : "not tried"}</span>
      <span class="true">${revealed ? `true rate ${Math.round(p * 100)}%` : "rate: ?"}</span>
    </button>`).join("");
  $("youLeft").textContent = you.left;
  const youRegret = you.pulls.reduce((s, n, i) => s + n * (Math.max(...probs) - probs[i]), 0);
  $("youScore").innerHTML = `Wins: <b>${you.wins}</b>` + (YOU_PULLS - you.left ? ` · your regret so far: <b>${youRegret.toFixed(1)}</b>` : "") +
    (!you.left ? " · out of pulls! Reveal the win rates to see how you did." : "");
}

$("machines").addEventListener("click", e => {
  const b = e.target.closest(".machine"); if (!b || !you.left) return;
  const i = +b.dataset.i, w = Math.random() < probs[i] ? 1 : 0;
  you.left--; you.pulls[i]++; you.won[i] += w; you.wins += w;
  renderMachines();
  const el = document.querySelector(`.machine[data-i="${i}"]`); el.classList.add(w ? "win" : "lose");
  setTimeout(() => el.classList.remove("win", "lose"), 300);
});

function race() {
  cancelAnimationFrame(anim);
  const seed = Math.floor(Math.random() * 1e9);
  results = STRATS.map((s, k) => ({ ...s, ...simulate(s.kind, probs, STEPS, mulberry32(seed + k)) }));
  let t = 0;
  (function frame() {
    t = Math.min(STEPS, t + 12); drawChart(t); drawTable(t);
    if (t < STEPS) anim = requestAnimationFrame(frame);
  })();
}

function drawChart(t) {
  const c = $("chart"), g = c.getContext("2d"), W = c.width, H = c.height, P = 40;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = "#334155"; g.beginPath(); g.moveTo(P, 10); g.lineTo(P, H - 26); g.lineTo(W - 8, H - 26); g.stroke();
  g.fillStyle = "#94a3b8"; g.font = "11px system-ui";
  g.fillText("regret", 2, 14); g.fillText("pulls →", (W + P) / 2 - 20, H - 8); g.fillText("0", P - 10, H - 12); g.fillText(STEPS, W - 34, H - 12);
  if (!results) return;
  const max = Math.max(...results.map(r => r.regret[STEPS - 1]), 1);
  for (let y = 0; y <= max; y += Math.ceil(max / 4 / 10) * 10) { g.fillText(y, 4, H - 26 - y / max * (H - 40) + 4); }
  for (const r of results) {
    g.strokeStyle = r.color; g.lineWidth = 2.2; g.beginPath();
    for (let s = 0; s < t; s += 4) { const x = P + s / STEPS * (W - P - 10), y = H - 26 - r.regret[s] / max * (H - 40); s ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.lineWidth = 1;
}

function drawTable(t) {
  const best = probs.indexOf(Math.max(...probs));
  $("table").innerHTML = `<tr><th>Strategy</th><th>Regret</th><th>Pulls on best machine</th></tr>` + results.map(r => {
    const bestPulls = r.agent.pulls[best];
    return `<tr><td><i style="background:${r.color}"></i>${r.name}<small>${r.note}</small></td><td>${r.regret[t - 1].toFixed(1)}</td>
      <td>${t === STEPS ? `${Math.round(bestPulls / STEPS * 100)}%` : "…"}</td></tr>`;
  }).join("");
}

$("race").addEventListener("click", race);
$("newGame").addEventListener("click", newGame);
$("reveal").addEventListener("click", () => { revealed = true; renderMachines(); });
newGame();
