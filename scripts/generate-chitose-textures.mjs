// Manual trial-only copy of the BA pipeline's Real-CUGAN texture materializer.
// This script is intentionally not wired into npm, Vite, Registry, Portfolio,
// or any automated run. Use it only when manually refreshing the Chitose
// Live2D 4K/8K texture tiers.
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const baRoot = path.resolve(projectRoot, "..", "blue-archive");
const toolRoot = path.join(
  baRoot,
  "wallpaper-hare-camping",
  ".cache",
  "realcugan",
  "tool",
  "realcugan-ncnn-vulkan-20220728-windows",
);
const executable = process.env.REALCUGAN_PATH ?? path.join(toolRoot, "realcugan-ncnn-vulkan.exe");
const modelPath = process.env.REALCUGAN_MODEL_PATH ?? path.join(toolRoot, "models-se");
const sourceRoot = path.join(projectRoot, "public", "assets", "chitose-live2d", "full");
const textures = ["textures/texture_00.png", "textures/texture_01.png"];
const tiers = [
  ["4k", 2],
  ["8k", 4],
];

function pngDimensions(bytes, source) {
  if (bytes.subarray(1, 4).toString("ascii") !== "PNG") throw new Error(`Invalid PNG: ${source}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Real-CUGAN exited with code ${code}`)));
  });
}

for (const [tier, scale] of tiers) {
  for (const texture of textures) {
    const source = path.join(sourceRoot, texture);
    const output = path.join(sourceRoot, "..", `full-${tier}`, texture);
    await mkdir(path.dirname(output), { recursive: true });
    await run(["-i", source, "-o", output, "-s", String(scale), "-n", "-1", "-m", modelPath]);
    const [upscaled, original] = await Promise.all([readFile(output), readFile(source)]);
    const dimensions = pngDimensions(upscaled, output);
    const originalDimensions = pngDimensions(original, source);
    if (
      dimensions.width !== originalDimensions.width * scale
      || dimensions.height !== originalDimensions.height * scale
      || dimensions.colorType !== 6
    ) {
      throw new Error(`${output} is not a ${scale}x RGBA upscale of ${source}`);
    }
    console.log(`${tier}: ${texture} ${dimensions.width}x${dimensions.height}`);
  }
}
