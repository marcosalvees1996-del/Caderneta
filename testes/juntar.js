const APP = require("path").join(__dirname, "..", "index.html");
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function instalarPonte(w){
  try{ w.eval("(function(){window.avisar=function(t,d){window.__a=(window.__a||[]).concat(t);if(d)d();};"
    +"window.perguntar=function(t,sim){window.__c=(window.__c||[]).concat(t);if(window.__resp!==false&&sim)sim();};})()"); }catch(e){}
}
function app(estado){
  const loja={};
  if(estado) loja["caderneta"]=JSON.stringify(estado);
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      w.alert=()=>{}; w.confirm=()=>true; w.scrollTo=()=>{}; w.print=()=>{};
      w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
      w.HTMLAnchorElement.prototype.click=function(){};
    }});
  const w=dom.window,d=w.document; instalarPonte(w);
  return {w,d,loja,q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){const el=d.querySelector(s); if(el) el.click();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")}};
}
function monta(nomeTurma, alunos, discs){
  const a=app(); a.aba("dados");
  a.clique("#btNovaEscola"); a.escreve("#eNome","Maria Barreto"); a.clique("#eOk");
  a.clique("#btNovaTurma"); a.escreve("#tNome",nomeTurma);
  a.escreve("#tDisc",discs.join("\n")); a.escreve("#tAlunos",alunos.join("\n")); a.clique("#tOk");
  return a;
}

/* celular: 7º ano com Ana, Bruno; participacoes */
let cel = monta("7º ano A",["Ana Silva","Bruno Costa"],["Arte"]);
const idsCel = cel.db().turmas[0].alunos.map(x=>x.id);
cel.aba("aula");
cel.q('#grade button[data-add="'+idsCel[0]+'"]').click();
cel.q('#grade button[data-add="'+idsCel[0]+'"]').click();
cel.db().turmas[0].alunos[0].foto = "FOTO_ANA";
cel.db().notas[cel.db().disciplinas[0].id+":3:"+idsCel[0]] = {e1m:2.5, e2:0, e3m:0};

/* tablet: mesma turma cadastrada do zero, mais Carla, outra disciplina, outros registros */
let tab = monta("7º ano A",["Ana Silva","Bruno Costa","Carla Dias"],["Arte","Sociologia"]);
const idsTab = tab.db().turmas[0].alunos.map(x=>x.id);
ok("J.0 ids diferentes entre aparelhos", idsCel[0]!==idsTab[0]);
tab.aba("aula");
tab.q('#grade button[data-add="'+idsTab[2]+'"]').click();
tab.db().registros.push({id:"t1",discId:tab.db().disciplinas[0].id,alunoId:idsTab[1],
  data:tab.db().registros[0].data,tipo:"participacao",texto:"Apresentou o trabalho sobre cerrado.",fotos:[]});
tab.db().notas[tab.db().disciplinas[0].id+":3:"+idsTab[1]] = {e1m:0, e2:16, e3m:2};

/* junta o backup do tablet dentro do celular */
const backupTablet = JSON.stringify(tab.db());
cel.aba("dados");
const inp = cel.q("#arqJuntar");
Object.defineProperty(inp,"files",{value:[new cel.w.File([backupTablet],"b.json",{type:"application/json"})],configurable:true});
inp.dispatchEvent(new cel.w.Event("change",{bubbles:true}));

setTimeout(()=>{
  ok("J.1 tela de juntar abriu", /Juntar com este aparelho/.test(cel.q("#caixa").textContent));
  cel.clique("#jOk");
  const d = cel.db();

  ok("J.2 nao duplicou a escola", d.escolas.length===1, d.escolas.length);
  ok("J.3 nao duplicou a turma", d.turmas.length===1, d.turmas.length);
  ok("J.4 alunos unidos sem repetir", d.turmas[0].alunos.length===3,
     d.turmas[0].alunos.map(x=>x.nome).join(","));
  ok("J.5 Carla veio do tablet", d.turmas[0].alunos.some(x=>x.nome==="Carla Dias"));
  ok("J.6 disciplinas unidas", d.disciplinas.length===2, d.disciplinas.map(x=>x.nome).join(","));
  ok("J.7 foto do celular preservada", d.turmas[0].alunos[0].foto==="FOTO_ANA");

  const arte = d.disciplinas.find(x=>x.nome==="Arte").id;
  const ana = d.turmas[0].alunos.find(x=>x.nome==="Ana Silva").id;
  const bruno = d.turmas[0].alunos.find(x=>x.nome==="Bruno Costa").id;
  const carla = d.turmas[0].alunos.find(x=>x.nome==="Carla Dias").id;

  ok("J.8 participacoes da Ana nao foram somadas em dobro",
     d.registros.filter(r=>r.alunoId===ana&&r.tipo==="participacao").length===2,
     d.registros.filter(r=>r.alunoId===ana).length);
  ok("J.9 registro da Carla veio junto",
     d.registros.filter(r=>r.alunoId===carla).length===1);
  ok("J.10 registro com texto do tablet veio",
     d.registros.some(r=>r.alunoId===bruno && /cerrado/.test(r.texto||"")));
  ok("J.11 todos os registros apontam para ids validos",
     d.registros.every(r=>d.disciplinas.some(x=>x.id===r.discId)
       && d.turmas[0].alunos.some(a=>a.id===r.alunoId)));

  ok("J.12 nota do celular preservada", (d.notas[arte+":3:"+ana]||{}).e1m===2.5,
     JSON.stringify(d.notas[arte+":3:"+ana]));
  ok("J.13 nota do tablet acrescentada", (d.notas[arte+":3:"+bruno]||{}).e2===16,
     JSON.stringify(d.notas[arte+":3:"+bruno]));
  ok("J.14 relatorio mostrado", (cel.w.__a||[]).some(m=>/Acrescentados/.test(m)), JSON.stringify(cel.w.__a));

  /* juntar duas vezes o mesmo arquivo nao duplica nada */
  const antes = JSON.stringify(cel.db());
  const nReg = cel.db().registros.length;
  const inp2 = cel.q("#arqJuntar");
  Object.defineProperty(inp2,"files",{value:[new cel.w.File([backupTablet],"b.json")],configurable:true});
  inp2.dispatchEvent(new cel.w.Event("change",{bubbles:true}));
  setTimeout(()=>{
    cel.clique("#jOk");
    ok("J.15 juntar de novo nao duplica registros", cel.db().registros.length===nReg,
       nReg+" -> "+cel.db().registros.length);
    ok("J.16 juntar de novo nao duplica alunos", cel.db().turmas[0].alunos.length===3);
    ok("J.17 juntar de novo nao duplica disciplinas", cel.db().disciplinas.length===2);
    cel.aba("aula");
    ok("J.18 app segue funcional", cel.todos("#grade .aluno").length===3);
    console.log("Passaram: "+p); console.log("Falharam: "+f.length);
    f.forEach(x=>console.log("  FALHA "+x));
  },200);
},200);
