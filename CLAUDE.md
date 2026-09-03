# Caderneta de Sala

Aplicativo de sala de aula do Prof. Marcos Antônio Alves de Moraes.
Registra participação, gera ocorrências, fecha nota do bimestre e mostra gráficos.
Publicado por GitHub Pages, usado no celular e no tablet, dentro da sala de aula.

## Regras que não se quebram

1. **Arquivo único.** Tudo vive em `index.html`: HTML, CSS e JavaScript. Não crie
   arquivos separados de estilo ou script, não use bundler, não use framework.
2. **Zero dependência externa.** Nada de CDN, fonte do Google, biblioteca de gráfico
   ou de ícone. A escola tem internet ruim e o app precisa abrir offline.
   Os gráficos são SVG escritos à mão e os ícones também.
3. **JavaScript conservador.** `var`, `function`, sem `async/await`, sem módulos.
   Roda em navegador de celular Android antigo.
4. **Nada de `alert`, `confirm` ou `prompt` nativos.** Use `avisar(texto)` e
   `perguntar(texto, aoConfirmar, rotulo)`, que são caixas próprias. Navegador com
   diálogos bloqueados já causou perda de dados aqui.
5. **Toda gravação é verificada.** `gravar()` devolve `true` ou `false`. Se devolver
   `false`, avise o usuário e **não feche o formulário**. Nunca finja que salvou.
6. **Alvos de toque grandes.** Cartão de aluno com no mínimo 58px de altura,
   botões com 44px. O app é usado em pé, no barulho, com uma mão.
7. **Migração de dados nunca quebra.** Quem já usa tem turmas cadastradas. Se mudar
   a forma dos dados, escreva a migração em `migrar()` ou numa função nova chamada
   na inicialização, e deixe-a idempotente.
8. **Foto de aluno não entra em documento impresso.** Rosto de menor em papel que
   circula pela coordenação é problema. Na tela pode, no papel não.

## Antes de qualquer commit

```
node testes/rodar-tudo.js
```

São 327 verificações rodando o app de verdade num navegador simulado. Se alguma
falhar, corrija antes de enviar. Se a mudança tornar um teste obsoleto, atualize o
teste e diga o que mudou, mas nunca apague uma verificação para "passar".

Instalação das ferramentas de teste, uma vez só:

```
npm install
```

## Estrutura dos dados

Tudo em `localStorage`, chave `caderneta`, nada de nuvem.

```
db = {
  cfg:        { prof, ultimoBackup },
  escolas:    [{ id, nome, cor }],
  turmas:     [{ id, escolaId, nome, alunos: [{ id, nome, foto }] }],
  disciplinas:[{ id, turmaId, nome }],
  registros:  [{ id, discId, alunoId, data, tipo, texto, fotos, ... }],
  notas:      { "discId:bimestre:alunoId": { e1m, e2, e3m } },
  periodos:   { "1": { ini, fim }, ... },
  etiquetas:  [{ rot, frases: [] }],
  aval:       { e1, e2, e3 },
  versao, versaoNotas
}
```

O aluno e a foto pertencem à **turma**, não à disciplina. O mesmo 7º ano A serve
para Arte e para Jogos Coletivos, com registros separados por disciplina.

`registros.tipo` é `participacao`, `falta` ou `ocorrencia`.

## Como a nota é composta

Modelo da rede estadual de Goiás, somando 10,0:

- **Avaliação livre**, 4,0. Uma parte sai automaticamente da participação
  registrada, o resto é lançado à mão. Quem faltou tem a meta de participações
  reduzida na proporção das aulas em que esteve presente.
- **Prova de bloco**, 4,0. Lançada por número de acertos e convertida
  proporcionalmente, como no SIAP, ou digitada direto.
- **Intensificação**, 2,0. Atividades do Revisa Goiás.

Os valores são configuráveis na aba Notas, porque o caderno orientador muda de ano
para ano. Não fixe nada no código.

## Preferências do autor

- Sem travessão (—) em nenhum texto da interface.
- Nada de maiúsculas forçadas em rótulos, nem enfeite sem função.
- A cor da escola é identificação, não decoração: serve para ele perceber de
  relance se está na aula certa antes de tocar em qualquer nome.
- Rodapé dos documentos impressos credita "Prof. Marcos Antônio Alves de Moraes".

## Publicação

O arquivo é servido pelo GitHub Pages a partir de `main`, pasta raiz. Depois do
push o app atualiza sozinho em `https://marcosalvees1996-del.github.io/Caderneta/`.
Os dados do usuário ficam no navegador, presos ao endereço, e não são afetados
por atualização do código.
