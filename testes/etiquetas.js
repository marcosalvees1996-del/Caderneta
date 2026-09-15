const APP = require("path").join(__dirname, "..", "index.html");
const fs = require("fs");
const { JSDOM } = require("jsdom");

let falhas = [], passes = 0;
function ok(nome, cond, extra){
  if(cond){ passes++; }
  else { falhas.push(nome + (extra!==undefined?" -> "+extra:"")); }
}

function novoApp(estadoInicial){
  const html = fs.readFileSync(APP,"utf8");
  const loja = {};
  if(estadoInicial) loja["caderneta"] = JSON.stringify(estadoInicial);
  const dom = new JSDOM(html, {
    url: "https://teste.local/caderneta.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w){
      Object.defineProperty(w, "localStorage", { value: {
        getItem:(k)=>k in loja ? loja[k] : null,
        setItem:(k,v)=>{ loja[k]=String(v); },
        removeItem:(k)=>{ delete loja[k]; }
      }});
      w.alert = (m)=>{ w.__alertas = (w.__alertas||[]).concat(m); };
      w.confirm = ()=> w.__confirma !== false;
      w.print = ()=>{ w.__imprimiu = true; };
      w.scrollTo = ()=>{};
    }
  });
  const w = dom.window, d = w.document;
  try{
    w.eval("(function(){"
      + "window.avisar=function(t,depois){window.__alertas=(window.__alertas||[]).concat(t); if(depois) depois();};"
      + "window.perguntar=function(t,sim,rot){window.__c=(window.__c||[]).concat(t); if(window.__confirma!==false && sim) sim();};"
      + "})()");
  }catch(e){}
  return {
    w, d, loja,
    q: s => d.querySelector(s),
    todos: s => Array.from(d.querySelectorAll(s)),
    clique(s){ const el = d.querySelector(s); if(!el) throw new Error("sem elemento "+s); el.click(); },
    escreve(s, v){
      const el = d.querySelector(s); if(!el) throw new Error("sem campo "+s);
      el.value = v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));
      el.dispatchEvent(new w.Event("change",{bubbles:true}));
    },
    marca(s, v){
      const el = d.querySelector(s); el.checked = v;
      el.dispatchEvent(new w.Event("change",{bubbles:true}));
    },
    aba(nome){ d.querySelector('nav button[data-ab="'+nome+'"]').click(); },
    db(){ return w.eval("db"); }
  };
}

function montarTurma(app){
  app.aba("dados");
  app.clique("#btNovaEscola");
  app.escreve("#eNome","Escola Teste");
  app.clique("#eOk");
  app.clique("#btNovaTurma");
  app.escreve("#tNome","7º ano A");
  app.escreve("#tDisc","Arte\nSociologia\nGeografia");
  app.escreve("#tAlunos","Ana Silva\nBruno Costa");
  app.clique("#tOk");
  const discs = app.db().disciplinas;
  return {
    arte: discs.find(x=>x.nome==="Arte").id,
    sociologia: discs.find(x=>x.nome==="Sociologia").id,
    geografia: discs.find(x=>x.nome==="Geografia").id,
    aluno: app.db().turmas[0].alunos[0].id
  };
}

/* ===== A. etiquetas de participacao por disciplina ===== */
let a = novoApp(null);
const ids = montarTurma(a);

a.aba("aula");
a.escreve("#selCtx", ids.arte);
a.q('#grade button[data-det="'+ids.aluno+'"]').click();
ok("A.1 arte soma geral e especifica", a.todos("#dEtiq .et").length === 13);
const rotulosArte = a.todos("#dEtiq .et").map(b=>b.textContent);
ok("A.2 traz etiqueta propria de arte", rotulosArte.includes("Explorou técnica nova"));
ok("A.3 nao traz etiqueta de outra disciplina", !rotulosArte.includes("Relacionou teoria e realidade"));
a.q("#dNao").click();

