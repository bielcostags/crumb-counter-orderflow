# Manual de demonstração — Vila Rica Artesanal

## O que é o sistema

Aplicação acadêmica de uma padaria e confeitaria: cardápio, carrinho, pedidos online, acompanhamento, painel administrativo, Kanban, atendimento no balcão e gestão de catálogo. Usa React, TypeScript e Bun, com dados no navegador. Não realiza cobranças nem emite documento fiscal. As credenciais abaixo são fictícias e públicas; as permissões locais não constituem segurança de produção.

A demonstração não precisa de Docker, PostgreSQL, Supabase, contas externas ou arquivo de credenciais. Apenas a busca automática de CEP usa internet; o preenchimento manual permite continuar se ela falhar. A instalação inicial das dependências precisa de internet.

## 1. Preparar o computador

Instale o [Git pelo site oficial](https://git-scm.com/downloads), escolhendo seu sistema operacional. No Windows, o instalador inclui Git Bash; também é possível usar PowerShell. No macOS, siga as opções oficiais de instalação; no Linux, use o gerenciador de pacotes da distribuição. Depois abra um terminal novo e confira:

```sh
git --version
```

Instale o [Bun seguindo o guia oficial](https://bun.sh/docs/installation). No macOS/Linux, o instalador oficial pode ser executado com:

```sh
curl -fsSL https://bun.com/install | bash
```

No Windows, abra PowerShell e use:

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

Abra um terminal novo e confira `bun --version`. A validação desta sprint utilizou **Bun 1.4.4**. Se faltar `unzip` no Linux, instale-o pelo gerenciador da distribuição antes do Bun. Não é necessário instalar Bun via npm.

Instale também o [Visual Studio Code](https://code.visualstudio.com/download). Os links acima são dos fornecedores; consulte os requisitos correspondentes à sua máquina.

## 2. Obter acesso e abrir o projeto

Peça ao proprietário acesso ao repositório caso ele seja privado. Aceite o convite do GitHub e configure a autenticação do Git/GitHub na sua máquina. Não compartilhe senha ou token no chat, terminal gravado ou relatório.

```sh
git clone https://github.com/bielcostags/crumb-counter-orderflow.git
cd crumb-counter-orderflow
```

**A versão deste manual é a branch `feature/demo-apresentacao`.** Enquanto ela não estiver publicada pelo proprietário, um clone da main não contém estas novidades. Peça uma cópia desta versão ou a publicação da branch. Quando ela estiver disponível no origin:

```sh
git fetch origin
git switch --track origin/feature/demo-apresentacao
```

Se a branch já existir localmente, use `git switch feature/demo-apresentacao`. Preserve suas alterações antes de trocar de branch. Não é necessário fazer merge para apresentar.

Abra o VS Code em **Arquivo → Abrir Pasta**, escolhendo `crumb-counter-orderflow`. Se o comando estiver instalado no PATH, pode usar `code .` dentro dessa pasta. Abra **Terminal → Novo Terminal** no VS Code.

## 3. Instalar e executar

Na pasta que contém `package.json`, execute:

```sh
bun install
bun run dev
```

Para reproduzir exatamente o lockfile, prefira `bun install --frozen-lockfile`. Não apague nem substitua `bun.lock`.

O terminal mostrará uma linha **Local** com uma URL, por exemplo `http://localhost:3000`. **Abra a URL efetivamente exibida**, pois a porta pode variar. Deixe o terminal aberto durante a apresentação. Para encerrar, pressione `Ctrl+C` nesse terminal.

`bun npm run` não é o comando correto. Use **`bun run dev`**. Em um ambiente que tenha sido configurado com npm, `npm run dev` é outra sintaxe válida, mas o procedimento oficial deste repositório utiliza Bun e seu lockfile.

Nenhum `.env` é necessário em uma instalação nova para demonstração. Se houver configuração herdada de homologação, confira que **AUTH_MODE e VITE_AUTH_MODE estão ambos em `demo`**, sem ativar o Supabase. Não copie chaves de outras pessoas. O backend comercial continua local. Alterações de variáveis exigem reiniciar o servidor.

## 4. Entrar na área da equipe

No cardápio, use o acesso à área administrativa ou visite `/admin/acesso` na mesma URL local.

| Perfil        | E-mail                    | Senha pública fictícia |
| ------------- | ------------------------- | ---------------------- |
| Administrador | admin@vilarica.demo       | Admin@Demo2026         |
| Funcionário   | funcionario@vilarica.demo | Funcionario@Demo2026   |

Digite e-mail e senha e clique em **Entrar**. O botão ao lado da senha permite mostrar/ocultar. A seção “Contas para apresentação” também contém as credenciais. Senha incorreta não permite entrar.

O administrador acessa visão geral, indicadores, pedidos/Kanban, PDV, produtos e categorias. O funcionário acessa pedidos/Kanban e PDV, com atualização do andamento e registro demonstrativo de pagamentos. Não acessa dashboard, produtos, categorias ou gestão real de funcionários. As duas contas são fixas e não podem ser editadas pela interface.

A sessão persiste ao recarregar. Para trocar de perfil, use **Sair** e entre com a outra conta. Sair não apaga carrinhos, rascunho do balcão, pedidos ou catálogo. Sessões antigas sem identidade e papel válidos precisam de novo login. O rascunho do PDV pertence ao navegador, podendo ser retomado por outra conta após logout; confira-o antes de atender e use “Limpar pedido” com confirmação se precisar descartá-lo.

## 5. Roteiro sugerido para apresentar

1. **Compra online:** abra o cardápio, escolha produtos, confira carrinho e prossiga ao checkout. Use apenas nome e telefone fictícios.
2. **Entrega:** selecione Entrega, informe CEP completo e aguarde a consulta. Confira rua, bairro, cidade e UF; informe o número manualmente e complemento se houver. Todos os campos podem ser corrigidos. Se a consulta falhar, preencha manualmente, incluindo CEP com oito dígitos. Retirada dispensa endereço.
3. **Dinheiro:** escolha Dinheiro e informe, se desejar, “Vai pagar com quanto?”. Confira o troco. O pedido continuará pendente de pagamento. Pix e cartão não mostram campo de troco e não geram cobranças reais.
4. **Confirmação:** guarde o número do pedido e use o acompanhamento. O endereço completo é exibido na confirmação imediata; o acompanhamento público preserva a privacidade, sem nome, telefone ou endereço.
5. **Atendimento:** entre como funcionário, localize o pedido no Kanban/lista, abra os detalhes e confira endereço e troco previsto. Avance o andamento e confirme recebimento somente quando quiser demonstrar essa operação.
6. **PDV:** adicione produtos no balcão, ajuste quantidades/observações e finalize. Dinheiro recebido exige informar quanto foi entregue, com valor suficiente; dinheiro pendente não exige recebimento. Veja confirmação e comprovante **SEM VALOR FISCAL**. “Nova venda” inicia outro atendimento. O carrinho público é independente.
7. **Gestão:** saia, entre como administrador, confira dashboard, produtos e categorias. Mostre que uma alteração local de disponibilidade aparece no cardápio. Evite alterar o catálogo preparado para a apresentação sem necessidade.
8. **Permissões:** saia, entre como funcionário e demonstre que produtos/categorias não aparecem no menu e que suas URLs diretas redirecionam para pedidos.

Os dados são compartilhados apenas pelas abas da mesma origem no mesmo navegador; outro computador, porta ou perfil tem armazenamento independente. Use a mesma URL em todo o roteiro. Pedidos preservam seus snapshots após alterações do catálogo. O valor entregue em dinheiro nunca aumenta o faturamento; os indicadores usam o total da venda e sua situação de pagamento.

## 6. Problemas comuns

| Problema                                 | Como resolver                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `git` ou `bun` não encontrado            | Conclua a instalação, reabra terminal/VS Code e confira o PATH conforme o guia oficial.                             |
| `Repository not found` ou acesso negado  | Confirme a URL, a conta GitHub e a aceitação do convite; peça acesso ao proprietário.                               |
| Branch da demonstração não encontrada    | Peça ao proprietário a versão desta sprint; ela pode ainda não estar publicada.                                     |
| `package.json` não encontrado            | Entre em `crumb-counter-orderflow` antes de executar os comandos.                                                   |
| Erro de download das dependências        | Confira internet, proxy e permissões; tente novamente a instalação sem apagar o lockfile.                           |
| Porta ocupada                            | Abra a URL anunciada pelo Vite ou use `bun run dev --port 3001`; dados de outra porta não aparecem automaticamente. |
| Página indisponível                      | Mantenha o terminal aberto, confira erros e use a URL correta.                                                      |
| Login rejeitado                          | Confira as duas contas desta página e maiúsculas da senha. Sessão antiga exige novo login.                          |
| Aparece login real/configuração Supabase | Confira ambos os modos `demo` e reinicie o servidor; não forneça credenciais reais para esta apresentação.          |
| CEP não retorna                          | Confira oito dígitos, aguarde o feedback e preencha os campos manualmente.                                          |
| Venda em dinheiro bloqueada              | Informe valor válido em reais (`50,00`), igual ou superior ao total. No PDV pago o campo é obrigatório.             |
| Funcionário não vê produtos/dashboard    | É a restrição esperada; entre como administrador para apresentar esses módulos.                                     |
| Dados diferentes em outro navegador      | O armazenamento é local. Não limpe dados de navegação para tentar recuperar pedidos.                                |

Não use “restaurar dados” nem limpe localStorage durante uma apresentação com dados que deseja preservar.

## 7. Verificações técnicas opcionais

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

Os testes automatizados usam dados fictícios e respostas de ViaCEP simuladas para serem reproduzíveis. A revisão visual deve conferir desktop e celular, teclado, login dos dois perfis, compra, PDV e atualização do pedido antes da apresentação. Este manual não declara o sistema pronto para produção.
