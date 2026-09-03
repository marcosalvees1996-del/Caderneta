const APP = require("path").join(__dirname, "..", "index.html");

function respondeDialogo(w,d,sim){
  const dlg=d.querySelector("#dialogo"); if(!dlg) return false;
  const bts=[...dlg.querySelectorAll("button")];
  const alvo = sim ? bts[bts.length-1] : bts[0];
  if(alvo) alvo.click();
  return true;
}
const fs=require("fs"), {JSDOM}=require("jsdom");
const {createCanvas}=require("canvas");
let falhas=[],passes=0;
function ok(n,c,e){ if(c)passes++; else falhas.push(n+(e?" -> "+e:"")); }

// gera um JPEG real de 1200x800 para servir de foto
const c=createCanvas(1200,800), ctx=c.getContext("2d");
ctx.fillStyle="#3366aa"; ctx.fillRect(0,0,1200,800);
ctx.fillStyle="#ffcc00"; ctx.fillRect(400,200,400,400);
const jpeg = c.toBuffer("image/jpeg");
console.log("foto de origem:", (jpeg.length/1024).toFixed(0)+" KB, 1200x800");

const loja={};
const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
 resources:"usable",
 beforeParse(w){
  Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
    setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{delete loja[k]}}});
  w.alert=m=>{w.__a=(w.__a||[]).concat(m)}; w.confirm=()=>true; w.scrollTo=()=>{};
  w.print=()=>{}; w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
  // canvas real
  w.HTMLCanvasElement.prototype.getContext=function(t){
    if(!this.__c) this.__c=createCanvas(this.width||300,this.height||150);
    this.__c.width=this.width; this.__c.height=this.height;
    return this.__c.getContext(t);
  };
  w.HTMLCanvasElement.prototype.toDataURL=function(tipo,q){
    return this.__c ? this.__c.toDataURL(tipo||"image/jpeg", q) : "data:,";
  };
  // Image que decodifica de verdade
  const {Image}=require("canvas");
  w.Image=class extends Image{
    set src(v){
      const fn=this.onload; this.onload=null;
      super.src = v.startsWith("data:")?Buffer.from(v.split(",")[1],"base64"):v;
      if(fn) fn.call(this);
    }
    get src(){ return super.src }
  };
 }});
const w=dom.window,d=w.document;
const q=s=>d.querySelector(s), todos=s=>Array.from(d.querySelectorAll(s));
const escreve=(s,v)=>{const el=q(s); el.value=v;
  el.dispatchEvent(new w.Event("input",{bubbles:true})); el.dispatchEvent(new w.Event("change",{bubbles:true}))};
const aba=n=>d.querySelector('nav button[data-ab="'+n+'"]').click();
function responde(sim=true){
  const dlg=d.querySelector("#dialogo"); if(!dlg) return false;
  const bts=[...dlg.querySelectorAll("button")];
  (bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]).click();
  return true;
}

aba("dados");
q("#btNovaEscola").click(); escreve("#eNome","Maria Barreto"); q("#eOk").click();
q("#btNovaTurma").click(); escreve("#tNome","7A"); escreve("#tDisc","Arte");
escreve("#tAlunos","Ana Silva\nBruno Costa"); q("#tOk").click();

const db=()=>w.eval("db");
const aid=db().turmas[0].alunos[0].id;

function arquivo(){ return new w.File([jpeg],"f.jpg",{type:"image/jpeg"}); }
function solta(sel){
  const inp=q(sel);
  Object.defineProperty(inp,"files",{value:[arquivo()],configurable:true});
  inp.dispatchEvent(new w.Event("change",{bubbles:true}));
}
const espera=ms=>new Promise(r=>setTimeout(r,ms));

