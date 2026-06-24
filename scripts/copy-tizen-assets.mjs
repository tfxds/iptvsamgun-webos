// Copia os assets do build Tizen (dist-tizen/assets) para a pasta do projeto Tizen
// (tizen/assets). Multiplataforma — substitui o xcopy (que so roda no Windows).
import { mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'dist-tizen/assets';
const DEST = 'tizen/assets';

mkdirSync(DEST, { recursive: true });
let n = 0;
for (const file of readdirSync(SRC)) {
    copyFileSync(join(SRC, file), join(DEST, file));
    n++;
}
console.log(`[tizen] ${n} assets copiados de ${SRC} -> ${DEST}`);
