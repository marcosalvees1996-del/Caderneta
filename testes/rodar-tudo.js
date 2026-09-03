// Roda todas as baterias e devolve código de saída 1 se algo falhar.
// Uso: node testes/rodar-tudo.js
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pasta = __dirname;
const arquivos = fs.readdirSync(pasta)
  .filter(f => f.endsWith(".js") && f !== "rodar-tudo.js")
  .sort();

let totalOk = 0, totalFalhas = 0;
const quebrados = [];

for (const f of arquivos) {
  let saida = "";
  try {
    saida = execFileSync("node", [path.join(pasta, f)], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    console.log(`\n${f}: NÃO EXECUTOU`);
    console.log((err.stdout || "") + (err.stderr || "").split("\n").slice(0, 4).join("\n"));
    quebrados.push(f);
    continue;
  }
  const limpa = saida.split("\n").filter(l => !/Not implemented/.test(l));
  const ok = (limpa.find(l => /^Passaram:/.test(l)) || "").replace(/\D/g, "");
  const falhou = (limpa.find(l => /^Falharam:/.test(l)) || "").replace(/\D/g, "");
  const detalhes = limpa.filter(l => /FALHA/.test(l));

  totalOk += Number(ok || 0);
  totalFalhas += Number(falhou || 0);

  console.log(`${f.padEnd(16)} ${String(ok || 0).padStart(4)} ok   ${falhou || 0} falhas`);
  detalhes.forEach(d => console.log("   " + d.trim()));
}

console.log("\n" + "-".repeat(46));
console.log(`Total: ${totalOk} verificações, ${totalFalhas} falhas`);
if (quebrados.length) console.log("Baterias que não rodaram: " + quebrados.join(", "));

process.exit(totalFalhas || quebrados.length ? 1 : 0);