(async function(){
  /* foto de perfil */
  aba("alunos");
  q('#listaAlunos button[data-pasta="'+aid+'"]').click();
  ok("P.1 pasta abre com circulo de foto", !!q("#pAv"));
  solta("#pArq");
  await espera(300);
  const foto=db().turmas[0].alunos[0].foto;
  ok("P.2 foto de perfil salva", !!foto && foto.startsWith("data:image/jpeg"));
  if(foto){
    const kb=Buffer.from(foto.split(",")[1],"base64").length/1024;
    ok("P.3 foto comprimida abaixo de 20 KB", kb<20, kb.toFixed(1)+" KB");
    console.log("  perfil comprimido para", kb.toFixed(1)+" KB (origem "+(jpeg.length/1024).toFixed(0)+" KB)");
  }
  aba("aula");
  ok("P.4 avatar aparece na grade", todos("#grade .av img").length===1);
  aba("alunos");
  ok("P.5 avatar aparece na lista", todos("#listaAlunos .av img").length===1);

  /* remover foto */
  q('#listaAlunos button[data-pasta="'+aid+'"]').click();
  ok("P.6 botao de remover foto existe", !!q("#pSemFoto"));
  q("#pSemFoto").click(); responde(true);
  ok("P.7 foto removida", !db().turmas[0].alunos[0].foto);
  ok("P.8 volta para as iniciais", /AS/.test(q("#pAv").textContent));
  q("#pFechar").click();

  /* fotos de atividade */
  aba("aula");
  q('#grade button[data-det="'+aid+'"]').click();
  solta("#dFoto");
  await espera(300);
  ok("P.9 previa da foto aparece", todos("#dPrev img").length===1);
  q('#dEtiq button[data-et="0"]').click();
  q("#dOk").click();
  const reg=db().registros.find(r=>r.fotos&&r.fotos.length);
  ok("P.10 registro salvo com foto", !!reg);
  if(reg){
    const kb=Buffer.from(reg.fotos[0].split(",")[1],"base64").length/1024;
    ok("P.11 foto de atividade comprimida", kb<200, kb.toFixed(1)+" KB");
    console.log("  atividade comprimida para", kb.toFixed(1)+" KB");
  }

  /* remover foto da previa antes de salvar */
  q('#grade button[data-det="'+aid+'"]').click();
  solta("#dFoto"); await espera(200);
  solta("#dFoto"); await espera(200);
  ok("P.12 duas previas", todos("#dPrev img").length===2);
  q("#dPrev button[data-rm]").click();
  ok("P.13 remover previa funciona", todos("#dPrev img").length===1);
  q("#dNao").click();

  /* foto no anexo da ocorrencia */
  aba("oco"); q("#btNovaOco").click();
  escreve("#oFato","Danificou o material coletivo durante a atividade em grupo.");
  escreve("#oProv","Conversa reservada e reposicionamento no grupo.");
  solta("#oFoto"); await espera(300);
  ok("P.14 anexo da ocorrencia carregado", todos("#oPrev img").length===1);
  q("#oOk").click();
  const oco=db().registros.find(r=>r.tipo==="ocorrencia");
  ok("P.15 ocorrencia com anexo salva", oco&&oco.fotos.length===1);
  q("#oImp").click();
  ok("P.16 anexo entra no documento", /<img/.test(q("#doc").innerHTML));
  q("#oFech").click();

  /* foto de perfil nunca vai para o impresso */
  aba("alunos");
  q('#listaAlunos button[data-pasta="'+aid+'"]').click();
  solta("#pArq"); await espera(300);
  q("#pImp").click();
  const imgs=(q("#doc").innerHTML.match(/<img/g)||[]).length;
  const temPerfil=q("#doc").innerHTML.includes(db().turmas[0].alunos[0].foto);
  ok("P.17 pasta impressa nao traz a foto de perfil", !temPerfil, imgs+" imagens no doc");

  /* medidor de espaco */
  aba("dados");
  ok("P.18 medidor de espaco calcula", /MB de aproximadamente/.test(q("#txtEspaco").textContent));
  console.log("  " + q("#txtEspaco").textContent);

  console.log("Passaram: "+passes);
  console.log("Falharam: "+falhas.length);
  falhas.forEach(f=>console.log("  FALHA "+f));
})();