a.escreve("#selCtx", ids.sociologia);
a.q('#grade button[data-det="'+ids.aluno+'"]').click();
ok("A.4 sociologia soma geral e especifica", a.todos("#dEtiq .et").length === 13);
const rotulosSoc = a.todos("#dEtiq .et").map(b=>b.textContent);
ok("A.5 traz etiqueta propria de sociologia", rotulosSoc.includes("Relacionou teoria e realidade"));
ok("A.6 nao traz etiqueta de arte", !rotulosSoc.includes("Explorou técnica nova"));
a.q("#dNao").click();

a.escreve("#selCtx", ids.geografia);
a.q('#grade button[data-det="'+ids.aluno+'"]').click();
ok("A.7 disciplina sem banco proprio usa so o geral", a.todos("#dEtiq .et").length === 10);
a.q("#dNao").click();

/* etiqueta clicada escreve frase e o alvo recebe destaque */
a.escreve("#selCtx", ids.arte);
a.q('#grade button[data-det="'+ids.aluno+'"]').click();
const idxArte = a.todos("#dEtiq .et").findIndex(b=>b.textContent==="Explorou técnica nova");
a.q('#dEtiq button[data-et="'+idxArte+'"]').click();
ok("A.8 clique preenche com frase da disciplina", a.q("#dTexto").value.length > 10);
a.q("#dNao").click();

/* ===== B. migracao preserva etiquetas personalizadas ===== */
const dbAntigo = {
  cfg:{prof:"Prof. Teste"}, escolas:[], turmas:[], disciplinas:[], registros:[],
  notas:{}, periodos:{}, aval:null, versao:3,
  etiquetas:[{rot:"Frase própria do professor", frases:["Uma frase escrita à mão pelo professor há anos."]}]
};
let m = novoApp(dbAntigo);
ok("B.1 geral herda a lista antiga sem perder nada", m.db().etiquetas.geral.length===1
  && m.db().etiquetas.geral[0].rot==="Frase própria do professor");
ok("B.2 bancos por disciplina aparecem depois da migracao",
  Object.keys(m.db().etiquetas.porDisciplina).length===7);
ok("B.3 banco de arte vem com frases padrao", m.db().etiquetas.porDisciplina["arte"].length===3);
ok("B.4 migracao e idempotente", m.w.eval("db.versaoEtiquetas")===1);

/* ===== C. etiquetas de ocorrencia com lacunas ===== */
let c = novoApp(null);
const idsC = montarTurma(c);
c.aba("oco");
c.clique("#btNovaOco");
ok("C.1 etiquetas de fato aparecem", c.todos("#oFatoEtiq .et").length === 6);
ok("C.2 etiquetas de providencia aparecem", c.todos("#oProvEtiq .et").length === 4);

c.q('#oFatoEtiq button[data-etf="0"]').click();
const valorFato = c.q("#oFato").value;
ok("C.3 clique insere frase com colchetes", /\[[^\]]+\]/.test(valorFato), valorFato);
ok("C.4 campo sinalizado com classe de lacuna", c.q("#oFato").classList.contains("lacuna"));
ok("C.5 aviso de lacuna fica visivel", c.q("#oFatoLacuna").hidden === false);
const ta = c.q("#oFato");
ok("C.6 cursor selecionado sobre o primeiro colchete",
  ta.value.slice(ta.selectionStart, ta.selectionEnd) === (/\[[^\]]*\]/.exec(ta.value)||[""])[0]);

c.escreve("#oProv","Conversa reservada ao final da aula.");
c.clique("#oOk");
ok("C.7 recusa salvar com colchetes no fato", (c.w.__alertas||[]).some(x=>/colchetes/.test(x)));
ok("C.8 nao criou registro com colchetes", !c.db().registros.some(r=>r.tipo==="ocorrencia"));

