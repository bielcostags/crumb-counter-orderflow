# Sprint 03 — Painel administrativo

Data: 16/11/2026. Branch: `feature/painel-administrativo`.

## Objetivo e escopo

Implementar a área demonstrativa da equipe com indicadores e gerenciamento de pedidos, reutilizando a arquitetura e os serviços locais das sprints anteriores. Não inclui cadastro de produtos/categorias, atendimento no balcão, autenticação real, Supabase, banco real, estoque, emissão fiscal ou publicação.

## Estado inicial do Git e preparação

O working tree estava limpo na branch `feature/checkout-acompanhamento`, commit `1983c38` (`checkout`), também referenciado por `origin/feature/checkout-acompanhamento`. As branches locais e referências remotas disponíveis foram verificadas com `git branch -avv`: `main` estava em `2dde520`, `test/validacao-mvp` em `0a87edc`. As referências remotas foram inspecionadas localmente, sem fetch. A branch nova foi criada a partir do checkout, preservando todo o desenvolvimento anterior. Não houve alteração direta da main nem descarte de alterações locais.

Foram lidos AGENTS.md, README.md, VALIDACAO-MVP.md e SPRINT-02.md, além das rotas, contextos, contratos, serviços, persistência, tipos, dados fictícios e regras compartilhadas. `bun install --frozen-lockfile` concluiu sem alterar o lockfile e os 46 testes anteriores passaram antes da implementação.

## Funcionalidades e critérios de aceite atendidos

- `/admin/acesso`: identidade visual existente, aviso de ausência de autenticação real e botão para entrar pelo `AdminSessionContext`. Sem credenciais ou senhas.
- `/admin`: dashboard protegido na navegação normal pela sessão demonstrativa; `/admin/pedidos`: fila com a mesma proteção. Usuários sem sessão são redirecionados para acesso e o botão Sair encerra a sessão persistida.
- Layout administrativo compartilhado: nome do sistema, identificação demo, data local, seção atual, menu lateral recolhível, navegação por teclado, link para cardápio e adaptação para celular/tablet/desktop. Produtos, categorias e balcão são identificados como “Em breve”, sem simular disponibilidade.
- Dashboard: pedidos realizados hoje, valor pedido, vendas pagas, ticket médio, pendentes, em preparação, concluídos e cancelados; gráfico dos últimos sete dias, comparação online/balcão, distribuição por status e oito pedidos mais recentes com acesso aos detalhes.
- Kanban com seis colunas e ações explícitas, sem drag and drop. Cartões com número, cliente quando informado, data/horário, quantidades, valor, origem, recebimento e situação do pagamento.
- Lista com dados equivalentes, status e botão de detalhes. Tabelas e Kanban têm rolagem horizontal contida no celular.
- Pesquisa por número/nome, filtros combináveis de status, origem, recebimento, pagamento e data, botão para limpar e estado sem resultados.
- Modal de detalhes com dados fictícios do cliente, telefone, endereço quando entrega, data, origem, recebimento, itens, preços, subtotais, observações, total, forma/situação do pagamento, status e histórico.
- Avanço sequencial com serviços e regras existentes, bloqueio durante processamento e feedback de sucesso/erro. Finalizados/cancelados não avançam, não retrocedem nem são reabertos.
- Cancelamento com confirmação, consequência explícita, preservação dos dados e evento no histórico. Se pago, informa ausência de estorno e preserva a marcação demonstrativa.
- Recebimento com confirmação, usando `markPaid`, sem cobrança ou solicitação de dados financeiros. Bloqueia cancelados e recebimento já registrado.
- Atualização reativa entre checkout, fila, indicadores e acompanhamento público no mesmo ambiente local. Nenhuma ampliação de dados pessoais na consulta pública.

## Regras de negócio e decisões técnicas

