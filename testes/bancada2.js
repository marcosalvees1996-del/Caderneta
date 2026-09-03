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
const fs = require("fs");
const { JSDOM } = require("jsdom");
let falhas = [], passes = 0;
function ok(n,c,e){ if(c) passes++; else falhas.push(n+(e?" -> "+e:"")); }

function novoApp(estado){
  const loja = {};
  if(estado) loja["caderneta"] = JSON.stringify(estado);
  const dom = new JSDOM(fs.readFileSync(APP,"utf8"), {url:"https://teste.local/caderneta.html",
    runScripts:"dangerously", pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{
        getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{ if(w.__cheio) { const e=new Error("cheio"); e.name="QuotaExceededError"; throw e; } loja[k]=String(v); },
        removeItem:k=>{delete loja[k]}
      }});
      w.alert=m=>{ w.__alertas=(w.__alertas||[]).concat(m); };
      w.confirm=()=> w.__confirma!==false;
      w.print=()=>{ w.__imprimiu=true; };
      w.scrollTo=()=>{};
      w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
      w.HTMLAnchorElement.prototype.click=function(){ w.__baixou=this.download; w.__conteudo=true; };
    }
  });
  const w=dom.window,d=dom.window.document;
  instalarPonte(w);
  instalarPonte(w);
  return { w,d, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.textContent) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); },loja,
    q:s=>d.querySelector(s), todos:s=>Array.from(d.querySelectorAll(s)),
    clique(s){ d.querySelector(s).click(); this.responde(); },
    escreve(s,v){ const el=d.querySelector(s); el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));
      el.dispatchEvent(new w.Event("change",{bubbles:true})); },
    aba(n){ d.querySelector('nav button[data-ab="'+n+'"]').click(); },
    db(){ return w.eval("db"); } };
}

