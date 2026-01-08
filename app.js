
// Her dannes node-objekter for Huffman-træet
function makeLeaf(char, weight) {
  return { char, weight, left: null, right: null, id: crypto.randomUUID() };
}
function makeParent(left, right) {
  return { char: null, weight: left.weight + right.weight, left, right, id: crypto.randomUUID() };
}

// Forskellige tilstande i algoritmen
const Step = {
  FREQ: "FREQ",
  BUILD_PQ: "BUILD_PQ",
  POP_A: "POP_A",
  POP_B: "POP_B",
  MERGE: "MERGE",
  PUSH: "PUSH",

  INIT_CODES: "INIT_CODES",
  GEN_CODES_STEP: "GEN_CODES_STEP",
  DONE_CODES: "DONE_CODES",

  ENCODE_STEP: "ENCODE_STEP",
  DONE_ENCODE: "DONE_ENCODE",
};

let state;

// ----- Reset / init -----
function reset() {
  const text = document.getElementById("inputText").value ?? "";

  state = {
    text,
    i: 0,                 // frekvens
    freq: new Map(),

    pq: [],               // "priority queue"
    a: null,
    b: null,
    root: null,

    // Kode generering(tegn -> bitstreng)
    codes: new Map(),
    codeStack: [],

    // "encoding"
    encoded: "",
    encodeIndex: 0,

    // Komprimmering 
    originalBits: text.length * 8,
    compressedBits: 0,
    percentSaved: 0,

    // UI 
    step: Step.FREQ,
    highlight: { aId: null, bId: null },
  };

  render();
  setStatus("Klar: bygger frekvenstabel (ét tegn ad gangen).");
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

// State machine → 1 klik = 1 handling
function nextStep() {
  if (!state) return;

  switch (state.step) {
    // 1 char pr. klik
    case Step.FREQ: {
      if (state.text.length === 0) {
        setStatus("Teksten er tom. Skriv noget og tryk Reset.");
        break;
      }

      if (state.i >= state.text.length) {
        state.step = Step.BUILD_PQ;
        setStatus("Frekvenstabel færdig. Næste: bygger priority queue.");
        break;
      }

      const c = state.text[state.i];
      state.freq.set(c, (state.freq.get(c) ?? 0) + 1);
      state.i++;

      setStatus(`Tæller tegn: "${c}"`);
      break;
    }

    // 2) Byg PQ(ikke rigtig heap)
    case Step.BUILD_PQ: {
      state.pq = [...state.freq.entries()].map(([ch, count]) => makeLeaf(ch, count));
      sortPQ();
      state.highlight = { aId: null, bId: null };

      if (state.pq.length <= 1) {
        state.root = state.pq[0] ?? null;
        state.step = Step.INIT_CODES;
        setStatus("Kun ét unikt tegn. Næste: genererer koder.");
      } else {
        state.step = Step.POP_A;
        setStatus("Priority queue klar. Næste: ExtractMin A.");
      }
      break;
    }

    // Tag mindste node 
    case Step.POP_A: {
      state.a = state.pq.shift();
      state.highlight.aId = state.a?.id ?? null;
      state.highlight.bId = null;

      state.step = Step.POP_B;
      setStatus(`ExtractMin A: ${labelNode(state.a)}`);
      break;
    }

    // Tag næstmindst node 
    case Step.POP_B: {
      state.b = state.pq.shift();
      state.highlight.bId = state.b?.id ?? null;

      state.step = Step.MERGE;
      setStatus(`ExtractMin B: ${labelNode(state.b)}`);
      break;
    }

    // Merge
    case Step.MERGE: {
      state.root = makeParent(state.a, state.b);
      state.step = Step.PUSH;
      setStatus(`Merge: ${labelNode(state.a)} + ${labelNode(state.b)} → •(${state.root.weight})`);
      break;
    }

    // Læg parent tilbage(check for færdig)
    case Step.PUSH: {
      state.pq.push(state.root);
      state.a = null;
      state.b = null;
      state.highlight = { aId: null, bId: null };
      sortPQ();

      if (state.pq.length === 1) {
        state.root = state.pq[0];
        state.step = Step.INIT_CODES;
        setStatus("Træ færdigt! Næste: initialiserer generering af koder.");
      } else {
        state.step = Step.POP_A;
        setStatus("Næste merge-runde: ExtractMin A.");
      }
      break;
    }

    // Færdig med træet, init koder
    case Step.INIT_CODES: {
      state.codes = new Map();
      state.codeStack = [];
      state.encoded = "";
      state.encodeIndex = 0;
      state.compressedBits = 0;
      state.percentSaved = 0;

      if (!state.root) {
        state.step = Step.DONE_CODES;
        setStatus("Ingen root. Kan ikke generere koder.");
        break;
      }

      // Edge case: kun ét tegn
      if (state.root.char) {
        state.codes.set(state.root.char, "0");
        state.step = Step.DONE_CODES;
        setStatus(`Kun ét unikt tegn. Kode: ${state.root.char} → 0. Næste: encode.`);
        break;
      }

      // starter DFS(Depth-first search)
      state.codeStack.push({ node: state.root, prefix: "" });
      state.step = Step.GEN_CODES_STEP;
      setStatus("Koder: starter traversal (DFS) step-by-step.");
      break;
    }

    // 8) Et skridt af gangen
    case Step.GEN_CODES_STEP: {
      if (state.codeStack.length === 0) {
        state.step = Step.DONE_CODES;
        setStatus("Koder færdige. Næste: encode teksten.");
        break;
      }

      const { node, prefix } = state.codeStack.pop();

      // char -> bits
      if (node.char) {
        state.codes.set(node.char, prefix);
        setStatus(`Gem kode: ${node.char} → ${prefix}`);
        break;
      }

      // Højre skubbes først, så vi behandler venstre først(LIFO)
      if (node.right) state.codeStack.push({ node: node.right, prefix: prefix + "1" });
      if (node.left) state.codeStack.push({ node: node.left, prefix: prefix + "0" });

      setStatus(`Traversér intern node •(${node.weight}). Prefix lige nu: "${prefix}"`);
      break;
    }

    // Klar til encoding 
    case Step.DONE_CODES: {
      state.step = Step.ENCODE_STEP;
      setStatus("Starter encoding (ét tegn ad gangen).");
      break;
    }

    // 10) Encode ét tegn pr. klik
    case Step.ENCODE_STEP: {
      if (state.encodeIndex >= state.text.length) {
        state.step = Step.DONE_ENCODE;
        setStatus(`Encoding færdig! Sparet: ${state.percentSaved.toFixed(2)}% (uden overhead).`);
        break;
      }
      

      const c = state.text[state.encodeIndex];
      const code = state.codes.get(c);

      if (!code) {
        setStatus(`Mangler kode for "${c}" (burde ikke ske).`);
        break;
      }

      // Tilføj kode til den encoded streng
      state.encoded += code;
      state.encodeIndex++;

      state.compressedBits += code.length;

      // Udregn besparelse (%)
      const ob = state.originalBits || 1;
      state.percentSaved = (1 - state.compressedBits / ob) * 100;

      setStatus(`Encode "${c}" → ${code}`);
      break;
    }

    // Sidste stadie
    case Step.DONE_ENCODE: {
      setStatus(`Færdig. Sparet: ${state.percentSaved.toFixed(2)}% (uden overhead).`);
      break;
    }

    default:
      break;
  }

  render();
}

function sortPQ() {
  state.pq.sort((x, y) => x.weight - y.weight);
}

function labelNode(n) {
  if (!n) return "";
  return n.char ? `${n.char}(${n.weight})` : `•(${n.weight})`;
}

function render() {
  renderFreq();
  renderPQ();
  renderTree();
  renderCodes();
  renderEncoded();
}

function renderFreq() {
  const el = document.getElementById("freqView");
  const items = [...(state?.freq?.entries() ?? [])].sort((a, b) => a[0].localeCompare(b[0]));
  el.innerHTML = items.map(([ch, count]) => `<div><b>${escapeHtml(ch)}</b>: ${count}</div>`).join("") || "<em>—</em>";
}

function renderPQ() {
  const el = document.getElementById("pqView");
  const items = state?.pq ?? [];

  if (items.length === 0) {
    el.innerHTML = "<em>—</em>";
    return;
  }

  el.innerHTML = items.map(n => {
    const cls = [
      "pq-item",
      n.id === state.highlight.aId ? "highlightA" : "",
      n.id === state.highlight.bId ? "highlightB" : "",
    ].join(" ").trim();

    return `<div class="${cls}">${escapeHtml(labelNode(n))}</div>`;
  }).join("");
}

function renderCodes() {
  const el = document.getElementById("codesView");
  const entries = [...(state?.codes?.entries() ?? [])].sort((a, b) => a[0].localeCompare(b[0]));
  el.innerHTML = entries.map(([ch, code]) =>
    `<div><b>${escapeHtml(ch)}</b> → <code>${escapeHtml(code)}</code></div>`
  ).join("") || "<em>—</em>";
}

function renderEncoded() {
  const el = document.getElementById("encodedView");
  const ob = state?.originalBits ?? 0;
  const cb = state?.compressedBits ?? 0;
  const pct = Number.isFinite(state?.percentSaved) ? state.percentSaved : 0;

  el.innerHTML = `
    <div><b>Original størrelse:</b> ${ob} bits (8-bit pr. tegn)</div>
    <div><b>Huffman størrelse:</b> ${cb} bits (uden overhead)</div>
    <div><b>Sparet:</b> ${pct.toFixed(2)}%</div>
    <div class="hr"></div>
    <div><b>Encoded bits:</b></div>
    <div class="mono"><code>${escapeHtml(state?.encoded ?? "")}</code></div>
  `;
}


function renderTree() {
  const svg = document.getElementById("treeSvg");
  svg.innerHTML = "";
  if (!state?.root) return;

  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 380;

  
  const levels = [];
  (function walk(node, depth, x) {
    if (!node) return;
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push({ node, x });
    walk(node.left, depth + 1, x - 1 / (depth + 2));
    walk(node.right, depth + 1, x + 1 / (depth + 2));
  })(state.root, 0, 0);

  
  const positions = new Map();
  levels.forEach((arr, depth) => {
    arr.forEach((item, idx) => {
      const px = (width / 2) + item.x * width * 0.35 + idx * 2; // tiny spread
      const py = 40 + depth * 75;
      positions.set(item.node.id, { x: px, y: py });
    });
  });

  
  function drawEdges(node) {
    if (!node) return;
    const p = positions.get(node.id);
    for (const child of [node.left, node.right]) {
      if (!child) continue;
      const c = positions.get(child.id);
      svg.insertAdjacentHTML("beforeend",
        `<line x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}" stroke="#999" stroke-width="1.5" />`);
      drawEdges(child);
    }
  }
  drawEdges(state.root);

  
  for (const [id, pos] of positions.entries()) {
    const n = findNodeById(state.root, id);
    const text = n.char ? `${n.char}:${n.weight}` : `${n.weight}`;

    svg.insertAdjacentHTML("beforeend",
      `<g>
        <circle cx="${pos.x}" cy="${pos.y}" r="18" fill="#f5f5f5" stroke="#333" stroke-width="1.5"></circle>
        <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" font-size="11">${escapeHtml(text)}</text>
      </g>`);
  }
}

function findNodeById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  return findNodeById(node.left, id) || findNodeById(node.right, id);
}


function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("nextBtn").addEventListener("click", nextStep);


reset();
