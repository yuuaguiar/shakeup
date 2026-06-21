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

Os arquivos JavaScript utilizam variáveis, constantes e funções em português.
Cada bloco foi comentado por etapas para facilitar o estudo e a apresentação do
código durante o vídeo da atividade.

## Como executar

É necessário ter Node.js 22.5 ou superior instalado.

```powershell
npm start
```

Depois, acesse:

- landing page: <http://localhost:3000>
- painel administrativo: <http://localhost:3000/admin>

Credenciais padrão do painel:

- usuário: `admin`
- senha: `shakeup51`

As credenciais podem ser alteradas pelas variáveis de ambiente `ADMIN_USER` e
`ADMIN_PASSWORD` antes de iniciar o servidor.

O arquivo `shakeup.db` é criado automaticamente na primeira execução. Os quatro
sabores originais são inseridos somente quando o banco está vazio.

## Operações do CRUD

- **Create:** cadastro de novos milk-shakes pelo painel;
- **Read:** listagem dos produtos no painel, na landing e no montador de pedido;
- **Update:** alteração de nome, categoria, preço, descrição, imagem e disponibilidade;
- **Delete:** exclusão definitiva do produto após confirmação.

O painel também possui CRUD completo de combos, associação individual entre
produtos e adicionais, notificação de novos pedidos e histórico de pedidos
concluídos.

Produtos marcados como indisponíveis continuam no painel, mas deixam de aparecer
na landing page e no montador de pedido.

## Fluxo do pedido

1. O cliente escolhe sabores ou combos.
2. Ao personalizar um sabor, um modal exibe somente os adicionais vinculados a ele.
3. Na finalização, o cliente informa primeiro o telefone.
4. O sistema procura nome e endereço já cadastrados no banco.
5. O cliente escolhe entrega, com taxa de R$ 6,00, ou retirada no local.
6. O servidor recalcula os valores, grava o cliente e registra o pedido.
7. O painel exibe uma notificação com a quantidade de novos pedidos.
8. O funcionário conclui o pedido, que passa para o histórico sem ser apagado.

## Estrutura principal

- `server.js`: servidor, banco SQLite, validação e rotas da API;
- `admin.html`, `admin.css`, `admin.js`: painel administrativo;
- `index.html`, `style.css`, `script.js`: landing page e montador de pedido;
- `sobre.html`: página separada com a história da marca;
- `ROTEIRO-VIDEO.md`: roteiro de apresentação e demonstração do CRUD;
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
| `GET/POST` | `/api/combos` | Listar ou cadastrar combos |
| `PUT/DELETE` | `/api/combos/:id` | Alterar ou excluir combo |
| `GET` | `/api/customers/phone/:phone` | Buscar cliente pelo telefone |
| `POST` | `/api/orders` | Recalcular e registrar pedido |
| `GET` | `/api/orders` | Listar pedidos no painel autenticado |
| `PUT` | `/api/orders/:id/status` | Concluir ou reabrir um pedido |
| `POST` | `/api/auth/login` | Autenticar funcionário |

