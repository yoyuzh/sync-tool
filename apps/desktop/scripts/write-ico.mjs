import fs from "node:fs/promises";
import pngToIco from "png-to-ico";

const args = process.argv.slice(2);
if (args.length < 2) {
  throw new Error("usage: write-ico.mjs <png...> <out.ico>");
}

const outputPath = args.at(-1);
const inputPaths = args.slice(0, -1);

const buffer = await pngToIco(inputPaths);
await fs.writeFile(outputPath, buffer);
