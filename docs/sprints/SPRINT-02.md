# Sprint 02 — Checkout e acompanhamento online

Data: 16/11/2026. Branch: `feature/checkout-acompanhamento`.

## Objetivo e base

Completar a realização e consulta de pedidos online com dados fictícios e serviços locais existentes, preservando React, TypeScript, TanStack Start/Router, Vite, Tailwind, shadcn/ui, Lucide, Bun e Vitest.

A branch foi criada a partir de `test/validacao-mvp`, no commit `0a87edc` (`validador-mvp`). O working tree estava limpo antes da implementação. Foram lidos AGENTS.md, README.md e VALIDACAO-MVP.md e revisados rotas, contratos, providers, persistência, tipos, regras e serviços locais. Nenhuma alteração local foi descartada. Não houve alteração direta de main, commit, push, merge ou publicação nesta sprint.

## Funcionalidades e critérios de aceite

- Carrinho permite navegar para a nova rota `/checkout` e retornar para revisão.
- Formulário com nome, telefone com DDD, retirada/entrega, endereço condicional, Pix/dinheiro/cartão ao receber e observações gerais.
- Resumo com produtos, quantidades, observações por item e total em BRL; indisponibilidade e outras inconsistências impedem a confirmação.
- `checkoutSchema` reaproveitado para validação; erros associados aos campos, foco no primeiro campo inválido e estados de envio acessíveis.
- `createOnlineOrder` reaproveitado para revalidar catálogo, preços e quantidades, criar número sequencial local, guardar snapshots e registrar status e pagamento pendentes.
- Trava síncrona com ref e botão/campos desabilitados durante envio evitam duplicação por múltiplos cliques/submits na mesma tela.
- Serviço limpa carrinho somente após sucesso; erro mantém itens e permite repetir a tentativa.
- Confirmação apresenta mensagem de sucesso, número, resumo, total, recebimento, pagamento e status, com links para consulta e cardápio. Não há cobrança nem estimativas de entrega.
- Consulta pelo número, inclusive link direto com `?numero=`, com validação do parâmetro e do formulário.
- Resumo público reutilizável omite nome, telefone, endereço e observações potencialmente pessoais.
- Acompanhamento exibe linha do tempo por tipo de recebimento e histórico real dos eventos; trata número inválido, pedido inexistente e cancelado.
- Dados lidos do `StoreContext` reativo; mudanças locais (inclusive notificações entre abas do mesmo navegador) atualizam a consulta sem polling. O aviso esclarece a ausência de sincronização entre dispositivos.
- Layout público, componentes, paleta, fontes, responsividade e idioma existentes preservados. Estados vazios, carregamento e feedback foram mantidos/adicionados.

## Regras de negócio preservadas

Carrinho vazio, itens indisponíveis, categorias inativas e quantidades inválidas não podem gerar pedidos. Nome e preço dos itens são snapshots do catálogo, com cálculo em centavos. Endereço é exigido somente para entrega. Pagamento permanece pendente até alteração demonstrativa futura.

Retirada segue pendente → em preparação → pronto → concluído. Entrega inclui saiu para entrega antes de concluído. O acompanhamento usa `getStatusFlow` e os eventos persistidos, sem alterar status publicamente. As transições permanecem sob validação do serviço existente.

## Arquivos criados

- `src/routes/checkout.tsx`: formulário, prévia, envio, erros e confirmação.
- `src/components/public/OrderSummary.tsx`: resumo público compartilhado.
- `src/test/checkout-flow.test.tsx`: testes de telas, integração e navegação.
- `docs/sprints/SPRINT-02.md`: este relatório.

## Arquivos modificados

