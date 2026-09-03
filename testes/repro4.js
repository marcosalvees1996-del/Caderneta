const APP = require("path").join(__dirname, "..", "index.html");

function instalarPonte(w){
  try{
    w.eval("(function(){"
      + "var _av=avisar,_pg=perguntar;"
      + "window.avisar=function(t,depois){window.__alertas=(window.__alertas||[]).concat(t);"
      + "window.__a=(window.__a||[]).concat(t); if(depois) depois();};"
      + "window.perguntar=function(t,sim,rot){window.__c=(window.__c||[]).concat(t);"
      + "if(window.__resp!==false && window.__confirma!==false && sim) sim();};"
      + "})()");
  }catch(e){}
}

function respondeDialogo(w,d,sim){
  const dlg=d.querySelector("#dialogo"); if(!dlg) return false;
  const bts=[...dlg.querySelectorAll("button")];
  const alvo = sim ? bts[bts.length-1] : bts[0];
  if(alvo) alvo.click();
  return true;
}
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(){
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{
        getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{ if(w.__limite && String(v).length>w.__limite){const e=new Error("q");e.name="QuotaExceededError";throw e;} loja[k]=String(v); },
        removeItem:k=>{}}});
      w.alert=m=>{w.__a=(w.__a||[]).concat(m)};
      w.confirm=m=>{w.__c=(w.__c||[]).concat(m); return w.__resp!==false};
      w.scrollTo=()=>{}; w.print=()=>{};
    }});
  const w=dom.window,d=w.document;
  instalarPonte(w);
  return { w, d, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.querySelector("p")) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); }, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.textContent) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); },loja,q:s=>d.querySelector(s),
    clique(s){const el=d.querySelector(s); if(el) el.click(); this.responde();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}, aberto(){return d.querySelector("#painel").classList.contains("on")}};
}
function base(){
  const a=app(); a.aba("dados");
  a.clique("#btNovaEscola"); a.escreve("#eNome","E"); a.clique("#eOk");
  a.clique("#btNovaTurma"); a.escreve("#tNome","7º"); a.escreve("#tDisc","Arte");
  a.escreve("#tAlunos","Ana\nBruno"); a.clique("#tOk");
  return a;
}

/* memoria cheia ao salvar turma */
let a=base();
a.w.__limite = JSON.stringify(a.db()).length + 30;
a.clique("#btNovaTurma"); a.escreve("#tNome","9º ano"); a.escreve("#tDisc","Arte");
a.escreve("#tAlunos", Array.from({length:40},(_,i)=>"Aluno "+i).join("\n"));
a.clique("#tOk");
ok("Q.1 avisa que NAO salvou", (a.w.__a||[]).some(m=>/NÃO foi salva/.test(m)), JSON.stringify(a.w.__a));
ok("Q.2 painel continua aberto", a.aberto());
ok("Q.3 nao persistiu mesmo", !(a.loja["caderneta"]||"").includes("9º ano"));
ok("Q.4 cabecalho denuncia", /memória cheia/.test(a.q("#modo").textContent), a.q("#modo").textContent);
a.clique("#tNao");
a.aba("aula");
ok("Q.5 faixa vermelha permanente", !!a.q("#faixaEspaco"));
ok("Q.6 faixa explica o problema", /Nada que você fizer agora está sendo salvo/.test(a.q("#faixaEspaco").textContent));
ok("Q.7 faixa tem botao Liberar", !!a.q("#espLiberar"));

/* liberar espaco funciona */
a.clique("#espLiberar");
ok("Q.8 tela de liberar abre", /Liberar espaço/.test(a.q("#caixa").textContent));
ok("Q.9 mostra contagem de fotos", /fotos de perfil/.test(a.q("#caixa").textContent));
a.clique("#espFechar");

/* apagar fotos libera de verdade */
let b=base();
const t=b.db().turmas[0];
t.alunos[0].foto = "data:image/jpeg;base64,"+"A".repeat(40000);
t.alunos[1].foto = "data:image/jpeg;base64,"+"B".repeat(40000);
b.db().registros.push({id:"r1",discId:b.db().disciplinas[0].id,alunoId:t.alunos[0].id,
  data:"2026-01-10",tipo:"participacao",texto:"Apresentou o trabalho.",fotos:["data:image/jpeg;base64,"+"C".repeat(60000)]});
b.aba("dados");
b.clique("#btLiberar");
const antes = b.q("#caixa").textContent;
ok("Q.10 contabiliza 2 perfis e 1 atividade", /2 fotos de perfil/.test(antes)&&/1 fotos de atividade/.test(antes), antes.slice(0,200));
b.escreve("#espData","2026-06-01");
b.clique("#espAtiv");
ok("Q.11 fotos de atividade apagadas", b.db().registros[0].fotos.length===0);
ok("Q.12 texto do registro preservado", b.db().registros[0].texto==="Apresentou o trabalho.");
b.clique("#espPerfil");
ok("Q.13 fotos de perfil apagadas", !b.db().turmas[0].alunos[0].foto && !b.db().turmas[0].alunos[1].foto);
b.clique("#espFechar");
b.aba("aula");
ok("Q.14 grade volta as iniciais", b.q("#grade .av").textContent.trim().length>0 && !b.q("#grade .av img"));

/* volta a salvar depois de liberar */
let c=base();
c.w.__limite = JSON.stringify(c.db()).length + 30;
c.clique("#btNovaTurma"); c.escreve("#tNome","9º ano"); c.escreve("#tDisc","Arte");
c.escreve("#tAlunos", Array.from({length:40},(_,i)=>"Aluno "+i).join("\n"));
c.clique("#tOk");
ok("Q.15 falhou como esperado", c.aberto());
c.w.__limite = 0;
c.clique("#tOk");
ok("Q.16 depois de liberar, salva", !c.aberto() && c.db().turmas.some(t=>t.nome==="9º ano"));
ok("Q.17 persistiu no armazenamento", (c.loja["caderneta"]||"").includes("9º ano"));
c.aba("aula");
ok("Q.18 faixa some apos voltar a salvar", !c.q("#faixaEspaco"));
ok("Q.19 cabecalho limpo", c.q("#modo").textContent==="");

/* aviso preventivo aos 80 por cento */
let e=base();
e.db().registros.push({id:"g",discId:e.db().disciplinas[0].id,alunoId:e.db().turmas[0].alunos[0].id,
  data:"2026-08-01",tipo:"participacao",texto:"x",fotos:["data:image/jpeg;base64,"+"D".repeat(3800000)]});
e.aba("aula"); e.q("#grade button[data-add]").click();
ok("Q.20 avisa antes de estourar", !!e.q("#faixaEspaco"));
ok("Q.21 aviso preventivo tem tom diferente", /quase no limite/.test((e.q("#faixaEspaco")||{}).textContent||""),
   (e.q("#faixaEspaco")||{}).textContent);

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
