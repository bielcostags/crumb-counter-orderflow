# Sprint 05 — PDV e atendimento no balcão

Data: 16/11/2026. Branch: `feature/pdv-balcao`.

## Objetivo e escopo

Implementar atendimento presencial com catálogo, carrinho próprio, revisão e registro na fila existente, pagamento e troco demonstrativos, confirmação e comprovante não fiscal. Consolidar os módulos funcionais do MVP frontend sem declarar prontidão de produção.

Não inclui Supabase, banco real, autenticação real, serviços pagos, pagamentos online, abertura/fechamento de caixa, sangria, suprimento, estoque, fornecedores, emissão fiscal, SEFAZ, impressoras térmicas, exclusões definitivas ou publicação.

## Preparação

Working tree inicialmente limpo em `feature/gestao-cardapio`, commit `787d92e`, também em `origin/feature/gestao-cardapio`. Inspecionadas branches locais/referências remotas com git branch -avv, sem fetch. Origin/main apontava para o merge `003dd7a` e main local permaneceu em `2dde520`. A nova branch deriva da Sprint 04, conforme solicitado, sem alterar main ou descartar mudanças do usuário.

Lidos AGENTS.md, README.md, VALIDACAO-MVP.md e relatórios anteriores, e revisados arquitetura, contratos, serviços, stores, contextos, regras de pedidos/catálogo/valores, componentes administrativos e testes das jornadas. Bun install com lockfile congelado concluiu sem alteração; 109 testes anteriores passaram em 7 arquivos antes da implementação.

## Funcionalidades e critérios atendidos

- `/admin/balcao` integra menu, seção ativa e proteção demonstrativa existentes. Usuários sem sessão vão para o acesso.
- Catálogo com categorias ativas, pesquisa por nome/descrição, filtro de categoria, imagens com fallback, preços e bloqueio de indisponíveis. Grade e pedido atual ficam lado a lado em telas largas e empilhados em telas menores.
- Carrinho presencial independente com consolidação por produto, quantidades inteiras de 1 a 99, observações por item, remoção, total e quantidade agregados. Não altera o carrinho público ao adicionar, limpar ou finalizar.
- Nome fictício e observações gerais opcionais; venda anônima não cria cadastro permanente. A interface usa “Cliente não informado”.
- Rascunho persistente exclusivo, incluindo dados de atendimento/pagamento, com manutenção ao navegar, recarregar e trocar sessão demo. Limpeza integral requer confirmação; erros preservam o pedido.
- Modal de finalização com resumo, nome/observações, Pix/dinheiro/cartão e situação pendente/recebido. Trava síncrona e estados desabilitados evitam múltiplos envios por tela.
- Dinheiro recebido aceita valor entregue opcional, em centavos. Valores inválidos, negativos, inseguros ou inferiores ao total bloqueiam registro; troco nunca é negativo. Campos são limpos ao mudar forma/situação. Não há troco em Pix/cartão e valor entregue não é faturamento.
- Registro pelo createCounterOrder existente, com counterOrderSchema, buildOrderItems, calcTotalCents, assertOrderQuote e nextOrderNumber. Mesma estrutura Order e fila, origem balcão, retirada, status pendente, pagamento correspondente, snapshots, datas e histórico inicial.
- Nome, preço e categoria alterados durante atendimento exigem revisão explícita; indisponibilidade/categoria inativa bloqueiam venda. Mudanças relevantes entre confirmação e gravação rejeitam o registro sem limpar o rascunho.
- Confirmação com número, produtos, quantidades, valores, origem, status inicial, forma/situação e troco quando informado. Nova venda, pedidos e detalhes existentes disponíveis.
- Referência da última venda persistida: retornar/recarregar apenas mostra o registro, sem reenvio automático. Se a referência não existir mais nos dados demo, apresenta aviso e botão de nova venda.
- Comprovante demonstrativo sem valor fiscal, com produtos, quantidades, valores unitários/subtotais, total, pagamento e data; impressão nativa com estilos específicos.
- Integração com Kanban/lista/filtro Balcão e fluxo retirada, cancelamento, recebimento posterior e dashboard. Nenhuma lógica paralela de gestão/indicadores foi criada.

## Regras e decisões arquiteturais

CounterCartProvider usa createPersistentStore/useSyncExternalStore e a chave `padaria-digital:demo:counter-cart:v1`. O estado inclui itens e referências de catálogo vistas, nome, observações, pagamento, valor entregue textual e referência da última confirmação. Não usa a chave do carrinho público nem altera o modelo Product/Order.