As telas leem `StoreContext` e operam por `updateStatus`/`markPaid`; não alteram diretamente pedidos no store. `useOrderActions` centraliza trava síncrona por tela, processamento, confirmação e feedback. Detalhes guardam somente o ID do pedido, evitando snapshots desatualizados na interface.

`getNextStatus` e `canTransition` controlam o avanço, `canCancel` controla cancelamento e `getStatusFlow` apresenta o fluxo. Retirada não passa por saiu para entrega. O serviço continua sendo a validação final, inclusive se o pedido mudar durante a latência simulada.

O pagamento permanece independente do preparo: pedidos concluídos não mudam de status, mas podem receber a marcação de pagamento se ainda pendente. Essa distinção permite registrar o recebimento após a conclusão sem reabrir o pedido. A nova guarda de `markPaid` rejeita recebimentos repetidos, preservando valor e histórico de status. Pagamentos não criam eventos de preparação; atualizam `paymentStatus` e `updatedAt`, como no contrato existente.

Indicadores usam `computeDayMetrics` e `computeLastDays`. Totais de pedidos, vendas pagas, ticket e origens excluem cancelados; contagens por status incluem cancelados. Vendas pagas são agrupadas pela data de criação do pedido, não pelo momento de recebimento. O gráfico tem tabela textual alternativa. Todos os números vêm do estado atual; apenas rótulos e limites de apresentação são fixos. A data corrente é atualizada a cada 30 segundos para contemplar mudança de dia.

O layout usa componentes existentes, paleta e fontes atuais. Foram mantidos React, TypeScript, TanStack Start/Router, Vite, Tailwind, shadcn/ui, Lucide, Recharts, Bun e Vitest. Nenhuma dependência foi adicionada. O rótulo acessível de fechamento do Dialog foi traduzido para “Fechar”.

## Arquivos criados

- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/admin/AdminOrders.tsx`
- `src/components/admin/OrderTable.tsx`
- `src/components/admin/OrderDetails.tsx`
- `src/components/admin/use-admin-clock.ts`
- `src/components/admin/use-order-actions.ts`
- `src/routes/admin.acesso.tsx`
- `src/routes/admin.index.tsx`
- `src/routes/admin.pedidos.tsx`
- `src/test/admin-flow.test.tsx`
- `docs/sprints/SPRINT-03.md`

## Arquivos modificados

- `src/routes/admin.tsx`: layout pai, proteção demonstrativa e Outlet.
- `src/services/local/index.ts`: rejeição de recebimento repetido.
- `src/components/ui/dialog.tsx`: rótulo acessível em português.
- `src/test/order-service.test.ts`: recebimento repetido e independência entre preparo e pagamento.
- `src/test/app-routing.test.tsx`: matching das rotas administrativas.
- `src/routeTree.gen.ts`: regenerado automaticamente pelo TanStack durante o build/dev, sem edição manual.
- `README.md`: estado funcional, uso e regras administrativas.

## Testes executados

Os 46 testes anteriores foram preservados. A suíte nova integra componentes das rotas reais, providers, stores e serviços locais com TanStack Router em memória e jsdom. A raiz dos testes é simplificada para evitar dependência do shell SSR e folhas de estilo; o teste de matching usa a árvore gerada real. A medição do ResizeObserver é suprida no jsdom para o gráfico. Mocks de falha são usados apenas para testar feedback de erro; os fluxos de negócio usam os serviços reais.

Casos adicionais: redirecionamento sem sessão, entrada/persistência/saída e nova tentativa de acesso protegido; menu recolhível e funções futuras; dashboard com dados e vazio, atualização por pagamento e cancelamento; Kanban/lista; pesquisa e cada filtro; detalhes com dados fictícios; fluxos completos de retirada e entrega, bloqueio de ações finais e múltiplos cliques; pagamento com confirmação; cancelamento com opção de desistir, confirmação e ausência de estorno; bloqueio de pagamento em cancelado; falha do serviço sem mutação; checkout → fila → avanço → acompanhamento público → pagamento → conclusão → dashboard; cancelamento da equipe refletido publicamente; repetição de pagamento rejeitada no serviço e recebimento após conclusão.

| Validação                       | Resultado                                                  |
| ------------------------------- | ---------------------------------------------------------- |
| `bun install --frozen-lockfile` | Aprovado, sem alteração do lockfile                        |
| Testes antes da implementação   | 46 aprovados em 4 arquivos                                 |
| `bun run typecheck`             | Aprovado, código de saída 0                                |
| `bun run lint`                  | Aprovado: 0 erros e 9 avisos preexistentes de Fast Refresh |
| `bun run test`                  | 65 testes aprovados em 5 arquivos; 19 casos adicionais     |
| `bun run build`                 | Aprovado: cliente, SSR e Nitro                             |
| `git diff --check`              | Aprovado, sem erros de whitespace                          |

Todos os comandos da tabela foram executados. O build manteve os avisos preexistentes do scaffold sobre `vite-tsconfig-paths` e `inlineDynamicImports`; a configuração gerida pelo Lovable foi preservada. Nenhum comando de deploy foi executado.

## Validação visual e problemas encontrados

Foi tentado iniciar o servidor local para revisão visual. O sandbox inicialmente bloqueou a porta (EPERM); com permissão, o Vite iniciou em `http://127.0.0.1:8081/` porque 8080 já estava ocupada. A ferramenta de acesso ao navegador retornou “The browser access host is unavailable”. Assim, não foram realizadas validação visual em desktop/mobile, screenshots ou testes ponta a ponta em navegador real. O servidor iniciado para essa tentativa foi encerrado. Os testes em jsdom não substituem essa revisão.

