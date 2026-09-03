const APP = require("path").join(__dirname, "..", "index.html");
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(opts){
  opts=opts||{};
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{
    runScripts:"dangerously", pretendToBeVisual:true,
    url: opts.url || "https://exemplo.test/app.html",
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      w.alert=()=>{}; w.confirm=()=>true; w.scrollTo=()=>{};
      w.print=()=>{ if(opts.printBloqueado) throw new Error("blocked"); w.__imprimiu=true; };
      w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
      w.HTMLAnchorElement.prototype.click=function(){ w.__baixou=this.download; };
      w.document.execCommand=()=>{ w.__copiou=true; return !opts.copiaBloqueada; };
    }});
  const w=dom.window,d=w.document;
  try{ w.eval("window.avisar=function(t,dp){window.__a=(window.__a||[]).concat(t);if(dp)dp();};"
    +"window.perguntar=function(t,s){window.__c=(window.__c||[]).concat(t);if(s)s();};"); }catch(e){}
  return {w,d,loja,q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){const el=d.querySelector(s); if(el) el.click();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}};
}
function base(a){
  a.aba("dados");
  a.clique("#btNovaEscola"); a.escreve("#eNome","Maria Barreto"); a.clique("#eOk");
  a.clique("#btNovaTurma"); a.escreve("#tNome","6 Ano A"); a.escreve("#tDisc","Educação Física");
  a.escreve("#tAlunos","Ana Silva\nBruno Costa"); a.clique("#tOk");
  return a;
}

/* --- contexto normal --- */
let n=base(app());
n.aba("aula");
ok("S.1 sem aviso de contexto no modo normal", !n.q("#faixaCtx"));

/* --- contexto restrito, como o WhatsApp --- */
let r=base(app({url:"blob:https://exemplo.test/abc"}));
r.aba("aula");
ok("S.2 avisa contexto temporario", !!r.q("#faixaCtx"), "");
ok("S.3 aviso explica o risco", /dados podem sumir/.test(r.q("#faixaCtx").textContent));
r.clique("#ctxComo");
ok("S.4 abre o passo a passo", /Adicionar à tela inicial/.test(r.q("#caixa").textContent));
ok("S.5 manda copiar antes de sair", /Copiar backup/.test(r.q("#caixa").textContent));
r.clique("#ctxOk");

/* --- copiar backup --- */
r.aba("dados");
ok("S.6 botao copiar existe", !!r.q("#btCopiarBkp"));
r.clique("#btCopiarBkp");
ok("S.7 copia executada", r.w.__copiou===true);
ok("S.8 marca data de backup", !!r.db().cfg.ultimoBackup);
ok("S.9 informa tamanho copiado", (r.w.__a||[]).some(m=>/KB de texto/.test(m)), JSON.stringify(r.w.__a));

/* --- copia bloqueada cai na selecao manual --- */
let c=base(app({url:"blob:https://x/y", copiaBloqueada:true}));
c.aba("dados");
c.clique("#btCopiarBkp");
ok("S.10 oferece copia manual", !!c.q("#bkpTxt"));
ok("S.11 texto completo na caixa", (c.q("#bkpTxt").value||"").includes("6 Ano A"));
ok("S.12 json valido na caixa", (()=>{try{JSON.parse(c.q("#bkpTxt").value);return true}catch(e){return false}})());
c.clique("#bkpFechar");

/* --- colar backup restaura --- */
const salvo = JSON.stringify(c.db());
let v=app({url:"blob:https://x/y"});
v.aba("dados");
v.clique("#btColar");
ok("S.13 tela de colar abre", !!v.q("#colTxt"));
v.escreve("#colTxt", salvo);
v.clique("#colSub");
ok("S.14 dados restaurados por colagem", v.db().turmas.length===1 && v.db().turmas[0].alunos.length===2);
v.aba("aula");
ok("S.15 grade preenchida apos colar", v.todos("#grade .aluno").length===2);

/* colagem invalida */
v.aba("dados"); v.clique("#btColar");
v.escreve("#colTxt","isso nao e json");
v.clique("#colSub");
ok("S.16 recusa texto invalido", (v.w.__a||[]).some(m=>/não reconhecido/.test(m)));
v.clique("#colNao");

/* colar e juntar */
let j=base(app());
j.aba("dados"); j.clique("#btColar");
j.escreve("#colTxt", salvo);
j.clique("#colJun");
ok("S.17 colar tambem oferece juntar", /Juntar com este aparelho/.test(j.q("#caixa").textContent));
j.clique("#jOk");
ok("S.18 juntou sem duplicar", j.db().turmas.length===1 && j.db().turmas[0].alunos.length===2);

/* --- impressao bloqueada --- */
let i=base(app({url:"blob:https://x/y", printBloqueado:true}));
i.aba("notas");
i.clique("#btImpNotas");
ok("S.19 oferece alternativas de impressao", /Imprimir ou enviar/.test(i.q("#caixa").textContent));
ok("S.20 mostra previa do documento", !!i.q("#dcPrevia") && i.q("#dcPrevia").textContent.length>40);
ok("S.21 previa traz a turma", /6 Ano A/.test(i.q("#dcPrevia").textContent), i.q("#dcPrevia").textContent.slice(0,80));
ok("S.22 tem copiar e compartilhar", !!i.q("#dcCopiar") && !!i.q("#dcEnviar"));
i.clique("#dcCopiar");
ok("S.23 copia o texto do documento", i.w.__copiou===true);

/* impressao normal nao incomoda */
let ni=base(app());
ni.aba("notas");
ni.clique("#btImpNotas");
ok("S.24 no modo normal imprime direto", ni.w.__imprimiu===true);
ok("S.25 sem painel extra no modo normal", !ni.q("#dcPrevia"));

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
