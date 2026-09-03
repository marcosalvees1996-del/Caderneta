# Caderneta de Sala

Aplicativo de sala de aula em arquivo único, sem servidor e sem internet.
Registra participação por toque, gera ocorrência formal, fecha a nota do bimestre
no modelo da rede estadual de Goiás e mostra a evolução do aluno em gráfico.

App publicado: https://marcosalvees1996-del.github.io/Caderneta/

## Como mexer

O aplicativo inteiro é o `index.html`. Abrir no navegador já funciona.

Para rodar os testes:

```
npm install
npm test
```

São 327 verificações que abrem o app num navegador simulado e exercitam cadastro,
participação, faltas, etiquetas, ocorrências, notas, gráficos, fotos, backup e
migração de dados.

## Publicar uma alteração

```
git add index.html
git commit -m "descrição da mudança"
git push
```

O GitHub Pages atualiza em cerca de um minuto. Os dados de quem usa o app ficam no
navegador e não são afetados.

## Avisos

Os dados vivem no `localStorage` do aparelho. Não há nuvem e não há sincronização
automática entre celular e tablet: use os botões Baixar backup, Copiar backup e
Juntar backup, na aba Dados.

O app guarda nome, foto e registro disciplinar de estudantes menores de idade,
apenas no aparelho do professor. Qualquer mudança que envie esses dados para fora
do aparelho muda o quadro jurídico e exige avaliação antes.

Prof. Marcos Antônio Alves de Moraes