(async function(){
/* base pronta para os testes */
function base(){
  const app = novoApp(null);
  app.aba("dados");
  app.clique("#btNovaEscola"); app.escreve("#eNome","Maria Barreto"); app.clique("#eOk");
  app.clique("#btNovaTurma");
  app.escreve("#tNome","8º ano A");
  app.escreve("#tDisc","Arte");
  app.escreve("#tAlunos","Ana Silva\nBruno Costa\nCarla Dias");
  app.clique("#tOk");
  return app;
}

/* ===== A. instalacao limpa nao inventa escola ===== */
let a0 = novoApp(null);
ok("A.1 nenhuma escola fantasma", a0.db().escolas.length===0, JSON.stringify(a0.db().escolas));
a0.aba("dados");
a0.clique("#btNovaTurma");
ok("A.2 avisa para cadastrar escola antes", (a0.w.__alertas||[]).some(m=>/escola primeiro/.test(m)));

/* ===== B. troca de bimestre e periodos ===== */
let app = base();
app.aba("notas");
const bimInicial = app.q("#selBim").value;
app.escreve("#bimIni","2026-08-01");
app.escreve("#bimFim","2026-09-30");
ok("B.1 periodo salvo no bimestre atual", app.db().periodos[bimInicial].ini==="2026-08-01");
app.escreve("#selBim","1");
ok("B.2 bimestre sem periodo abre vazio", app.q("#bimIni").value==="");
app.escreve("#bimIni","2026-02-01"); app.escreve("#bimFim","2026-04-15");
ok("B.3 periodo do 1º gravado separado", app.db().periodos["1"].fim==="2026-04-15");
app.escreve("#selBim", bimInicial);
ok("B.4 volta a carregar o periodo certo", app.q("#bimIni").value==="2026-08-01");
ok("B.5 os dois periodos coexistem", Object.keys(app.db().periodos).length>=2);

/* ===== C. notas por bimestre nao se misturam ===== */
const aid = app.db().turmas[0].alunos[0].id;
app.escreve('#listaNotas .linha-nota:first-child input[data-nota="e3m"]',"2,0");
const chaves = Object.keys(app.db().notas);
ok("C.1 nota gravada com o bimestre na chave", chaves.some(k=>k.endsWith(":"+bimInicial+":"+aid)), chaves.join(","));
app.escreve("#selBim","1");
const v1 = app.q('#listaNotas .linha-nota:first-child input[data-nota="e3m"]').value;
ok("C.2 outro bimestre comeca zerado", v1==="0,0", v1);
app.escreve("#selBim", bimInicial);
ok("C.3 volta com a nota lancada",
   app.q('#listaNotas .linha-nota:first-child input[data-nota="e3m"]').value==="2,0");

/* ===== D. composicao configuravel ===== */
app.clique("#cxPesos > summary");
app.escreve("#e1val","5,0");
ok("D.1 soma alerta quando nao fecha 10", /confira/.test(app.q("#soma").textContent));
app.escreve("#e1val","4,0");
ok("D.2 soma valida em 10", !/confira/.test(app.q("#soma").textContent));
app.escreve("#e1auto","2,0");
ok("D.3 mostra o resto para lancar a mao", /Restam 2,0/.test(app.q("#e1resto").textContent));
app.escreve("#e2quest","30");
app.clique("#btPesos");
ok("D.4 configuracao salva", app.db().aval.e2.questoes===30 && app.db().aval.e1.auto===2);
app.escreve('#listaNotas .linha-nota:first-child input[data-nota="e2"]',"15");
const r = app.w.eval("calcular()").linhas[0];
ok("D.5 conversao usa o novo total de questoes", Math.abs(r.e2-2)<0.05, "e2="+r.e2);

/* ===== E. modo nota direta na prova de bloco ===== */
app.clique("#cxPesos > summary");
const cb = app.q("#e2ac"); cb.checked = false;
app.clique("#btPesos");
ok("E.1 modo acertos desligado", app.db().aval.e2.porAcertos===false);
app.escreve('#listaNotas .linha-nota:first-child input[data-nota="e2"]',"3,5");
const r2 = app.w.eval("calcular()").linhas[0];
ok("E.2 aceita nota direta", Math.abs(r2.e2-3.5)<0.05, "e2="+r2.e2);
app.escreve('#listaNotas .linha-nota:first-child input[data-nota="e2"]',"9,9");
const r3 = app.w.eval("calcular()").linhas[0];
ok("E.3 nota direta respeita o teto", r3.e2===4, "e2="+r3.e2);
ok("E.4 cabecalho perde o rotulo de acertos", !/ac\./.test(app.q("#cabNotas").textContent));

/* ===== F. aluno removido da turma ===== */
let app2 = base();
const ids = app2.db().turmas[0].alunos.map(a=>a.id);
app2.aba("aula");
app2.q('#grade button[data-add="'+ids[2]+'"]').click();
ok("F.0 registro criado para o terceiro aluno", app2.db().registros.some(r=>r.alunoId===ids[2]));
app2.aba("dados");
app2.q('#listaTurmas button[data-turma="'+app2.db().turmas[0].id+'"]').click();
app2.escreve("#tAlunos","Ana Silva\nBruno Costa");
app2.clique("#tOk");
ok("F.1 aluno removido da lista", app2.db().turmas[0].alunos.length===2);
const orfaos = app2.db().registros.filter(r=>r.alunoId===ids[2]);
ok("F.2 registros orfaos limpos", orfaos.length===0, orfaos.length+" registros orfaos restaram");
app2.aba("aula");
ok("F.3 grade nao quebra apos remocao", app2.todos("#grade .aluno").length===2);
app2.aba("notas");
ok("F.4 notas nao quebram apos remocao", app2.todos("#listaNotas .linha-nota").length===2);
app2.aba("oco");
ok("F.5 aba ocorrencias nao quebra", !!app2.q("#listaOco"));

/* ===== G. apagar turma e escola ===== */
let app3 = base();
app3.aba("dados");
app3.q('#listaEscolas button[data-escola]').click();
app3.clique("#eDel");
ok("G.1 bloqueia apagar escola com turmas", app3.db().escolas.length===1
   && (app3.w.__alertas||[]).some(m=>/Apague ou mova/.test(m)));
app3.clique("#eNao");
app3.q('#listaTurmas button[data-turma]').click();
app3.clique("#tDel");
ok("G.2 turma apagada", app3.db().turmas.length===0);
ok("G.3 disciplinas da turma removidas", app3.db().disciplinas.length===0);
ok("G.4 registros removidos", app3.db().registros.length===0);
ok("G.5 app segue funcionando", /Comece pela sua primeira turma/.test(app3.q("#grade").textContent));
app3.q('#listaEscolas button[data-escola]').click();
app3.clique("#eDel");
ok("G.6 agora a escola pode ser apagada", app3.db().escolas.length===0);

/* ===== H. importar backup ===== */
let app4 = base();
app4.aba("aula");
app4.q("#grade button[data-add]").click();
const backup = JSON.stringify(app4.db());
let app5 = base();
ok("H.0 app5 comeca sem registros", app5.db().registros.length===0);
app5.aba("dados");
const inp = app5.q("#arqImport");
const arquivo = new app5.w.File([backup], "b.json", {type:"application/json"});
Object.defineProperty(inp, "files", { value:[arquivo], configurable:true });
inp.dispatchEvent(new app5.w.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,400));
ok("H.1 backup importado", app5.db().registros.length===1, app5.db().registros.length);
ok("H.2 avisou o usuario", (app5.w.__alertas||[]).some(m=>/Backup carregado/.test(m)));
app5.aba("aula");
ok("H.3 tela recarregada com os dados", app5.todos("#grade .aluno").length===3);

/* arquivo invalido */
const inp2 = app5.q("#arqImport");
Object.defineProperty(inp2,"files",{value:[new app5.w.File(["{lixo}"],"x.json")],configurable:true});
inp2.dispatchEvent(new app5.w.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,400));
ok("H.4 recusa arquivo invalido", (app5.w.__alertas||[]).some(m=>/não reconhecido/.test(m)));
ok("H.5 dados intactos apos recusa", app5.db().registros.length===1);