O parser do rascunho é validado por Zod, incluindo limites, duplicidade e valores auxiliares seguros. Dados persistidos inválidos retornam ao estado inicial; isso não representa recuperação transacional de dados corrompidos. A sessão é demonstrativa por navegador: logout não descarta o rascunho, e outro acesso demo nesse navegador verá o mesmo atendimento. Use somente dados fictícios. Descarte explicitamente antes de deixar um terminal compartilhado se não quiser manter o atendimento.

Ações do contexto e hook de consumo foram separados do componente Provider para preservar Fast Refresh sem adicionar avisos. UI não acessa localStorage diretamente. O catálogo reativo e o componente QuantityStepper foram reutilizados.

OrderQuoteItem estende somente a prévia com categoryId opcional; não adiciona campos ao pedido persistido. AssertOrderQuote continua comparando nome/preço/quantidade/notas e também verifica categoria quando fornecida. CreateCounterOrder aceita uma prévia opcional por compatibilidade; o PDV sempre a fornece e o serviço recalcula pelo catálogo depois da latência. Consumidores antigos sem prévia continuam válidos. Disponibilidade e situação da categoria são validadas por buildOrderItems.

CalculateCashChange usa parseBRLToCents e é apenas auxílio operacional. Troco/valor entregue são guardados no rascunho/última confirmação, não em Order, e desaparecem ao iniciar nova venda. Não são caixa, contas a receber, registro bancário nem trilha financeira. O serviço recebe o total calculado do catálogo, nunca o valor entregue como venda.

A confirmação deriva o pedido pelo ID do store compartilhado e reutiliza OrderSummary/OrderDetails. Os detalhes podem avançar/pagar/cancelar conforme as regras existentes. Pagamento é independente da preparação; balcão nunca passa por saiu para entrega. Histórico e snapshots anteriores não são editados pelo PDV.

Indicadores continuam usando computeDayMetrics/computeLastDays: cancelados excluídos dos totais válidos, pendentes de pagamento fora de vendas pagas e recebimentos agrupados pela data de criação do pedido, não pela data efetiva do recebimento. Nenhum número fixo de venda foi introduzido.

## Arquivos criados e modificados

### Criados

- `docs/MVP-FRONTEND.md`
- `docs/sprints/SPRINT-05.md`
- `src/components/admin/pos/POSCart.tsx`
- `src/components/admin/pos/POSCheckout.tsx`
- `src/components/admin/pos/POSConfirmation.tsx`
- `src/components/admin/pos/POSProductGrid.tsx`
- `src/components/admin/pos/POSReceipt.tsx`
- `src/components/admin/pos/PointOfSale.tsx`
- `src/components/admin/pos/use-pos-quote.ts`
- `src/contexts/CounterCartContext.tsx`
- `src/contexts/counter-cart.ts`
- `src/lib/pos.ts`
- `src/routes/admin.balcao.tsx`
- `src/services/local/counter-store.ts`
- `src/test/pos-flow.test.tsx`
- `src/test/pos-rules.test.ts`

### Modificados

- `README.md`
- `src/components/admin/AdminLayout.tsx`
- `src/lib/orders.ts`
- `src/routeTree.gen.ts`
- `src/services/contracts.ts`
- `src/services/local/index.ts`
- `src/styles.css`
- `src/test/admin-flow.test.tsx`
- `src/test/app-routing.test.tsx`
- `src/test/catalog-management.test.tsx`
- `src/test/helpers/catalog-router.tsx`

`src/routeTree.gen.ts` foi atualizado automaticamente pelo plugin TanStack, sem edição manual.

## Testes e validações

Os 109 casos anteriores foram preservados. Expectativas antigas de “balcão em breve” foram atualizadas para validar o link disponível, sem remover os testes de menu. O helper de rotas dos testes foi ampliado com PDV, pedidos e acompanhamento; o matching da árvore real inclui a nova rota.

Novos casos usam componentes, rotas, providers e serviços reais, em TanStack Router em memória/jsdom. Medição ResizeObserver é suprida para gráficos no jsdom; falha de serviço é simulada para testar recuperação. A chamada nativa print é interceptada no teste, não uma impressão real.

Cobertura: proteção/navegação, catálogo/pesquisa/filtros, indisponibilidade/categoria inativa, adição/consolidação/remoção/quantidades/limites/notas, estado vazio, independência do público, persistência de rascunho e confirmação com parser real, navegação/logout/login, descarte confirmado, vendas anônimas e identificadas, Pix/dinheiro/cartão, pendente/recebido, troco/insuficiência/inválidos, limpeza do campo ao mudar pagamento, alterações de catálogo durante atendimento e envio, duplicação, falha sem perda, comprovante e acionamento de print, fila Balcão, conclusão/recebimento posterior, métricas/gráfico e preservação histórica.

