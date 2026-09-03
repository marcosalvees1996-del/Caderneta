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
let p=0,f=[];
const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(){
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      w.alert=m=>{w.__a=(w.__a||[]).concat(m)};
      w.confirm=m=>{w.__c=(w.__c||[]).concat(m); return w.__resp!==false};
      w.scrollTo=()=>{}; w.print=()=>{};
    }});
  const w=dom.window,d=w.document;
  instalarPonte(w);
  return { w, d, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.querySelector("p")) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); }, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.textContent) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); },q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){d.querySelector(s).click()},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}};
}
function base(){
  const a=app(); a.aba("dados");
  a.clique("#btNovaEscola"); a.escreve("#eNome","E"); a.clique("#eOk");
  a.clique("#btNovaTurma"); a.escreve("#tNome","7A"); a.escreve("#tDisc","Arte");
  a.escreve("#tAlunos","Ana Silva\nBruno Costa\nCarla Dias"); a.clique("#tOk");
  return a;
}

/* remocao real continua avisando */
let a=base();
a.aba("aula"); a.q("#grade button[data-add]").click();
a.aba("dados");
a.q('#listaTurmas button[data-turma]').click();
a.escreve("#tAlunos","Ana Silva\nBruno Costa");
a.clique("#tOk");
ok("R.1 remocao real ainda avisa", (a.w.__c||[]).some(m=>/Carla Dias/.test(m)), JSON.stringify(a.w.__c));
ok("R.2 aluno removido de fato", a.db().turmas[0].alunos.length===2);

/* duplicados mantem historico separado */
let b=app(); b.aba("dados");
b.clique("#btNovaEscola"); b.escreve("#eNome","E"); b.clique("#eOk");
b.clique("#btNovaTurma"); b.escreve("#tNome","8A"); b.escreve("#tDisc","Arte");
b.escreve("#tAlunos","Ana Silva\nAna Silva"); b.clique("#tOk");
const ids0 = b.db().turmas[0].alunos.map(x=>x.id);
b.aba("aula");
b.q('#grade button[data-add="'+ids0[0]+'"]').click();
b.q('#grade button[data-add="'+ids0[1]+'"]').click();
b.q('#grade button[data-add="'+ids0[1]+'"]').click();
b.aba("dados");
b.q('#listaTurmas button[data-turma]').click();
b.clique("#tOk");
const ids1 = b.db().turmas[0].alunos.map(x=>x.id);
ok("R.3 duplicados nao avisam nada", (b.w.__c||[]).length===0);
ok("R.4 ids preservados na ordem", ids1[0]===ids0[0] && ids1[1]===ids0[1]);
ok("R.5 historico separado intacto",
   b.db().registros.filter(r=>r.alunoId===ids0[0]).length===1 &&
   b.db().registros.filter(r=>r.alunoId===ids0[1]).length===2);

/* corrigir maiuscula nao apaga historico */
let c=base();
c.aba("aula"); c.q("#grade button[data-add]").click();
const idAna = c.db().turmas[0].alunos[0].id;
c.aba("dados");
c.q('#listaTurmas button[data-turma]').click();
c.escreve("#tAlunos","ANA SILVA\nBruno Costa\nCarla Dias");
c.clique("#tOk");
ok("R.6 mudar caixa nao avisa remocao", (c.w.__c||[]).length===0, JSON.stringify(c.w.__c));
ok("R.7 mesmo aluno, grafia atualizada",
   c.db().turmas[0].alunos[0].id===idAna && c.db().turmas[0].alunos[0].nome==="ANA SILVA");
ok("R.8 registro preservado", c.db().registros.filter(r=>r.alunoId===idAna).length===1);

/* espaco duplo no meio */
let e=base();
e.aba("dados");
e.db().turmas[0].alunos[1].nome = "Bruno  Costa";
e.q('#listaTurmas button[data-turma]').click();
e.clique("#tOk");
ok("R.9 espaco duplo tolerado", (e.w.__c||[]).length===0, JSON.stringify(e.w.__c));
ok("R.10 nome normalizado ao salvar", e.db().turmas[0].alunos[1].nome==="Bruno Costa");

/* disciplina renomeada com caixa diferente */
let g=base();
g.aba("aula"); g.q("#grade button[data-add]").click();
g.aba("dados");
g.q('#listaTurmas button[data-turma]').click();
g.escreve("#tDisc","arte");
g.clique("#tOk");
ok("R.11 disciplina com caixa diferente nao apaga", g.db().registros.length===1, "registros="+g.db().registros.length);
ok("R.12 disciplina renomeada", g.db().disciplinas[0].nome==="arte");

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