/* ===== I. apagar tudo ===== */
let app6 = base();
app6.aba("aula"); app6.q("#grade button[data-add]").click();
app6.aba("dados");
app6.clique("#btLimpar");
ok("I.1 tudo apagado", app6.db().turmas.length===0 && app6.db().registros.length===0);
ok("I.2 preserva nome do professor", typeof app6.db().cfg.prof === "string");
ok("I.3 preserva etiquetas", app6.db().etiquetas.length===10);
ok("I.4 telas nao quebram", !!app6.q("#grade") && !!app6.q("#listaNotas"));

/* ===== J. armazenamento cheio ===== */
let app7 = base();
app7.w.__cheio = true;
app7.aba("aula");
app7.q("#grade button[data-add]").click();
ok("J.1 avisa memoria cheia uma vez", (app7.w.__alertas||[]).filter(m=>/Memória cheia/.test(m)).length===1, JSON.stringify(app7.w.__alertas));
ok("J.2 cabecalho denuncia memoria cheia", /memória cheia/.test(app7.q("#modo").textContent), app7.q("#modo").textContent);
ok("J.3 nao perde a sessao atual", app7.db().registros.length===1);

/* ===== K. impressao do mapa e copiar ===== */
let app8 = base();
app8.aba("notas");
app8.w.__imprimiu = false;
app8.clique("#btImpNotas");
ok("K.1 mapa impresso", app8.w.__imprimiu===true);
const doc = app8.q("#doc").innerHTML;
ok("K.2 tres eixos no cabecalho da tabela", /Avaliação livre/.test(doc)&&/Prova de bloco/.test(doc)&&/Intensificação/.test(doc));
ok("K.3 resumo do conselho no impresso", /Média da turma/.test(doc)&&/Abaixo de 6/.test(doc));
ok("K.4 escola correta", /Maria Barreto/.test(doc));
ok("K.5 assinatura presente", /Coordenação/.test(doc));
app8.clique("#btCopNotas");
ok("K.6 botao de copiar responde", /copiada|Copiar/.test(app8.q("#btCopNotas").textContent));

/* ===== L. ocorrencias de varias disciplinas ===== */
let app9 = base();
app9.aba("dados");
app9.q('#listaTurmas button[data-turma]').click();
app9.escreve("#tDisc","Arte\nSociologia");
app9.clique("#tOk");
const discs = app9.db().disciplinas;
ok("L.0 duas disciplinas", discs.length===2);
function criaOco(app, texto){
  app.aba("oco"); app.clique("#btNovaOco");
  app.escreve("#oFato", texto);
  app.escreve("#oProv","Conversa reservada ao final da aula.");
  app.clique("#oOk"); app.clique("#oFech");
}
app9.escreve("#selCtx", discs[0].id);
criaOco(app9,"Primeiro fato observado com detalhe suficiente em aula.");
app9.escreve("#selCtx", discs[1].id);
criaOco(app9,"Segundo fato observado com detalhe suficiente em aula.");
app9.aba("oco");
ok("L.1 lista mostra as duas", app9.todos("#listaOco .linha-item").length===2);
const rotulos = app9.q("#listaOco").textContent;
ok("L.2 identifica a disciplina de cada uma", /Arte/.test(rotulos)&&/Sociologia/.test(rotulos));
app9.q("#listaOco button[data-oco]").click();
app9.clique("#oDel");
ok("L.3 apagar ocorrencia funciona", app9.db().registros.filter(r=>r.tipo==="ocorrencia").length===1);

