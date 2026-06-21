# ShakeUp Área 51 - CRUD

Aplicação web de uma milk-shakeria fictícia com landing page, montador de pedidos
e painel administrativo para gerenciamento do cardápio.

O projeto foi desenvolvido para a Atividade Avaliativa 2 da disciplina de
Desenvolvimento Web e demonstra as quatro operações de um CRUD: inserção,
seleção, alteração e exclusão.

## Tecnologias

- HTML5, CSS3 e JavaScript;
- Node.js;
- API REST com o módulo HTTP nativo;
- SQLite por meio do módulo `node:sqlite`;
- banco de dados local e persistente.

## Como executar

É necessário ter Node.js 22.5 ou superior instalado.

```powershell
npm start
```

Depois, acesse:

- landing page: <http://localhost:3000>
- painel administrativo: <http://localhost:3000/admin>

O arquivo `shakeup.db` é criado automaticamente na primeira execução. Os quatro
sabores originais são inseridos somente quando o banco está vazio.

## Operações do CRUD

- **Create:** cadastro de novos milk-shakes pelo painel;
- **Read:** listagem dos produtos no painel, na landing e no montador de pedido;
- **Update:** alteração de nome, categoria, preço, descrição, imagem e disponibilidade;
- **Delete:** exclusão definitiva do produto após confirmação.

Produtos marcados como indisponíveis continuam no painel, mas deixam de aparecer
na landing page e no montador de pedido.

## Estrutura principal

- `server.js`: servidor, banco SQLite, validação e rotas da API;
- `admin.html`, `admin.css`, `admin.js`: painel administrativo;
- `index.html`, `style.css`, `script.js`: landing page e montador de pedido;
- `img/`: imagens dos produtos e da identidade visual;
- `package.json`: comandos do projeto.

## Rotas da API

| Método | Rota | Operação |
| --- | --- | --- |
| `GET` | `/api/products` | Listar todos |
| `GET` | `/api/products?available=1` | Listar disponíveis |
| `GET` | `/api/products/:id` | Buscar um produto |
| `POST` | `/api/products` | Cadastrar |
| `PUT` | `/api/products/:id` | Atualizar |
| `DELETE` | `/api/products/:id` | Excluir |

## Sugestão para o vídeo

1. Apresente a landing page e o cardápio carregado do banco.
2. Abra o painel e mostre a listagem dos produtos.
3. Cadastre um novo milk-shake e confira sua aparição na landing.
4. Edite o preço ou a descrição e recarregue a landing.
5. Marque o produto como indisponível para demonstrar a regra de negócio.
6. Exclua o produto e mostre que ele saiu do banco e das interfaces.
7. Explique rapidamente a tabela SQLite e as rotas em `server.js`.
