import * as esbuild from "esbuild";
import * as fs from "node:fs";

const mainCode = fs.readFileSync("src/main.ts", "utf8");
const bannerMatch = mainCode.match(/\/\*![\s\S]*?\*\//);
const bannerText = bannerMatch ? bannerMatch[0] : "";

const commonOptions = {
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "neutral",
    format: "iife",
    // 目标 ES2017：兼容 Clash Verge 的 boa_engine（精简 JS 引擎，对 ES2020+
    // 特性支持不稳定）。Substore 走 V8/Node，同样支持 ES2017，无副作用。
    target: "ES2017",
    legalComments: "none",
    charset: "utf8",
    banner: { js: bannerText },
};

Promise.all([
    esbuild.build({ ...commonOptions, outfile: "convert.js" }),
    esbuild.build({
        ...commonOptions,
        minify: true,
        outfile: "convert.min.js",
        drop: ["debugger"],
    }),
]).catch((err) => {
    console.error(err);
    process.exit(1);
});
