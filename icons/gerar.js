// Script auxiliar de uma vez: converte icon.svg em todos os PNGs do manifesto.
// Uso: node icons/gerar.js
const fs = require("fs");
const path = require("path");
const { createCanvas, Image } = require("canvas");

const pasta = __dirname;
const svg = fs.readFileSync(path.join(pasta, "icon.svg"), "utf8");
const dataUri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");

const tamanhos = [48, 72, 96, 144, 192, 384, 512];
const maskaveis = [192, 512];

function gerar(tamanho, nomeArquivo){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = createCanvas(tamanho, tamanho);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, tamanho, tamanho);
      const destino = path.join(pasta, nomeArquivo);
      fs.writeFileSync(destino, c.toBuffer("image/png"));
      console.log("gerado", nomeArquivo, tamanho+"x"+tamanho);
      resolve();
    };
    img.onerror = reject;
    img.src = dataUri;
  });
}

(async () => {
  for(const t of tamanhos) await gerar(t, "icon-"+t+".png");
  for(const t of maskaveis) await gerar(t, "icon-maskable-"+t+".png");
  console.log("pronto");
})();
