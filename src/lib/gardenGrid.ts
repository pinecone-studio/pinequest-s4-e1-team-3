// ============================================
//  gardenGrid.ts  —  25 cols × 10 rows
//
//  Image: garden-bg.png  1520 × 656 px
//  Rendered at: 2250 × 971 px (scale 1.48× to cover world div)
//  Viewport clip: ~35 px top + bottom → 900 px visible height
//
//  World % = image_x / 1520 × 100   (col center = (col+0.5) × 4)
//  Scene % = (image_y × 1.48 − 35) / 900 × 100   (row center = (row+0.5) × 10)
//
//  Tile types:
//    S = sky     bird flight zone, no flowers
//    G = grass   valid flower placement
//    P = path    stone walkway / steps, no flowers
//    T = tree    trunk + canopy, no flowers
//    W = water   pond, no flowers
//
//  Key landmarks (image px → col / row):
//    Stone path center  ≈ x 640  → col 10   y 380 → row 5-6
//    Path radius        ≈ 180 px → ±3 cols (cols 7-13)
//    Pond               ≈ x 870-1100 → cols 14-17
//    Left grass         x 0-380  → cols 0-5   rows 6-9
//    Right grass        x 1100+  → cols 18-24 rows 5-9
// ============================================

export type TileType = "S" | "G" | "P" | "T" | "W";

// prettier-ignore
export const GRID: TileType[][] = [
  //       0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22   23   24
  /* r0 */["S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S"],
  /* r1 */["S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S"],
  /* r2 */["S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S","S"],
  /* r3 */["S","S","S","S","S","S","S","S","S","T","T","T","S","S","S","S","S","S","S","S","S","S","S","S","S"],
  /* r4 */["S","S","S","S","S","S","S","S","T","T","T","T","T","S","S","S","S","S","S","S","S","S","S","S","S"],
  /* r5 */["G","G","G","G","G","P","P","P","T","T","T","T","P","P","P","P","P","P","G","G","G","G","G","G","G"],
  /* r6 */["G","G","G","G","G","P","P","P","P","P","P","P","P","P","W","W","W","W","G","G","G","G","G","G","G"],
  /* r7 */["G","G","G","G","G","P","P","P","P","P","P","P","P","W","W","W","W","G","G","G","G","G","G","G","G"],
  /* r8 */["G","G","G","G","G","G","P","P","P","P","P","P","W","W","W","W","G","G","G","G","G","G","G","G","G"],
  /* r9 */["G","G","G","G","G","G","G","P","P","P","P","W","W","W","W","G","G","G","G","G","G","G","G","G","G"],
];

export const COLS = GRID[0].length; // 25
export const ROWS = GRID.length;    // 10

// Center of tile (col, row) as [posX%, posY%]
export function tileCenter(col: number, row: number): [number, number] {
  const posX = Math.round((col + 0.5) * (100 / COLS));
  const posY = Math.round((row + 0.5) * (100 / ROWS));
  return [posX, posY];
}

// Safe grass zones — all G tiles reachable without crossing path/water/tree.
// Left bank: cols 0-4, rows 5-9.  Right meadow: cols 18-24, rows 5-9.
export const GRASS_TILES: [number, number][] = [
  ...[0, 1, 2, 3, 4].flatMap((c) =>
    [5, 6, 7, 8, 9].map((r) => [c, r] as [number, number])
  ),
  ...[18, 19, 20, 21, 22, 23, 24].flatMap((c) =>
    [5, 6, 7, 8, 9].map((r) => [c, r] as [number, number])
  ),
];

export const SKY_TILES: [number, number][] = GRID.flatMap((row, r) =>
  row.flatMap((type, c) => (type === "S" ? [[c, r] as [number, number]] : []))
);

// Pick a random grass tile, avoiding spots within 2 tiles of occupied flowers
export function getRandomGrassPosition(
  occupied: { posX: number; posY: number }[] = []
): { posX: number; posY: number } {
  const tileW = 100 / COLS; // 4%
  const tileH = 100 / ROWS; // 10%

  const available = GRASS_TILES.filter(([c, r]) => {
    const [px, py] = tileCenter(c, r);
    return !occupied.some(
      (o) => Math.abs(o.posX - px) < tileW * 2 && Math.abs(o.posY - py) < tileH * 2
    );
  });

  const pool = available.length > 0 ? available : GRASS_TILES;
  const [col, row] = pool[Math.floor(Math.random() * pool.length)];
  const [posX, posY] = tileCenter(col, row);
  return { posX, posY };
}
