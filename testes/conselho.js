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
// turma de 27, como a do usuario
const nomes = ["ALEXIA THAYNARA PEREIRA SANTANA","DARCY MANUELLA MENDES DE CARVALHO",
"DAVI LUIZ FERREIRA DA SILVA","EMANUELLY VITORIA RODRIGUES DO NASCIMENTO",
"FERNANDA CRISTINA DE SOUZA","GABRYELA DA MATA FARIA","HEITOR JOSÉ VIEIRA LIMA",
"HENRIQUE ROCHA FERREIRA DE ÁZARA","IZABELLE SANTOS SILVIO","JOAO HENRIQUE VILAÇA NASCIMENTO",
"JOÃO LUCAS DA SILVA SOUZA","KETHELEN GABRIELLY CARMO SALES","LAURA FERNANDES MARTINS DE LIMA",
"LAURA ROCHA FERREIRA DE ÁZARA","LAYS VITORIA XAVIER NASCIMENTO","LIVIA SOUZA LIMA",
"LIVIA TELES FERREIRA","LIZ ALEXANDRA DE MOURA ORMANDES NASCIMENTO","MARCELA BARRETO GONCALVES",
"MARIA EDUARDA DIAS","NICOLAS SANTOS","PEDRO HENRIQUE ALVES","RAFAEL MOURA","SOFIA LIMA",
"THIAGO COSTA","VITOR HUGO SILVA","YASMIN OLIVEIRA"];
let a=app(); a.aba("dados");
a.clique("#btNovaEscola"); a.escreve("#eNome","Colégio Estadual Maria Barreto"); a.clique("#eOk");
a.clique("#btNovaTurma"); a.escreve("#tNome","6 Ano A"); a.escreve("#tDisc","Educação Física");
a.escreve("#tAlunos", nomes.join("\n")); a.clique("#tOk");
a.aba("notas");

/* sem nota lancada */
ok("C.1 nao acusa 27 abaixo de 6", !/27<\/b>abaixo/.test(a.q("#conselho").innerHTML));
ok("C.2 diz que nada foi lancado", /Nenhuma nota lançada/.test(a.q("#conselho").textContent),
   a.q("#conselho").textContent.slice(0,90));
ok("C.3 nao lista nome nenhum", a.todos("#conselho .nomes li").length===0);

/* lanca tres notas */
const linhas = a.todos("#listaNotas .linha-nota");
a.escreve('#listaNotas .linha-nota:nth-child(1) input[data-nota="e2"]',"18");
a.escreve('#listaNotas .linha-nota:nth-child(2) input[data-nota="e2"]',"5");
a.escreve('#listaNotas .linha-nota:nth-child(3) input[data-nota="e2"]',"20");
a.escreve('#listaNotas .linha-nota:nth-child(3) input[data-nota="e1m"]',"2,5");
a.escreve('#listaNotas .linha-nota:nth-child(3) input[data-nota="e3m"]',"2,0");
const txt = a.q("#conselho").textContent;
ok("C.4 conta so os lancados", /3\/27/.test(txt), txt.slice(0,120));
ok("C.5 media so dos lancados", !/^0,0/.test(txt.trim()), txt.slice(0,40));
ok("C.6 lista em linhas, nao em bolhas", a.todos("#conselho .nomes li").length>0);
ok("C.7 nenhuma bolha antiga", a.todos("#conselho .chip").length===0);

const itens = a.todos("#conselho .nomes li");
ok("C.8 so os abaixo de 6 aparecem", itens.length===2, itens.length+" nomes");
ok("C.9 nome e nota separados", itens[0].querySelector("span") && itens[0].querySelector("b"));
ok("C.10 nome completo preservado", /ALEXIA THAYNARA/.test(itens[0].textContent));
ok("C.11 aluno com nota alta ficou fora", !/DAVI LUIZ/.test(a.q("#conselho .nomes").textContent));

/* muitos abaixo de 6 fecham por padrao */
let b=app(); b.aba("dados");
b.clique("#btNovaEscola"); b.escreve("#eNome","E"); b.clique("#eOk");
b.clique("#btNovaTurma"); b.escreve("#tNome","T"); b.escreve("#tDisc","Arte");
b.escreve("#tAlunos", nomes.slice(0,10).join("\n")); b.clique("#tOk");
b.aba("notas");
for(let i=1;i<=10;i++) b.escreve('#listaNotas .linha-nota:nth-child('+i+') input[data-nota="e2"]',"3");
const det = b.q("#conselho details");
ok("C.12 dobra fechada quando sao muitos", det && !det.open);
ok("C.13 resumo diz quantos", /Ver os 10 abaixo/.test(det.textContent));
det.open = true;
ok("C.14 abre a lista completa", b.todos("#conselho .nomes li").length===10);

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