c.escreve("#oFato","Recusou-se a devolver o material após duas solicitações.");
ok("C.9 lacuna some ao corrigir o texto", c.q("#oFato").classList.contains("lacuna")===false
  && c.q("#oFatoLacuna").hidden===true);

c.q('#oProvEtiq button[data-etp="0"]').click();
ok("C.10 etiqueta de providencia tambem marca lacuna", c.q("#oProv").classList.contains("lacuna"));
c.clique("#oOk");
ok("C.11 recusa salvar com colchetes na providencia", (c.w.__alertas||[]).some(x=>/colchetes/.test(x)));

c.escreve("#oProv","Conversa reservada com o(a) estudante ao final da aula.");
c.clique("#oOk");
ok("C.12 salva depois de preencher os colchetes", c.db().registros.some(r=>r.tipo==="ocorrencia"));

/* ===== D. documento de ocorrencia mais completo ===== */
let e = novoApp(null);
const idsE = montarTurma(e);
e.aba("oco");
e.clique("#btNovaOco");
e.escreve("#oFato","Recusou-se a guardar o celular após três solicitações durante a explicação.");
e.marca("#oReinc", true);
e.escreve("#oPresentes","Coordenadora Ana Paula");
e.marca("#oDano", true);
e.escreve("#oDanoDesc","Quebrou a maçaneta da porta da sala.");
e.escreve("#oVersao","Disse que o celular estava tocando e por isso atendeu.");
e.escreve("#oProv","Conversa reservada ao final da aula e mudança de lugar.");
e.clique("#oOk");
const regCompleto = e.db().registros.find(r=>r.tipo==="ocorrencia");
ok("D.1 reincidencia gravada", regCompleto.reincidencia === true);
ok("D.2 presentes gravado", regCompleto.presentes === "Coordenadora Ana Paula");
ok("D.3 dano e descricao gravados", regCompleto.dano === true
  && regCompleto.danoDescricao === "Quebrou a maçaneta da porta da sala.");
ok("D.4 versao do estudante gravada", /celular estava tocando/.test(regCompleto.versaoEstudante));

const textoCompleto = e.w.eval("textoOco("+JSON.stringify(regCompleto)+")");
ok("D.5 texto tem paragrafos separados", textoCompleto.indexOf("\n\n") > 0);
ok("D.6 texto cita reincidencia", /reincidência/.test(textoCompleto));
ok("D.7 texto cita presentes", /Coordenadora Ana Paula/.test(textoCompleto));
ok("D.8 texto cita dano material", /Houve dano material.*maçaneta/.test(textoCompleto));
ok("D.9 texto cita versao do estudante", /estudante relatou.*celular estava tocando/.test(textoCompleto));

e.q("#oImp").click();
ok("D.10 documento impresso mostra reincidencia", /Reincidência:<\/b> Sim/.test(e.q("#doc").innerHTML));
e.q("#oFech").click();

/* ocorrencia enxuta omite as secoes vazias */
e.clique("#btNovaOco");
e.escreve("#oFato","Manteve conversa paralela durante a explicação do conteúdo novo.");
e.escreve("#oProv","Conversa reservada ao final da aula.");
e.clique("#oOk");
const regEnxuto = e.db().registros.filter(r=>r.tipo==="ocorrencia")[1];
const textoEnxuto = e.w.eval("textoOco("+JSON.stringify(regEnxuto)+")");
ok("D.11 sem presentes nem dano nem versao, texto nao menciona nada disso",
  !/presentes também/.test(textoEnxuto) && !/dano material/.test(textoEnxuto)
  && !/estudante relatou/.test(textoEnxuto) && !/reincidência/.test(textoEnxuto));
e.q("#oImp").click();
ok("D.12 documento impresso nao mostra linha de reincidencia", !/Reincidência:/.test(e.q("#doc").innerHTML));

console.log("Passaram: "+passes);
console.log("Falharam: "+falhas.length);
falhas.forEach(f=>console.log("  FALHA "+f));