Na primeira validação, o TypeScript apontou links para `/admin/` onde o destino tipado é `/admin`; foram corrigidos sem editar a árvore gerada. Os testes apontaram diferenças de espaço não separável na formatação BRL e consulta ambígua de múltiplos preços unitários; as expectativas foram corrigidas, mantendo a formatação de produção. Não foram desativadas regras de TypeScript/lint nem removidos testes relevantes.

## Limitações e pendências

- Sessão demonstrativa é um controle de navegação da interface, sem autenticação, autorização ou proteção de produção. Os dados fictícios podem ser acessados pelo armazenamento local do navegador.
- Sem sincronização entre dispositivos. Abas do mesmo navegador usam o mecanismo existente de eventos de storage, sem transações. A trava de operações evita cliques repetidos na mesma tela, não concorrência distribuída.
- Persistência mantém limitações existentes: validação estrutural superficial e possibilidade de dados ficarem apenas em memória se localStorage falhar.
- Não há estorno real, auditoria financeira ou histórico próprio dos recebimentos. Cancelar um pago mantém sua marcação, mas o exclui dos indicadores financeiros.
- O dashboard usa o fuso do navegador, data de criação e dados demo persistidos. Não inventa pedidos novos ao mudar de dia.
- O histórico não contém informações reais de operador, pois não há identidade autenticada.
- Revisão visual em navegador real permanece pendente pela indisponibilidade da ferramenta. Nenhum resultado visual foi alegado.
- Produtos, categorias e balcão não foram implementados nesta sprint. Nenhuma alteração de Supabase, banco, segredo, autenticação real ou serviço pago.

## Recomendações para Sprint 04

Implementar o atendimento de balcão usando `createCounterOrder`, alimentando a mesma fila e reaproveitando validações e detalhes. Planejar gestão de catálogo em escopo explícito posterior. Realizar revisão visual desktop/mobile e testes ponta a ponta em navegador assim que o ambiente permitir. Antes de produção, projetar backend, auth/RLS, validação server-side, numeração transacional, autorização, persistência durável e auditoria financeira.

## Estado final do Git

Alterações mantidas no working tree de `feature/painel-administrativo`, sem commit, push, merge, force push ou publicação nesta execução. `main` preservada. Arquivos gerados foram atualizados apenas pelas ferramentas do projeto.