- `src/routes/carrinho.tsx`: link de finalização.
- `src/routes/acompanhar.tsx`: consulta, parâmetro validado, resumo, linha do tempo e histórico.
- `src/test/order-service.test.ts`: revalidação online, consulta e fluxos completos de status.
- `src/test/app-routing.test.tsx`: cobertura das rotas públicas envolvidas.
- `src/routeTree.gen.ts`: atualizado automaticamente pelo plugin TanStack durante o build, sem edição manual.
- `README.md`: arquitetura, uso e estado funcional atualizados.

## Testes e resultados

Antes de implementar: `bun install --frozen-lockfile` concluído sem mudanças no lockfile; os 30 testes existentes passaram em 3 arquivos.

A cobertura nova exercita checkout válido/inválido, retirada sem endereço, entrega sem endereço e com endereço, carrinho vazio, produto indisponível, total, registro e pagamento pendentes, limpeza após sucesso, preservação após erro, nova tentativa, submissões duplicadas, consulta existente/inexistente/inválida, privacidade do resumo, atualização reativa, cancelamento, fluxo completo de retirada/entrega e navegação carrinho → checkout → acompanhamento. Os testes originais foram preservados e ampliados.

A navegação usa os componentes reais das rotas, providers e serviços locais, com um shell simplificado e TanStack Router em memória no jsdom. O matching adicional usa a árvore gerada real. Não substitui teste visual/ponta a ponta em navegador.

| Verificação final               | Resultado                                                 |
| ------------------------------- | --------------------------------------------------------- |
| `bun install --frozen-lockfile` | Aprovado, lockfile preservado                             |
| `bun run typecheck`             | Aprovado                                                  |
| `bun run lint`                  | Aprovado: 0 erros, 9 avisos preexistentes de Fast Refresh |
| `bun run test`                  | 46 testes aprovados em 4 arquivos (16 casos adicionais)   |
| `bun run build`                 | Aprovado: cliente, SSR e Nitro                            |
| `git diff --check`              | Aprovado                                                  |

O build manteve os avisos preexistentes de `vite-tsconfig-paths` e `inlineDynamicImports` do scaffold Lovable. Não houve alteração no lockfile nem na configuração dos plugins. Todos os comandos da tabela foram executados; o typecheck e o build finalizaram com código de saída zero.

## Problemas encontrados e corrigidos

O checkout e o acompanhamento eram placeholders. A primeira execução dos novos testes encontrou uma consulta ambígua ao link de acompanhamento (também presente no cabeçalho); o teste foi ajustado para clicar no link com o número do pedido confirmado. O typecheck apontou acessos por ponto a propriedades de índice e opções de componentes potencialmente indefinidas nos testes; foram corrigidos conforme a configuração estrita do projeto. Não foram desabilitadas regras de lint ou TypeScript.

## Limitações e pendências

- Persistência demonstrativa em localStorage. Falhas de gravação são registradas pelo store existente e podem manter dados apenas em memória; não há garantia durável de banco.
- Numeração é única na sequência do store local. Não há transação/idempotência entre abas, dispositivos ou sessões concorrentes; a trava de submissão é por instância do formulário.
- Dados persistidos ainda têm validação estrutural superficial. Não é uma aplicação de produção.
- Confirmação fica no estado da tela. Recarregar após o sucesso mostra o carrinho vazio; o pedido continua consultável pelo número em acompanhamento.
- Telefone/endereço ficam nos dados fictícios locais, mas não são renderizados na consulta pública. O armazenamento demonstrativo não é um mecanismo de segurança ou autorização.
- Sem Supabase, banco real, autenticação real, serviços pagos, cobrança ou painel administrativo.
- Sem validação visual em navegador real nesta sprint. As datas seguem o fuso do navegador.

## Próxima sprint recomendada

Implementar entrada demonstrativa da equipe e fila Kanban reutilizando os serviços atuais, com confirmação de cancelamento e pagamento demonstrativo. Em seguida, conectar o registro de balcão à mesma fila e acrescentar teste ponta a ponta em navegador e revisão responsiva. Backend, auth/RLS e cálculo server-side ficam para fase futura explicitamente autorizada.
