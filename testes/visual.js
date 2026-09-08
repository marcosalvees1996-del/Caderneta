const APP = require("path").join(__dirname, "..", "index.html");
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(){
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      w.alert=()=>{}; w.confirm=()=>true; w.scrollTo=()=>{}; w.print=()=>{};
      w.eval && 0;
    }});
  const w=dom.window,d=w.document;
  try{ w.eval("window.avisar=function(t,dp){window.__a=(window.__a||[]).concat(t);if(dp)dp();};"
    +"window.perguntar=function(t,sim){if(sim)sim();};"); }catch(e){}
  return {w,d,q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){const el=d.querySelector(s); if(el) el.click();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}};
}
let a=app();

/* estado vazio */
ok("V.1 convite no lugar de aviso seco", /Comece pela sua primeira turma/.test(a.q("#grade").textContent));
ok("V.2 convite tem botao que leva a Dados", !!a.q("#convite1"));
a.clique("#convite1");
ok("V.3 botao do convite abre a aba Dados", a.q("#ab-dados").classList.contains("on"));
ok("V.4 cabecalho sem aula selecionada", /Nenhuma aula selecionada/.test(a.q("#ctxTurma").textContent));

/* duas escolas com cores distintas */
a.clique("#btNovaEscola"); a.escreve("#eNome","Maria Barreto");
ok("V.5 seletor de cores com 6 opcoes", a.todos("#eCores .corx").length===6);
const cor1 = a.q("#eCor").value;
a.clique("#eOk");
a.clique("#btNovaEscola"); a.escreve("#eNome","Escola de Iporá");
const cor2 = a.q("#eCor").value;
a.clique("#eOk");
ok("V.6 escolas recebem cores diferentes", cor1!==cor2, cor1+" / "+cor2);
ok("V.7 cor gravada na escola", a.db().escolas.every(e=>/^#[0-9A-F]{6}$/i.test(e.cor)));
ok("V.8 lista de escolas mostra a bolinha", a.todos("#listaEscolas .bolinha").length===2);

/* contexto no cabecalho */
a.clique("#btNovaTurma");
a.escreve("#tEscola", a.db().escolas[0].id);
a.escreve("#tNome","7º ano A"); a.escreve("#tDisc","Arte");
a.escreve("#tAlunos","Ana Silva\nBruno Costa\nCarla Dias\nDiego Alves"); a.clique("#tOk");
ok("V.9 cabecalho mostra turma e disciplina", /7º ano A, Arte/.test(a.q("#ctxTurma").textContent),
   a.q("#ctxTurma").textContent);
ok("V.10 cabecalho mostra a escola", /Maria Barreto/.test(a.q("#ctxEscola").textContent));
ok("V.11 faixa colorida com a cor da escola",
   a.q("#faixaCor").style.background.length>0, a.q("#faixaCor").style.background);

/* troca de escola muda a cor */
a.clique("#btNovaTurma");
a.escreve("#tEscola", a.db().escolas[1].id);
a.escreve("#tNome","6º ano B"); a.escreve("#tDisc","Educação Física");
a.escreve("#tAlunos","Elisa Prado"); a.clique("#tOk");
const d2 = a.db().disciplinas.find(x=>x.nome==="Educação Física").id;
a.escreve("#selCtx", d2);
ok("V.12 trocar de aula troca a escola exibida", /Iporá/.test(a.q("#ctxEscola").textContent));
ok("V.13 cor acompanha a escola",
   a.w.document.documentElement.style.getPropertyValue("--escola").trim().toLowerCase()
   === a.db().escolas[1].cor.toLowerCase(),
   a.w.document.documentElement.style.getPropertyValue("--escola"));

/* barra de progresso do dia */
const dArte = a.db().disciplinas.find(x=>x.nome==="Arte").id;
a.escreve("#selCtx", dArte);
a.aba("aula");
ok("V.14 barra comeca vazia", a.q("#hojeI").style.width==="0%", a.q("#hojeI").style.width);
const ids = a.db().turmas[0].alunos.map(x=>x.id);
a.q('#grade button[data-add="'+ids[0]+'"]').click();
ok("V.15 barra avanca com um aluno de quatro", a.q("#hojeI").style.width==="25%", a.q("#hojeI").style.width);
a.q('#grade button[data-add="'+ids[1]+'"]').click();
a.q('#grade button[data-add="'+ids[1]+'"]').click();
ok("V.16 barra conta alunos, nao toques", a.q("#hojeI").style.width==="50%", a.q("#hojeI").style.width);
ok("V.17 contagem de toques separada", a.q("#rTotal").textContent==="3");
ok("V.18 texto do dia legivel", /alunos com registro hoje/.test(a.q(".hoje").textContent));

/* icones no menu */
ok("V.19 cinco icones no menu", a.todos("nav button svg").length===5);
ok("V.20 rotulos preservados", a.todos("nav button span").map(x=>x.textContent).join(",")
   === "Aula,Alunos,Notas,Ocorrências,Dados");
a.aba("notas");
ok("V.21 aba ativa marcada", a.q('nav button[data-ab="notas"]').classList.contains("on"));

/* alvos de toque continuam grandes */
const css = a.w.document.querySelector("style").textContent;
ok("V.22 cartao do aluno mantem altura de toque", /\.aluno\{[^}]*min-height:58px/.test(css));
ok("V.23 botoes mantem 44px", /\.bt\{[^}]*min-height:44px/.test(css));
ok("V.24 respeita reducao de movimento", /prefers-reduced-motion/.test(css));

/* avatar sem foto: silhueta em SVG com cor estavel por aluno */
function rgbParaHex(rgb){
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb||"");
  if(!m) return (rgb||"").toUpperCase();
  return "#"+m.slice(1,4).map(n=>(+n).toString(16).padStart(2,"0")).join("").toUpperCase();
}
a.aba("aula");
const avGrade = a.todos("#grade .av");
ok("V.25 avatar sem foto e SVG, nao img", avGrade.length===4
  && avGrade.every(el=>!!el.querySelector("svg") && !el.querySelector("img")));
ok("V.26 iniciais aparecem dentro do SVG", /AS/.test(avGrade[0].textContent) && /BC/.test(avGrade[1].textContent));
const paletaAv = a.w.eval("PALETA_AVATAR");
ok("V.27 paleta discreta de 6 cores", Array.isArray(paletaAv) && paletaAv.length===6);
const coresGrade = avGrade.map(el=>rgbParaHex(el.style.background));
ok("V.28 cor do avatar sempre vem da paleta", coresGrade.every(c=>paletaAv.map(x=>x.toUpperCase()).indexOf(c)>=0),
   coresGrade.join(","));
ok("V.29 lista com mais de uma cor entre alunos diferentes", new Set(coresGrade).size>1, coresGrade.join(","));

a.aba("alunos");
const coresLista = a.todos("#listaAlunos .av").map(el=>rgbParaHex(el.style.background));
ok("V.30 cor de cada aluno e estavel entre a grade e a lista", coresLista.join(",")===coresGrade.join(","),
   coresLista.join(",")+" / "+coresGrade.join(","));

/* pasta grande usa a mesma cor e tambem SVG quando sem foto */
a.clique('#listaAlunos button[data-pasta]');
ok("V.31 pasta grande usa SVG quando sem foto", !!a.q("#pAv svg") && !a.q("#pAv img"));
ok("V.32 cor da pasta grande e a mesma da lista", rgbParaHex(a.q("#pAv").style.background)===coresLista[0]);
a.clique("#pFechar");

/* painel do aluno, aberto pela aba Notas, tambem usa avatar SVG com a mesma cor */
a.aba("notas");
const btAbrir = a.q("#listaNotas button.abrir-al");
ok("V.33 aba Notas tem botao para abrir o painel do aluno", !!btAbrir);
if(btAbrir) btAbrir.click();
const avPainel = a.q(".perfil .av-m");
ok("V.34 painel do aluno usa SVG quando sem foto", !!avPainel && !!avPainel.querySelector("svg") && !avPainel.querySelector("img"));
ok("V.35 cor do painel do aluno e estavel", !!avPainel && rgbParaHex(avPainel.style.background)===coresGrade[0]);
a.clique("#pnFechar");

/* ocorrencia tambem mostra avatar SVG com a cor do aluno */
a.aba("oco"); a.clique("#btNovaOco");
a.escreve("#oFato","Recusou-se a devolver o material emprestado ao colega.");
a.escreve("#oProv","Conversa reservada ao final da aula.");
a.clique("#oOk");
a.clique("#oFech");
const avOco = a.q("#listaOco .av");
ok("V.36 lista de ocorrencias mostra avatar SVG quando sem foto", !!avOco && !!avOco.querySelector("svg") && !avOco.querySelector("img"));

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
