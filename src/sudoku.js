// Générateur et solveur de Sudoku.
// Une grille est un tableau de 81 entiers (0 = case vide), lu ligne par ligne.

export const LEVELS = {
  pour_mauro: { label: 'Niveau Mauro', clues: 80 },
  tres_facile: { label: 'Très facile', clues: 50 },
  facile: { label: 'Facile', clues: 40 },
  moyen: { label: 'Moyen', clues: 32 },
  difficile: { label: 'Difficile', clues: 27 },
  extreme: { label: 'Extrême', clues: 23 },
};

const ALL = 0x3fe; // bits 1..9

const ROW = [];
const COL = [];
const BOX = [];
for (let i = 0; i < 81; i++) {
  ROW[i] = Math.floor(i / 9);
  COL[i] = i % 9;
  BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
}

// Pour chaque case, la liste des 20 cases « voisines » (même ligne, colonne ou bloc).
const PEERS = [];
for (let i = 0; i < 81; i++) {
  const set = new Set();
  for (let j = 0; j < 81; j++) {
    if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) set.add(j);
  }
  PEERS[i] = [...set];
}

// Les 27 unités (9 lignes, 9 colonnes, 9 blocs).
const UNITS = [];
for (let u = 0; u < 9; u++) {
  UNITS.push([...Array(81).keys()].filter((i) => ROW[i] === u));
  UNITS.push([...Array(81).keys()].filter((i) => COL[i] === u));
  UNITS.push([...Array(81).keys()].filter((i) => BOX[i] === u));
}

function popcount(n) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function shuffle(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compte les solutions d'une grille (s'arrête à `limit`).
 * Si `out` est fourni, la première solution trouvée y est copiée.
 */
export function countSolutions(grid, limit = 2, out = null, rand = null) {
  const g = grid.slice();
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (v) {
      const bit = 1 << v;
      if (rows[ROW[i]] & bit || cols[COL[i]] & bit || boxes[BOX[i]] & bit) return 0;
      rows[ROW[i]] |= bit;
      cols[COL[i]] |= bit;
      boxes[BOX[i]] |= bit;
    }
  }
  let count = 0;

  function search() {
    // Choisit la case vide avec le moins de candidats (MRV).
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const c = popcount(mask);
      if (c < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = c;
        if (c <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i];
      return count >= limit;
    }
    if (bestCount === 0) return false;
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rand) shuffle(digits, rand);
    const r = ROW[best];
    const c = COL[best];
    const b = BOX[best];
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (search()) return true;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }
    g[best] = 0;
    return false;
  }

  search();
  return count;
}

export function solve(grid) {
  const out = new Array(81).fill(0);
  return countSolutions(grid, 1, out) === 1 ? out : null;
}

function randomSolution(rand = Math.random) {
  const out = new Array(81).fill(0);
  countSolutions(new Array(81).fill(0), 1, out, rand);
  return out;
}

/**
 * Essaie de résoudre uniquement avec des techniques simples
 * (singletons nus et cachés). Renvoie true si la grille est entièrement résolue.
 */
export function solvableBySingles(grid) {
  const g = grid.slice();
  const cand = new Array(81).fill(0);
  const recompute = () => {
    for (let i = 0; i < 81; i++) {
      if (g[i]) {
        cand[i] = 0;
        continue;
      }
      let used = 0;
      for (const p of PEERS[i]) if (g[p]) used |= 1 << g[p];
      cand[i] = ALL & ~used;
    }
  };
  for (;;) {
    recompute();
    let progress = false;
    for (let i = 0; i < 81; i++) {
      if (!g[i] && popcount(cand[i]) === 1) {
        g[i] = Math.log2(cand[i]);
        progress = true;
      }
    }
    if (!progress) {
      for (const unit of UNITS) {
        for (let d = 1; d <= 9; d++) {
          const bit = 1 << d;
          let spot = -1;
          let n = 0;
          for (const i of unit) {
            if (g[i] === d) {
              n = -1;
              break;
            }
            if (!g[i] && cand[i] & bit) {
              n++;
              spot = i;
            }
          }
          if (n === 1) {
            g[spot] = d;
            progress = true;
          }
        }
        if (progress) break;
      }
    }
    if (!progress) break;
  }
  return g.every((v) => v !== 0);
}

/**
 * Génère une grille pour le niveau demandé.
 * Renvoie { puzzle, solution } (tableaux de 81 entiers).
 */
export function generate(level = 'moyen', { timeBudgetMs = 2500, rand = Math.random } = {}) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`Niveau inconnu : ${level}`);
  // « Niveau Mauro » : grille complète à une case près.
  if (level === 'pour_mauro') {
    const solution = randomSolution(rand);
    const puzzle = solution.slice();
    puzzle[Math.floor(rand() * 81)] = 0;
    return { puzzle, solution };
  }

  const deadline = Date.now() + timeBudgetMs;
  let best = null;

  do {
    const solution = randomSolution(rand);
    const puzzle = solution.slice();
    let clues = 81;

    // Retire les chiffres par paires symétriques tant que la solution reste unique.
    const order = shuffle([...Array(41).keys()], rand);
    for (const i of order) {
      if (clues <= cfg.clues) break;
      const j = 80 - i;
      const a = puzzle[i];
      const b = puzzle[j];
      puzzle[i] = 0;
      puzzle[j] = 0;
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[i] = a;
        puzzle[j] = b;
      } else {
        clues -= i === j ? 1 : 2;
      }
    }

    const singles = solvableBySingles(puzzle);
    // Les niveaux faciles doivent se résoudre par simple logique ;
    // le niveau extrême doit au contraire exiger des techniques avancées.
    const styleOk = ['tres_facile', 'facile', 'moyen'].includes(level)
      ? singles
      : level === 'extreme'
        ? !singles
        : true;
    const candidate = { puzzle, solution, clues, styleOk };

    if (styleOk && clues <= cfg.clues + 1) return { puzzle, solution };
    if (!best || score(candidate) > score(best)) best = candidate;
  } while (Date.now() < deadline);

  return { puzzle: best.puzzle, solution: best.solution };

  function score(c) {
    return (c.styleOk ? 100 : 0) - Math.abs(c.clues - cfg.clues);
  }
}
