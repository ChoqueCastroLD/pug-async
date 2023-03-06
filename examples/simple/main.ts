import { compile, Options, render, renderFile, renderFileAsync } from "../../mod.ts";

const __dirname = new URL(".", import.meta.url).pathname;

const locals = {
  state: "amazing",
  youAreUsingPug: true,
};

const options: Options = {
  filename: "template.pug",
  pretty: true,
};

// renderFile
let html = await renderFileAsync('C:/Users/ShokoCC/Desktop/pug-async/examples/simple/template.pug', {
  ...options,
  ...locals,
}) as string;
console.log("\nrenderFile result:\n", html);
