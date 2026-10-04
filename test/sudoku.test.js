import test from 'node:test';
import assert from 'node:assert';
import * as sudoku from '../src/sudoku.js';

function isValidSolution(grid) {
  for (let u = 0; u < 9; u++) {
    const row = new Set();
    const col = new Set();
    const box = new Set();
    for (let k = 0; k < 9; k++) {
      row.add(grid[u * 9 + k]);
      col.add(grid[k * 9 + u]);
      box.add(grid[(Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + (k % 3)]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
  }
  return grid.every((v) => v >= 1 && v <= 9);
}

for (const level of Object.keys(sudoku.LEVELS)) {
  test(`génère une grille ${level} valide à solution unique`, () => {
    const { puzzle, solution } = sudoku.generate(level);
    assert.ok(isValidSolution(solution));
    assert.equal(sudoku.countSolutions(puzzle, 2), 1);
    puzzle.forEach((v, i) => v && assert.equal(v, solution[i]));
    const clues = puzzle.filter(Boolean).length;
    assert.ok(Math.abs(clues - sudoku.LEVELS[level].clues) <= 3, `${clues} indices`);
  });
}

test('les niveaux sont de plus en plus difficiles', () => {
  const clues = Object.keys(sudoku.LEVELS).map((l) => sudoku.generate(l).puzzle.filter(Boolean).length);
  for (let i = 1; i < clues.length; i++) assert.ok(clues[i] < clues[i - 1]);
});
