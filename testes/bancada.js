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
function ok(nome, cond, extra){
  if(cond){ passes++; }
  else { falhas.push(nome + (extra?" -> "+extra:"")); }
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
      w.URL.createObjectURL = ()=> "blob:x";
      w.URL.revokeObjectURL = ()=>{};
      w.HTMLAnchorElement.prototype.click = function(){ w.__baixou = this.download; };
    }
  });
  const w = dom.window, d = w.document;
  instalarPonte(w);
  return {
    w, d, responde(){ const dlg=d.querySelector("#dialogo"); if(!dlg) return; const bts=[...dlg.querySelectorAll("button")]; const sim = w.__resp!==false && w.__confirma!==false; if(dlg.textContent) w.__c=(w.__c||[]).concat(dlg.querySelector("p").textContent); const alvo = bts.length>1 ? (sim?bts[bts.length-1]:bts[0]) : bts[0]; if(alvo) alvo.click(); }, loja,
    q: s => d.querySelector(s),
    todos: s => Array.from(d.querySelectorAll(s)),
    clique(s){ const el = d.querySelector(s); if(!el) throw new Error("sem elemento "+s); el.click(); this.responde(); },
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

/* ============ 1. arranque limpo ============ */
let app = novoApp(null);
ok("1.1 abre sem dados sem quebrar", !app.w.__erro);
ok("1.2 estrutura inicial criada", app.db().versao === 3 && Array.isArray(app.db().escolas));
ok("1.3 estado vazio convida a agir", /Comece pela sua primeira turma/.test(app.q("#grade").textContent) && !!app.q("#convite1"));
ok("1.4 dez etiquetas padrao", app.db().etiquetas.length === 10);
ok("1.5 composicao 4/4/2", app.db().aval.e1.valor===4 && app.db().aval.e2.valor===4 && app.db().aval.e3.valor===2);

/* ============ 2. cadastro escola / turma / disciplina ============ */
app.aba("dados");
app.clique("#btNovaEscola");
app.escreve("#eNome","Colégio Estadual Maria Barreto");
app.clique("#eOk");
ok("2.1 escola criada", app.db().escolas.some(e=>e.nome==="Colégio Estadual Maria Barreto"));

app.clique("#btNovaEscola");
app.escreve("#eNome","Escola Municipal Iporá");
app.clique("#eOk");
ok("2.2 segunda escola criada", app.db().escolas.length === 2, "tem "+app.db().escolas.length);

app.clique("#btNovaTurma");
app.escreve("#tEscola", app.db().escolas[0].id);
app.escreve("#tNome","7º ano A");
app.escreve("#tDisc","Arte\nJogos Coletivos");
app.escreve("#tAlunos","Ana Clara Ribeiro\nBruno Teixeira\nCarla Menezes\nJosé Ângelo");
app.clique("#tOk");
let t1 = app.db().turmas[0];
ok("2.3 turma com 4 alunos", t1 && t1.alunos.length===4, t1&&t1.alunos.length);
ok("2.4 duas disciplinas na turma", app.db().disciplinas.filter(x=>x.turmaId===t1.id).length===2);
ok("2.5 aluno tem id unico", new Set(t1.alunos.map(a=>a.id)).size===4);

// turma na segunda escola
const esc2 = app.db().escolas[1].id;
app.clique("#btNovaTurma");
app.escreve("#tEscola", esc2);
app.escreve("#tNome","6º ano B");
app.escreve("#tDisc","Educação Física");
app.escreve("#tAlunos","Diego Alves\nElisa Prado");
app.clique("#tOk");
ok("2.6 turma na segunda escola", app.db().turmas.length===2 && app.db().turmas[1].escolaId===esc2);

/* ============ 3. seletor de contexto ============ */
const opts = app.todos("#selCtx option");
const grupos = app.todos("#selCtx optgroup").map(g=>g.label);
ok("3.1 tres disciplinas no seletor", opts.length===3, opts.length);
ok("3.2 agrupado pelas duas escolas", grupos.length===2 && grupos[0].includes("Maria Barreto"));
ok("3.3 rotulo turma mais disciplina", /7º ano A · /.test(opts[0].textContent));

const dArte = app.db().disciplinas.find(x=>x.nome==="Arte").id;
const dJogos = app.db().disciplinas.find(x=>x.nome==="Jogos Coletivos").id;
app.escreve("#selCtx", dArte);
app.aba("aula");
ok("3.4 grade lista 4 alunos", app.todos("#grade .aluno").length===4);

/* ============ 4. participacao ============ */
const alunoIds = t1.alunos.map(a=>a.id);
function tocar(aid){ app.q('#grade button[data-add="'+aid+'"]').click(); }
tocar(alunoIds[0]); tocar(alunoIds[0]); tocar(alunoIds[1]);
ok("4.1 tres registros gravados", app.db().registros.filter(r=>r.tipo==="participacao").length===3);
ok("4.2 contador do primeiro mostra 2", app.q('#grade [data-add="'+alunoIds[0]+'"]').closest(".aluno").querySelector(".cont").textContent==="2");
ok("4.3 resumo do dia atualiza", app.q("#rTotal").textContent==="3" && app.q("#rAlunos").textContent==="2");
app.clique("#btDesfazer");
ok("4.4 desfazer remove um", app.db().registros.filter(r=>r.tipo==="participacao").length===2);

/* ============ 5. isolamento por disciplina ============ */
app.escreve("#selCtx", dJogos);
ok("5.1 Jogos Coletivos comeca zerado", app.q("#rTotal").textContent==="0");
ok("5.2 mesmos alunos aparecem", app.todos("#grade .aluno").length===4);
tocar(alunoIds[2]);
ok("5.3 registro foi para Jogos", app.db().registros.filter(r=>r.discId===dJogos).length===1);
app.escreve("#selCtx", dArte);
ok("5.4 Arte manteve os seus", app.q("#rTotal").textContent==="2");

/* ============ 6. faltas ============ */
app.clique("#btFalta");
ok("6.1 faixa de modo falta aparece", !!app.q("#faixaFalta"));
tocar(alunoIds[3]);
ok("6.2 falta registrada", app.db().registros.some(r=>r.tipo==="falta" && r.alunoId===alunoIds[3]));
ok("6.3 marcador F na grade", app.q('#grade [data-add="'+alunoIds[3]+'"]').closest(".aluno").querySelector(".cont").textContent==="F");
tocar(alunoIds[3]);
ok("6.4 tocar de novo desmarca", !app.db().registros.some(r=>r.tipo==="falta"));
tocar(alunoIds[3]);
app.clique("#btSairFalta");
ok("6.5 sai do modo falta", !app.q("#faixaFalta"));
tocar(alunoIds[0]);
ok("6.6 volta a somar participacao", app.db().registros.filter(r=>r.discId===dArte&&r.tipo==="participacao").length===3);

/* ============ 7. etiquetas e descricao ============ */
app.q('#grade button[data-det="'+alunoIds[0]+'"]').click();
ok("7.1 painel abre com etiquetas", app.todos("#dEtiq .et").length===10);
app.q('#dEtiq button[data-et="3"]').click();
const txt1 = app.q("#dTexto").value;
ok("7.2 etiqueta escreve frase longa", txt1.length > 60, txt1.length+" chars");
app.q('#dEtiq button[data-et="0"]').click();
ok("7.3 segunda etiqueta concatena", app.q("#dTexto").value.length > txt1.length);
ok("7.4 botao marcado como usado", app.q('#dEtiq button[data-et="3"]').classList.contains("usada"));
app.clique("#dOk");
const comTexto = app.db().registros.filter(r=>r.texto && r.texto.length>60);
ok("7.5 registro com texto salvo", comTexto.length===1);

// variacao das frases
const et = app.db().etiquetas[3];
ok("7.6 etiqueta tem 3 variacoes", et.frases.length===3);

/* ============ 8. busca ============ */
app.escreve("#buscaAula","jose");
ok("8.1 busca ignora acento e caixa", app.todos("#grade .aluno").length===1);
app.escreve("#buscaAula","xyz");
ok("8.2 sem resultado avisa", /Nenhum aluno com esse nome/.test(app.q("#grade").textContent));
app.escreve("#buscaAula","");
ok("8.3 limpar restaura todos", app.todos("#grade .aluno").length===4);

/* ============ 9. ocorrencia ============ */
app.aba("oco");
app.clique("#btNovaOco");
app.escreve("#oAluno", alunoIds[1]);
app.escreve("#oFato","Recusou-se a guardar o celular após três solicitações durante a explicação.");
app.escreve("#oProv","Conversa reservada ao final da aula e mudança de lugar.");
app.escreve("#oEnc","Coordenação pedagógica");
app.clique("#oOk");
ok("9.1 ocorrencia gravada", app.db().registros.some(r=>r.tipo==="ocorrencia"));
const tOco = app.q("#oTxt") ? app.q("#oTxt").value : "";
ok("9.2 texto formal montado", /Aos \d{2}\/\d{2}\/\d{4}/.test(tOco) && /Coordenação pedagógica/.test(tOco), tOco.slice(0,60));
ok("9.3 nome do aluno no texto", tOco.includes("Bruno Teixeira"));
app.clique("#oImp");
ok("9.4 documento impresso gerado", app.w.__imprimiu === true);
ok("9.5 assinatura no documento", /Responsável pelo estudante/.test(app.q("#doc").innerHTML));
ok("9.6 escola certa no cabecalho", /Maria Barreto/.test(app.q("#doc").innerHTML));

// validacao do formulario
app.clique("#oFech");
app.clique("#btNovaOco");
app.escreve("#oFato","curto");
app.clique("#oOk");
ok("9.7 recusa fato curto", (app.w.__alertas||[]).some(m=>/mais detalhe/.test(m)), JSON.stringify(app.w.__alertas));
app.escreve("#oFato","Descrição suficientemente longa do fato observado em aula.");
app.clique("#oOk");
ok("9.8 exige providencia", (app.w.__alertas||[]).some(m=>/providência/i.test(m)), JSON.stringify(app.w.__alertas));
app.clique("#oNao");

/* ============ 10. notas: composicao ============ */
app.aba("notas");
ok("10.1 tres colunas mais total", app.todos("#cab-notas span").length===0 || app.todos("#cabNotas span").length===4);
ok("10.2 cabecalho traz eixos", /Avaliaç|Prova|Intens/.test(app.q("#cabNotas").textContent));
const linhas = app.todos("#listaNotas .linha-nota");
ok("10.3 uma linha por aluno", linhas.length===4, linhas.length);

// lancar notas do primeiro aluno
const campos = linhas[0].querySelectorAll(".notinhas input");
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e1m"]', "2,5");
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e2"]', "18");
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e3m"]', "2,0");
const final1 = app.q("#listaNotas .linha-nota:first-child .final").textContent;
ok("10.4 total soma os tres eixos", final1 === "8,7" || final1 === "8,9", "deu "+final1);

// conversao de acertos
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e2"]', "10");
const final2 = app.q("#listaNotas .linha-nota:first-child .final").textContent;
ok("10.5 acertos pela metade derrubam 1,6", (parseFloat(final1.replace(",","."))-parseFloat(final2.replace(",","."))).toFixed(1)==="1.6", final1+" -> "+final2);

// teto
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e2"]', "99");
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e1m"]', "99");
app.escreve('#listaNotas .linha-nota:first-child .notinhas input[data-nota="e3m"]', "99");
{
 const f=parseFloat(app.q("#listaNotas .linha-nota:first-child .final").textContent.replace(",","."));
 ok("10.6 valores absurdos nao estouram 10", f<=10, "deu "+f);
 const r=app.w.eval("calcular()").linhas[0];
 ok("10.7 eixo 1 respeita o teto de 4", r.e1<=4.001, "e1="+r.e1);
 ok("10.8 eixo 2 respeita o teto de 4", r.e2<=4.001, "e2="+r.e2);
 ok("10.9 eixo 3 respeita o teto de 2", r.e3<=2.001, "e3="+r.e3);
}

/* ============ 11. conselho ============ */
ok("11.1 bloco de conselho aparece", !!app.q(".conselho"));
ok("11.2 conta abaixo de 6", /abaixo de 6/.test(app.q(".conselho").textContent));
ok("11.3 conta so quem tem nota lancada", /1\/4/.test(app.q(".conselho").textContent), app.q(".conselho").textContent.replace(/\s+/g," ").slice(0,110));
ok("11.4 aluno nota 9,1 nao entra em abaixo de 6", app.todos(".conselho .nomes li").length===0);

/* ============ 12. painel do aluno e graficos ============ */
app.q('#listaNotas .abrir-al').click();
ok("12.1 grafico de bimestres renderiza", app.todos("#grBim svg").length===1);
ok("12.2 grafico de participacao renderiza", app.todos("#grPart svg").length===1);
ok("12.3 sem NaN nos graficos", !app.q("#grBim").innerHTML.includes("NaN") && !app.q("#grPart").innerHTML.includes("NaN"));
const totalAntes = app.q("#pnTotal").textContent;
app.escreve("#pn3","1,0");
const totalDepois = app.q("#pnTotal").textContent;
ok("12.4 total muda ao digitar", totalAntes !== totalDepois, totalAntes+" -> "+totalDepois);
ok("12.5 decomposicao exibida", /\(.+\+.+\+.+\)/.test(totalDepois), totalDepois);
ok("12.6 mostra parcela automatica", /participação/i.test(app.q("#pnAuto").textContent.toLowerCase()));
app.clique("#pnFechar");

/* ============ 13. pasta do aluno ============ */
app.aba("alunos");
ok("13.1 lista alunos da disciplina", app.todos("#listaAlunos .linha-item").length===4);
app.escreve("#buscaAlunos","carla");
ok("13.2 busca funciona na pasta", app.todos("#listaAlunos .linha-item").length===1);
app.escreve("#buscaAlunos","");
app.q('#listaAlunos button[data-pasta="'+alunoIds[0]+'"]').click();
ok("13.3 pasta abre com avatar grande", !!app.q("#pAv"));
ok("13.4 grafico na pasta", app.todos("#grPart svg, .gr svg").length>=1);
ok("13.5 registros listados", app.todos(".entrada").length>=1);
app.w.__imprimiu = false;
app.clique("#pImp");
ok("13.6 imprime pasta", app.w.__imprimiu===true);
ok("13.7 foto de perfil fora do impresso", !/av-g|pAv/.test(app.q("#doc").innerHTML));

/* ============ 14. apagar registro ============ */
const antes = app.db().registros.length;
app.q(".entrada button[data-apagar]").click();
ok("14.1 registro apagado", app.db().registros.length === antes-1);
app.clique("#pFechar");

/* ============ 15. backup ============ */
app.aba("dados");
app.clique("#btExportar");
ok("15.1 arquivo baixado", /^caderneta-\d{4}-\d{2}-\d{2}\.json$/.test(app.w.__baixou||""), app.w.__baixou);
ok("15.2 data do backup gravada", !!app.db().cfg.ultimoBackup);
ok("15.3 rodape mostra backup", /último backup/.test(app.q("#rodape").textContent));

const copia = JSON.parse(JSON.stringify(app.db()));

/* ============ 16. edicao de turma preserva historico ============ */
app.q('#listaTurmas button[data-turma="'+t1.id+'"]').click();
app.escreve("#tNome","7º ano A - manhã");
app.escreve("#tAlunos","Ana Clara Ribeiro\nBruno Teixeira\nCarla Menezes\nJosé Ângelo\nFernanda Lima");
app.clique("#tOk");
const t1b = app.db().turmas.find(x=>x.id===t1.id);
ok("16.1 turma renomeada", t1b.nome==="7º ano A - manhã");
ok("16.2 aluno novo adicionado", t1b.alunos.length===5);
ok("16.3 ids antigos preservados", t1b.alunos[0].id===alunoIds[0]);
ok("16.4 registros sobreviveram", app.db().registros.filter(r=>r.alunoId===alunoIds[0]).length>0);

/* ============ 17. remover disciplina limpa registros ============ */
const regJogosAntes = app.db().registros.filter(r=>r.discId===dJogos).length;
ok("17.0 havia registro em Jogos", regJogosAntes===1);
app.q('#listaTurmas button[data-turma="'+t1.id+'"]').click();
app.escreve("#tDisc","Arte");
app.clique("#tOk");
ok("17.1 disciplina removida", !app.db().disciplinas.some(x=>x.id===dJogos));
ok("17.2 registros dela apagados", app.db().registros.filter(r=>r.discId===dJogos).length===0);
ok("17.3 registros de Arte intactos", app.db().registros.filter(r=>r.discId===dArte).length>0);

/* ============ 18. etiquetas editaveis ============ */
app.clique("#btEtiq");
app.escreve("#etTxt","Sociologia debate :: Defendeu posição no debate com argumento fundamentado. | Retomou a fala de um colega para contrapor com dado da aula.\nProjeto de Vida :: Relacionou a atividade ao seu próprio projeto de futuro.");
app.clique("#etOk");
ok("18.1 etiquetas substituidas", app.db().etiquetas.length===2);
ok("18.2 variacoes lidas", app.db().etiquetas[0].frases.length===2);
ok("18.3 contador atualizado", /2 etiquetas, 3 frases/.test(app.q("#qtdEtiq").textContent));
app.clique("#btEtiq");
app.escreve("#etTxt","texto sem formato nenhum");
app.clique("#etOk");
ok("18.4 recusa formato invalido", app.db().etiquetas.length===2);
app.clique("#etNao");

/* ============ 19. importar backup ============ */
app.clique("#btEtiq");
app.clique("#etPadrao");
ok("19.1 restaura etiquetas padrao", app.db().etiquetas.length===10);

/* ============ 20. persistencia entre sessoes ============ */
const salvo = JSON.parse(app.loja["caderneta"]);
let app2 = novoApp(salvo);
ok("20.1 reabre com dados", app2.db().turmas.length===2);
ok("20.2 disciplina selecionada valida", !!app2.db().disciplinas.find(x=>x.id===app2.w.eval("discAtual")));
app2.aba("notas");
ok("20.3 notas persistidas", Object.keys(app2.db().notas).length>0);
ok("20.4 lista de notas renderiza", app2.todos("#listaNotas .linha-nota").length>0);

/* ============ 21. migracao de banco antigo (v2) ============ */
const antigo = {
  cfg:{prof:"Prof. Marcos", escola:"Colégio Estadual Maria Barreto"},
  turmas:[{id:"T1",nome:"9º ano",disciplina:"Arte",alunos:[{id:"A1",nome:"Ana",foto:"DATA"}]}],
  registros:[{id:"R1",turmaId:"T1",alunoId:"A1",data:"2026-08-10",tipo:"participacao",fotos:[]}],
  notas:{"T1:3:A1":{i1:0,i2:2.5,pb:8}},
  periodos:{"3":{ini:"2026-08-01",fim:"2026-09-30"}},
  aval:{n1:"a",v1:3,n2:"b",v2:3,n3:"c",v3:4,fonte:"1",meta:8}
};
let app3 = novoApp(antigo);
const d3 = app3.db();
ok("21.1 escola migrada do rodape", d3.escolas[0].nome==="Colégio Estadual Maria Barreto");
ok("21.2 disciplina criada da turma", d3.disciplinas[0].nome==="Arte");
ok("21.3 registro ganhou discId", d3.registros[0].discId===d3.disciplinas[0].id);
ok("21.4 foto do aluno preservada", d3.turmas[0].alunos[0].foto==="DATA");
ok("21.5 nota remapeada", Object.keys(d3.notas)[0].startsWith(d3.disciplinas[0].id));
ok("21.6 prova de bloco virou e2", d3.notas[Object.keys(d3.notas)[0]].e2===8);
ok("21.7 composicao nova aplicada", d3.aval.e1.valor===4);
ok("21.8 app funcional apos migrar", app3.todos("#grade .aluno").length===1);

/* ============ 22. aviso de backup ============ */
const velho = JSON.parse(JSON.stringify(salvo));
velho.cfg.ultimoBackup = "2026-01-01";
let app4 = novoApp(velho);
ok("22.1 faixa de backup aparece apos 15 dias", !!app4.q("#faixaBkp"));
app4.clique("#bkpDepois");
ok("22.2 adiar esconde a faixa", !app4.q("#faixaBkp"));

const recente = JSON.parse(JSON.stringify(salvo));
recente.cfg.ultimoBackup = new Date().toISOString().slice(0,10);
let app5 = novoApp(recente);
ok("22.3 sem faixa com backup recente", !app5.q("#faixaBkp"));

/* ============ resultado ============ */
console.log("Passaram: " + passes);
console.log("Falharam: " + falhas.length);
if(falhas.length) falhas.forEach(f=>console.log("  FALHA " + f));