/* ===== M. grafico com muitas aulas ===== */
let app10 = base();
const dA = app10.db().disciplinas[0].id;
const alunoA = app10.db().turmas[0].alunos[0].id;
const reg = app10.db().registros;
for(let i=1;i<=25;i++){
  const dia = "2026-08-"+String(i).padStart(2,"0");
  reg.push({id:"x"+i,discId:dA,alunoId:alunoA,data:dia,tipo:"participacao",fotos:[]});
}
app10.aba("notas");
app10.escreve("#bimIni","2026-08-01"); app10.escreve("#bimFim","2026-08-31");
app10.q("#listaNotas .abrir-al").click();
const svg = app10.q("#grPart").innerHTML;
ok("M.1 grafico renderiza com 25 aulas", /<svg/.test(svg) && !/NaN/.test(svg));
const labels = (svg.match(/text-anchor="middle"/g)||[]).length;
ok("M.2 rotulos do eixo nao empilham", labels<=7, labels+" rotulos");
ok("M.3 total de aulas contado", app10.w.eval("calcular()").totalAulas===25,
   app10.w.eval("calcular()").totalAulas);

/* ===== N. seguranca de HTML nos nomes ===== */
let app11 = base();
app11.aba("dados");
app11.q('#listaTurmas button[data-turma]').click();
app11.escreve("#tAlunos",'Ana <script>x</scr'+'ipt>\nBruno "aspas" Costa');
app11.clique("#tOk");
app11.aba("aula");
ok("N.1 nome com tag nao vira elemento", app11.todos("#grade script").length===0);
ok("N.2 nome com aspas nao quebra o botao", app11.todos("#grade .aluno").length===2,
   app11.todos("#grade .aluno").length);

console.log("Passaram: "+passes);
console.log("Falharam: "+falhas.length);
falhas.forEach(f=>console.log("  FALHA "+f));
})();

/* ===== O. cancelar avisos nao altera nada ===== */
(async function(){
  let x = novoApp(null);
  x.aba("dados");
  x.clique("#btNovaEscola"); x.escreve("#eNome","E1"); x.clique("#eOk");
  x.clique("#btNovaTurma"); x.escreve("#tNome","9A"); x.escreve("#tDisc","Arte\nSociologia");
  x.escreve("#tAlunos","Ana\nBruno"); x.clique("#tOk");
  x.aba("aula"); x.q("#grade button[data-add]").click();
  const antes = JSON.stringify(x.db());
  let p2=0, f2=[];
  const ok2=(n,c,e)=>{ if(c)p2++; else f2.push(n+(e?" -> "+e:"")); };

  // cancelar remocao de aluno
  x.aba("dados");
  x.w.__confirma = false;
  x.q('#listaTurmas button[data-turma]').click();
  x.escreve("#tNome","9A renomeada");
  x.escreve("#tAlunos","Ana");
  x.clique("#tOk");
  ok2("O.1 cancelar nao remove aluno", x.db().turmas[0].alunos.length===2);
  ok2("O.2 cancelar nao renomeia a turma", x.db().turmas[0].nome==="9A", x.db().turmas[0].nome);
  ok2("O.3 banco intacto", JSON.stringify(x.db())===antes);
  x.clique("#tNao");

  // cancelar remocao de disciplina
  x.q('#listaTurmas button[data-turma]').click();
  x.escreve("#tDisc","Arte");
  x.clique("#tOk");
  ok2("O.4 cancelar preserva disciplina", x.db().disciplinas.length===2);
  ok2("O.5 registros preservados", x.db().registros.length===1);
  x.clique("#tNao");

  // confirmar de fato remove
  x.w.__confirma = true;
  x.q('#listaTurmas button[data-turma]').click();
  x.escreve("#tDisc","Arte");
  x.clique("#tOk");
  ok2("O.6 confirmar remove disciplina", x.db().disciplinas.length===1);

  console.log("Bloco O passaram: "+p2);
  console.log("Bloco O falharam: "+f2.length);
  f2.forEach(f=>console.log("  FALHA "+f));
})();
