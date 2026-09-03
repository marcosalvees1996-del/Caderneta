const APP = require("path").join(__dirname, "..", "index.html");
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(){
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/c.html",
    runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      w.alert=()=>{}; w.confirm=()=>true; w.scrollTo=()=>{}; w.print=()=>{};
    }});
  const w=dom.window,d=w.document;
  try{ w.eval("window.avisar=function(t,dp){if(dp)dp();};window.perguntar=function(t,s){if(s)s();};"); }catch(e){}
  return {w,d,q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){const el=d.querySelector(s); if(el) el.click();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}};
}
// exatamente o que sai do botao Copiar lista da versao antiga
const colado = `6 Ano A · Educação Física · 3º bimestre
ALEXIA THAYNARA PEREIRA SANTANA: 0,0
DARCY MANUELLA MENDES DE CARVALHO: 0,0
DAVI LUIZ FERREIRA DA SILVA: 0,0
EMANUELLY VITORIA RODRIGUES DO NASCIMENTO: 0,0
HEITOR JOSÉ VIEIRA LIMA: 7,5`;

let a=app(); a.aba("dados");
a.clique("#btNovaEscola"); a.escreve("#eNome","Maria Barreto"); a.clique("#eOk");
a.clique("#btNovaTurma"); a.escreve("#tNome","6 Ano A"); a.escreve("#tDisc","Educação Física");
a.escreve("#tAlunos", colado); a.clique("#tOk");
const al = a.db().turmas[0].alunos.map(x=>x.nome);
ok("P.1 cabecalho da lista descartado", !al.some(n=>/bimestre/i.test(n)), al[0]);
ok("P.2 cinco alunos lidos", al.length===5, al.length+": "+al.join(" | "));
ok("P.3 nota removida do nome", al.every(n=>!/\d,\d/.test(n)), al.join(" | "));
ok("P.4 acentos preservados", al.includes("HEITOR JOSÉ VIEIRA LIMA"));
ok("P.5 nome completo intacto", al.includes("EMANUELLY VITORIA RODRIGUES DO NASCIMENTO"));

// formato com numeracao, como aparece na tela do conselho
let b=app(); b.aba("dados");
b.clique("#btNovaEscola"); b.escreve("#eNome","E"); b.clique("#eOk");
b.clique("#btNovaTurma"); b.escreve("#tNome","T"); b.escreve("#tDisc","Arte");
b.escreve("#tAlunos","1. ALEXIA THAYNARA PEREIRA SANTANA 0,0\n2. DARCY MANUELLA MENDES 0,0\n12) LIVIA SOUZA LIMA 0,0");
b.clique("#tOk");
const al2 = b.db().turmas[0].alunos.map(x=>x.nome);
ok("P.6 numeracao removida", al2.every(n=>!/^\d/.test(n)), al2.join(" | "));
ok("P.7 tres alunos", al2.length===3, al2.join(" | "));
ok("P.8 nomes limpos", al2[0]==="ALEXIA THAYNARA PEREIRA SANTANA", al2[0]);

// lista normal continua funcionando
let c=app(); c.aba("dados");
c.clique("#btNovaEscola"); c.escreve("#eNome","E"); c.clique("#eOk");
c.clique("#btNovaTurma"); c.escreve("#tNome","T"); c.escreve("#tDisc","Arte");
c.escreve("#tAlunos","Ana Silva\nBruno Costa\nJoão Vitor 2 de Souza");
c.clique("#tOk");
const al3 = c.db().turmas[0].alunos.map(x=>x.nome);
ok("P.9 lista limpa nao e alterada", al3.join("|")==="Ana Silva|Bruno Costa|João Vitor 2 de Souza", al3.join("|"));

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