| Verificação                     | Resultado                                                   |
| ------------------------------- | ----------------------------------------------------------- |
| `bun install --frozen-lockfile` | Aprovado; lockfile preservado                               |
| Testes antes da implementação   | 109 aprovados em 7 arquivos                                 |
| `bun run typecheck`             | Aprovado, código de saída 0                                 |
| `bun run lint`                  | Aprovado: 0 erros e 9 avisos preexistentes de Fast Refresh  |
| `bun run test`                  | 146 aprovados em 9 arquivos: 109 anteriores e 37 adicionais |
| `bun run build`                 | Aprovado: cliente, SSR e Nitro                              |
| `git diff --check`              | Aprovado, sem erros de whitespace                           |

Todos os comandos da tabela foram executados. O build manteve os avisos preexistentes sobre vite-tsconfig-paths e inlineDynamicImports do scaffold Lovable. Não foram alterados plugins geridos, dependências ou lockfile; nenhum deploy foi executado.

## Homologação das jornadas

A suíte completa mantém as jornadas online, administrativa e de gestão do catálogo das sprints anteriores e acrescenta a presencial até a fila, conclusão e recebimento. A cobertura é de regras e integração de DOM/rotas; não equivale a homologação ponta a ponta em navegador real.

Tentada homologação visual desktop/tablet/celular. Vite iniciou em `http://127.0.0.1:8081/`, pois 8080 estava ocupada. A ferramenta respondeu “The browser access host is unavailable”. Portanto, não foram executadas revisão visual dessas resoluções, verificação de console de navegador, teste de impressão/preview ou recarga em navegador real. O servidor iniciado foi encerrado; o processo preexistente não foi alterado. Persistência foi verificada por instâncias novas do mecanismo de armazenamento e remount/navegação em jsdom.

## Problemas encontrados e corrigidos

O serviço de balcão não comparava prévia confirmada; foi estendida a proteção existente, inclusive categoria opcional na prévia. A nova tela normaliza os campos opcionais do schema ao chamar o contrato estrito, corrigindo erro do typecheck sem relaxar as regras.

Um teste inicial combinava mudança programática de sessão e navegação no mesmo ciclo, concorrendo com o redirecionamento já existente do acesso. Foi substituído pela jornada real: botão de entrada, dashboard e link do PDV. O fluxo de sessão existente não foi contornado ou mockado.

A primeira organização do contexto gerou um aviso adicional de Fast Refresh. Provider e hook/ações foram separados em arquivos, mantendo os nove avisos preexistentes sem desabilitar regras.

## Limitações e pendências

- Rascunho/última confirmação são locais e compartilhados pelo navegador, sem separação por operador, transações ou sincronização entre dispositivos. Abas simultâneas podem sobrescrever o atendimento; a trava protege a instância da tela, não concorrência distribuída.
- Pedido e rascunho usam chaves diferentes. Não há transação atômica/idempotência entre ambas em caso de falha de armazenamento, encerramento abrupto ou concorrência. Falhas de localStorage podem deixar estado apenas em memória, conforme mecanismo existente.
- Recarregar a confirmação não dispara registro. Isso não constitui idempotência garantida no servidor, que inexiste nesta fase.
- Troco só fica na última confirmação até “Nova venda”; o pedido não ganha dados financeiros auxiliares. Não existe histórico de caixa ou recebimento real.
- Rascunhos inválidos/corrompidos voltam ao estado inicial; não existe recuperação avançada. Dados principais de catálogo/pedidos mantêm sua validação estrutural anterior.
- Impressão e responsividade precisam de validação visual em navegador real. CSS de impressão e chamada nativa estão implementados, mas a saída real não foi homologada.
- Sem autenticação, backend, pagamento online, fiscal, estoque ou publicação. MVP frontend demonstrativo não é pronto para produção.

## Recomendações para Sprint 06

Priorizar homologação visual e ponta a ponta em desktop/tablet/celular com navegador disponível, incluindo impressão, console e recarga. Em escopo posterior autorizado, preparar contratos de backend com transações/idempotência/concorrência, validação e cálculo server-side, auth/RLS, migração de dados fictícios e proteção de dados reais. Não ativar serviços externos implicitamente.

## Estado final do Git

Working tree em `feature/pdv-balcao`, sem commit, push, merge, force push ou publicação nesta execução. Main local preservada. Árvore gerada atualizada somente pelo plugin TanStack.
