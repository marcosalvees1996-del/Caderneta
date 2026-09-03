const APP = require("path").join(__dirname, "..", "index.html");
const fs=require("fs"), {JSDOM}=require("jsdom");
let p=0,f=[]; const ok=(n,c,e)=>{c?p++:f.push(n+(e?" -> "+e:""))};
function app(){
  const loja={};
  const dom=new JSDOM(fs.readFileSync(APP,"utf8"),{url:"https://teste.local/caderneta.html",runScripts:"dangerously",pretendToBeVisual:true,
    beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in loja?loja[k]:null,
        setItem:(k,v)=>{loja[k]=String(v)},removeItem:k=>{}}});
      // simula o Chrome com dialogos BLOQUEADOS pelo usuario
      w.alert=()=>{ w.__nativoAlert=(w.__nativoAlert||0)+1; };
      w.confirm=()=>{ w.__nativoConfirm=(w.__nativoConfirm||0)+1; return false; };
      w.scrollTo=()=>{}; w.print=()=>{};
    }});
  const w=dom.window,d=w.document;
  return {w,d,loja,q:s=>d.querySelector(s),todos:s=>[...d.querySelectorAll(s)],
    clique(s){const el=d.querySelector(s); if(el) el.click();},
    escreve(s,v){const el=d.querySelector(s);el.value=v;
      el.dispatchEvent(new w.Event("input",{bubbles:true}));el.dispatchEvent(new w.Event("change",{bubbles:true}))},
    aba(n){d.querySelector('nav button[data-ab="'+n+'"]').click()},
    db(){return w.eval("db")},
    dialogo(){ return d.querySelector("#dialogo"); },
    textoDialogo(){ const x=d.querySelector("#dialogo"); return x?x.textContent:""; },
    botaoDialogo(rot){ return [...d.querySelectorAll("#dialogo button")].find(b=>b.textContent===rot); }};
}
function base(){
  const a=app(); a.aba("dados");
  a.clique("#btNovaEscola"); a.escreve("#eNome","Maria Barreto"); a.clique("#eOk");
  a.clique("#btNovaTurma"); a.escreve("#tNome","9º ano"); a.escreve("#tDisc","Arte");
  a.escreve("#tAlunos","Ana Silva\nBruno Costa\nCarla Dias"); a.clique("#tOk");
  return a;
}

/* cenario do usuario: navegador com dialogos bloqueados */
let a=base();
ok("D.1 turma criada mesmo com dialogos bloqueados", a.db().turmas.length===1);
ok("D.2 nenhum dialogo nativo foi usado", !a.w.__nativoConfirm && !a.w.__nativoAlert,
   "confirm="+a.w.__nativoConfirm+" alert="+a.w.__nativoAlert);

a.aba("aula"); a.q("#grade button[data-add]").click();
a.aba("dados");
a.q('#listaTurmas button[data-turma]').click();
a.escreve("#tAlunos","Ana Silva\nBruno Costa");
a.clique("#tOk");
ok("D.3 caixa propria aparece", !!a.dialogo());
ok("D.4 caixa explica o que sai", /Carla Dias/.test(a.textoDialogo()), a.textoDialogo().slice(0,80));
ok("D.5 tem botao Cancelar e Remover", !!a.botaoDialogo("Cancelar") && !!a.botaoDialogo("Remover"));
a.botaoDialogo("Cancelar").click();
ok("D.6 cancelar fecha a caixa", !a.dialogo());
ok("D.7 cancelar nao removeu ninguem", a.db().turmas[0].alunos.length===3);
ok("D.8 painel da turma segue aberto", a.q("#painel").classList.contains("on"));

a.clique("#tOk");
a.botaoDialogo("Remover").click();
ok("D.9 confirmar remove", a.db().turmas[0].alunos.length===2);
ok("D.10 painel fecha apos salvar", !a.q("#painel").classList.contains("on"));
ok("D.11 persistiu", (a.loja["caderneta"]||"").includes("9º ano"));
ok("D.12 nenhum dialogo nativo em todo o fluxo", !a.w.__nativoConfirm && !a.w.__nativoAlert);

/* aviso simples tambem usa a caixa propria */
let b=base();
b.aba("dados");
b.clique("#btNovaTurma");
b.escreve("#tNome","");
b.clique("#tOk");
ok("D.13 aviso de nome vazio aparece", /Dê um nome à turma/.test(b.textoDialogo()));
ok("D.14 aviso tem botao Entendi", !!b.botaoDialogo("Entendi"));
b.botaoDialogo("Entendi").click();
ok("D.15 aviso fecha", !b.dialogo());

/* apagar turma encadeado */
let c=base();
c.aba("dados");
c.q('#listaTurmas button[data-turma]').click();
c.clique("#tDel");
ok("D.16 pergunta antes de apagar turma", /Apagar a turma 9º ano/.test(c.textoDialogo()));
c.botaoDialogo("Cancelar").click();
ok("D.17 cancelar preserva a turma", c.db().turmas.length===1);
c.clique("#tDel");
c.botaoDialogo("Apagar turma").click();
ok("D.18 confirmar apaga", c.db().turmas.length===0);

/* apagar tudo com dupla confirmacao */
let e=base();
e.aba("dados");
e.clique("#btLimpar");
ok("D.19 primeira pergunta", /apaga escolas, turmas/.test(e.textoDialogo()));
e.botaoDialogo("Continuar").click();
ok("D.20 segunda pergunta encadeada", /Não há como recuperar sem backup/.test(e.textoDialogo()));
e.botaoDialogo("Cancelar").click();
ok("D.21 cancelar na segunda preserva tudo", e.db().turmas.length===1);
e.clique("#btLimpar");
e.botaoDialogo("Continuar").click();
e.botaoDialogo("Apagar tudo").click();
ok("D.22 confirmar as duas apaga", e.db().turmas.length===0);

console.log("Passaram: "+p); console.log("Falharam: "+f.length);
f.forEach(x=>console.log("  FALHA "+x));
