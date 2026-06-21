# Roteiro do vídeo - ShakeUp Área 51

Tempo sugerido: 8 a 12 minutos.

## 1. Apresentação do projeto - 40 segundos

Fala sugerida:

> Olá, meu nome é [seu nome]. Nesta atividade eu transformei a landing page
> ShakeUp Área 51 em uma aplicação com CRUD, banco SQLite, painel administrativo
> protegido e sistema de pedidos. O objetivo é permitir que a empresa gerencie o
> cardápio e acompanhe os pedidos feitos pelos clientes.

Mostre rapidamente a landing page, os sabores, os combos e o montador de pedido.

## 2. Tecnologias e estrutura - 1 minuto

Abra a pasta do projeto e explique:

- `server.js`: servidor HTTP, banco SQLite, autenticação e API;
- `index.html`, `style.css`, `script.js`: loja e fluxo do cliente;
- `admin.html`, `admin.css`, `admin.js`: painel administrativo;
- `sobre.html`: página separada com a história da empresa;
- `shakeup.db`: banco criado automaticamente e ignorado pelo Git;
- `README.md`: documentação para executar o projeto.

Fala sugerida:

> Eu utilizei somente recursos nativos do Node.js, inclusive o módulo SQLite.
> Por isso o projeto não depende de bibliotecas externas. As variáveis e funções
> estão em português e o código foi dividido em etapas comentadas.

## 3. Banco de dados e relacionamentos - 1 minuto

Abra o começo do `server.js` e mostre a criação das tabelas.

Explique as principais:

- `products`: sabores;
- `extras`: adicionais;
- `product_extras`: vínculo entre cada produto e seus adicionais;
- `combos` e `combo_products`: combos e produtos que fazem parte deles;
- `customers`: clientes identificados pelo telefone;
- `orders`, `order_items` e `order_item_extras`: pedidos e seus itens;
- campo `status`: separa pedidos novos e concluídos.

Fala sugerida:

> O relacionamento product_extras resolve o problema de adicionais soltos. Um
> adicional só pode ser escolhido quando está vinculado ao produto no painel.

## 4. Login administrativo - 40 segundos

No rodapé da landing, clique em **Acesso de funcionários**.

Use:

- usuário: `admin`
- senha: `shakeup51`

Mostre no `server.js` as rotas `/api/auth/login`, `/api/auth/session` e logout.

Fala sugerida:

> O painel exige autenticação. Depois do login, o servidor cria uma sessão e
> envia um cookie HTTP Only. As operações administrativas recusam usuários sem
> sessão válida.

## 5. Demonstração do CRUD de produtos - 2 minutos

### Inserção - Create

Cadastre um produto de teste:

- Nome: Eclipse de Pistache
- Categoria: Pistache
- Preço: 22,90
- Descrição: Milk-shake de pistache com chantilly e calda verde de limão.
- Imagem: `img/milkshake-hero.png`
- Marque dois adicionais.

Clique em **Cadastrar produto**.

### Seleção - Read

Mostre o produto na listagem do painel e depois recarregue a landing. Confirme
que ele aparece nos cards e no montador de pedido.

### Alteração - Update

Clique em **Editar**, altere o preço para `24,90` e salve. Recarregue a landing
e mostre o novo valor.

### Exclusão - Delete

Clique em **Excluir**, confirme a operação e mostre que o produto saiu do painel
e da landing.

Durante essa demonstração, mostre no `server.js` os blocos `POST`, `GET`, `PUT`
e `DELETE` da função que trata produtos.

## 6. CRUD de combos - 1 minuto

Abra a aba **Combos** e explique que ela também possui cadastro, leitura,
alteração e exclusão. Mostre que a composição do combo é feita selecionando os
produtos e suas quantidades.

Fala sugerida:

> Os combos não são mais conteúdo fixo do HTML. Eles vêm do banco e aparecem
> automaticamente na landing e no montador de pedido.

## 7. Fluxo do cliente e adicionais - 1 minuto

Volte à landing e adicione um sabor.

No modal de personalização:

1. altere a quantidade;
2. marque um adicional;
3. confirme a personalização;
4. mostre que o resumo apresenta o adicional abaixo do produto correto.

Explique no `script.js` as funções responsáveis pelo modal e pelo cálculo.

## 8. Finalização e cliente pelo telefone - 1 minuto

Clique em **Finalizar pedido**.

1. Informe um telefone novo;
2. clique em **Continuar**;
3. preencha nome e endereço;
4. selecione entrega e mostre a taxa;
5. altere para retirada e mostre a taxa zerada;
6. volte para entrega e confirme o pedido.

Mostre a mensagem **Pedido concluído** e o prazo de 10 a 25 minutos.

Depois, faça outro pedido com o mesmo telefone para demonstrar que nome e
endereço são recuperados do banco.

## 9. Notificação e histórico - 50 segundos

Volte ao painel:

1. mostre o contador vermelho na aba **Pedidos**;
2. abra a aba e apresente o pedido em **Pedidos novos**;
3. clique em **Marcar como concluído**;
4. mostre o pedido sendo movido para **Pedidos concluídos**;
5. explique que o histórico permanece salvo no SQLite.

## 10. Encerramento - 30 segundos

Fala sugerida:

> Com isso, o projeto demonstra inserção, seleção, alteração e exclusão, além de
> relacionamentos entre tabelas, autenticação, persistência de clientes e fluxo
> completo de pedidos. A landing e o painel utilizam a mesma API, evitando dados
> duplicados e mantendo o cardápio sempre atualizado.

Finalize mostrando o repositório no GitHub.

## Checklist antes de gravar

- Inicie com `npm start`.
- Confirme que `http://localhost:3000` está aberto.
- Deixe um editor de código e o navegador lado a lado.
- Aumente o zoom do editor para o código ficar legível.
- Não mostre senhas pessoais; use apenas a credencial demonstrativa do projeto.
- Teste o produto que será cadastrado antes de iniciar a gravação.
