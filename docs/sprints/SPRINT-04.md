# Sprint 04 — Gestão do cardápio

Data: 16/11/2026. Branch: `feature/gestao-cardapio`.

## Objetivo e escopo

Entregar gestão demonstrativa de produtos e categorias integrada ao cardápio público, com preservação dos pedidos históricos e revisão explícita de preços do carrinho. Sem banco, Supabase, autenticação real, uploads remotos, serviços pagos, balcão, estoque, fornecedores, fiscal, pagamentos online ou exclusões definitivas.

## Preparação e Git

Working tree inicialmente limpo em `feature/painel-administrativo`, commit `2c85c7d` (`painel admin`), também em `origin/feature/painel-administrativo`. As branches locais e referências remotas foram inspecionadas com `git branch -avv` (sem fetch); `origin/main` apontava para o merge `b089cbb`, enquanto main local permanecia em `2dde520`. Foi criada `feature/gestao-cardapio` diretamente da branch administrativa, como autorizado, sem alterar main nem descartar alterações do usuário.

Lidos AGENTS.md, README.md, VALIDACAO-MVP.md, SPRINT-02.md e SPRINT-03.md; revisados serviços, contratos, stores, contextos, tipos, catálogo público, carrinho, checkout, componentes e layout administrativo. `bun install --frozen-lockfile` concluiu sem alterar o lockfile; 65 testes passaram em 5 arquivos antes da implementação.

## Funcionalidades concluídas e aceite

- Rotas `/admin/produtos` e `/admin/categorias` integradas ao menu, título e estado ativo. Herdam a proteção demonstrativa de `/admin`. Apenas balcão continua identificado como futuro.
- Produtos: imagem, nome, descrição resumida, categoria, preço, disponibilidade e ações; cadastro/edição com formulário compartilhado, alternância de disponibilidade, pesquisa por nome/descrição, categoria, disponibilidade, ordenação por nome/preço em ambas direções, contagem e limpeza de filtros.
- Produto exige nome com ao menos dois caracteres, preço positivo em centavos como inteiro seguro e categoria existente. Novos produtos e transferências exigem categoria ativa; na edição é permitido manter a categoria inativa atual, com aviso. ID preservado.
- Imagem opcional, prévia usando ProductImage, galeria local ou HTTPS sem credenciais, validação de URL e fallback para ausência, erro de carregamento ou fonte inválida. Mudar a fonte permite recuperar uma prévia que falhou. Sem upload/base64.
- Categorias: nome, descrição, contagens de vinculados e individualmente disponíveis, situação e ações; cadastro/edição, pesquisa, situação e limpeza de filtros. Nomes normalizados, duplicatas rejeitadas, ordenação preservada.
- Desativação exige confirmação com quantidade de produtos afetados, tanto pela ação rápida quanto pela edição. Não exclui produtos nem altera sua disponibilidade individual ou pedidos históricos. Reativação restaura exposição dos produtos vendáveis.
- Quando não há categorias ativas, cadastro de produto fica bloqueado com orientação e link para categorias. Produtos existentes ainda podem ser editados mantendo a categoria atual inativa.
- Formulários têm validação, feedback, trava síncrona durante gravação, cancelamento e confirmação de descarte de alterações não salvas pelo fechamento do editor.
- Operações administrativas refletem no cardápio público reativo. Indisponíveis ficam bloqueados e categorias inativas são ocultadas. Os serviços continuam revalidando a vendabilidade ao registrar pedidos.
- Carrinho mostra preços atuais, avisos de itens indisponíveis e mudanças de preço; checkout exige revisão explícita dos preços alterados e permite voltar ao carrinho para remover itens inválidos.
- Registro online compara o resumo confirmado com os itens recalculados após a latência do serviço. Mudança durante o envio rejeita o pedido sem limpar o carrinho; exige nova revisão/confirmação.
- Snapshots e valores históricos ficam intactos, enquanto novas compras usam nomes/preços atuais. Persistência de catálogo testada por nova instância do store com o parser de produção.

## Decisões arquiteturais e regras

Schemas Zod e regras de atribuição de categoria/imagem ficam em `src/lib/catalog.ts`, usados pela UI e pelo serviço. A UI chama `saveProduct`, `setProductAvailable`, `saveCategory` e `setCategoryActive`; listas reativas vêm do StoreContext. Os métodos `listProducts`/`listCategories` existentes foram preservados e testados. Nenhuma UI manipula localStorage diretamente.

A edição de categoria salva campos/situação com `saveCategory` em uma única atualização local, precedida de confirmação quando desativa; a ação rápida usa `setCategoryActive`. Isso evita gravações parciais de nome/descrição e situação. Produtos e categorias mantêm a estrutura e os IDs existentes. Contagem de “disponíveis” representa a marcação individual do produto; categoria inativa bloqueia a venda de todos os vinculados, conforme aviso da tela.

`useCatalogMutation` centraliza trava, feedback e controle de processamento por página. `CatalogEditor` compartilha o modal e a confirmação de descarte; os formulários não foram duplicados entre cadastro e edição. A proteção demonstrativa continua sendo de navegação, não uma autenticação.

`CartLine` ganhou `reviewedPriceCents` opcional, apenas para detectar mudanças, sem alterar Product ou usar esse valor como fonte do total. Linhas legadas recebem referência atual na primeira leitura; isso não aceita mudanças pendentes em outras linhas. O valor anterior de carrinhos legados não pode ser reconstruído.

`createOnlineOrder` aceita a prévia como terceiro argumento opcional para compatibilidade com os consumidores anteriores. O checkout sempre passa a prévia. `assertOrderQuote` compara ID/nome/preço/quantidade/notas com os itens recalculados, além da revalidação de disponibilidade/categoria. Não é uma reserva de preço; rejeita mudanças entre apresentação e registro. Chamadas sem prévia mantêm o comportamento anterior. Valores são calculados com buildOrderItems/calcTotalCents e parseBRLToCents/centsToInput, sem cálculos monetários duplicados.

O parser existente do store foi extraído como `parseStoreData` para reutilização na carga inicial e no teste de reidratação; sua validação estrutural não foi ampliada para um esquema completo nesta sprint.

A identidade visual e React, TypeScript, TanStack Start/Router, Vite, Tailwind, shadcn/ui, Lucide, Recharts, Zod, Bun e Vitest foram mantidos, sem dependências novas.

## Arquivos criados e modificados

### Criados

- `docs/sprints/SPRINT-04.md`
- `src/components/admin/AdminCategories.tsx`
- `src/components/admin/AdminProducts.tsx`
- `src/components/admin/CatalogEditor.tsx`
- `src/components/admin/CatalogFeedback.tsx`
- `src/components/admin/CategoryDeactivateDialog.tsx`
- `src/components/admin/CategoryForm.tsx`
- `src/components/admin/CategoryTable.tsx`
- `src/components/admin/ProductForm.tsx`
- `src/components/admin/ProductTable.tsx`
- `src/components/admin/use-catalog-mutation.ts`
- `src/components/public/CartPriceNotice.tsx`
- `src/hooks/use-cart-price-review.ts`
- `src/lib/catalog.ts`
- `src/routes/admin.categorias.tsx`
- `src/routes/admin.produtos.tsx`
- `src/test/catalog-management.test.tsx`
- `src/test/catalog-service.test.ts`
- `src/test/helpers/catalog-router.tsx`

### Modificados

- `README.md`
- `src/components/admin/AdminLayout.tsx`
- `src/components/shared/ProductImage.tsx`
- `src/contexts/CartContext.tsx`
- `src/lib/orders.ts`
- `src/routeTree.gen.ts`
- `src/routes/carrinho.tsx`
- `src/routes/checkout.tsx`
- `src/services/contracts.ts`
- `src/services/local/index.ts`
- `src/services/local/store.ts`
- `src/test/admin-flow.test.tsx`
- `src/test/app-routing.test.tsx`
- `src/types/index.ts`

## Testes e resultados

Os 65 testes anteriores foram preservados. Um teste antigo que esperava Produtos como futuro foi atualizado para verificar Produtos como link disponível e Balcão como futuro, mantendo a cobertura de menu e sessão. O matching da árvore real inclui as duas novas rotas.

Novos testes usam componentes, contextos, rotas e serviços reais com TanStack Router em memória e jsdom. Somente a falha intencional de serviço é mockada para verificar recuperação; os serviços de catálogo usam sua implementação real. Testes de serviço usam timers controlados para a latência demonstrativa.

Cobertura: proteção das rotas e navegação; cadastro/edição de produtos e categorias; campos obrigatórios; preços inválidos e limites seguros; categoria inexistente/inativa e transferência; disponibilidade e reativação; pesquisa, filtros e ordenação; duplicatas e normalização; descarte de edição; desativação por ação/edição com confirmação; preservação de relacionamentos e histórico; alterações reativas no cardápio e carrinho; revisão de preços; bloqueio no checkout; mudança durante envio sem mutação e nova tentativa; inicialização de linhas legadas sem aceitar outras alterações; recarga do catálogo gravado com parser real; URLs inválidas e recuperação de imagem; falhas e prevenção de operações duplicadas.

| Verificação                     | Resultado                                                         |
| ------------------------------- | ----------------------------------------------------------------- |
| `bun install --frozen-lockfile` | Aprovado; sem alteração do lockfile                               |
| Testes antes de implementar     | 65 aprovados em 5 arquivos                                        |
| `bun run typecheck`             | Aprovado, código de saída 0                                       |
| `bun run lint`                  | Aprovado: 0 erros e 9 avisos preexistentes de Fast Refresh        |
| `bun run test`                  | 109 testes aprovados em 7 arquivos: 65 anteriores e 44 adicionais |
| `bun run build`                 | Aprovado: cliente, SSR e Nitro                                    |
| `git diff --check`              | Aprovado, sem erros de whitespace                                 |

Todos os comandos da tabela foram executados. O build manteve os avisos preexistentes do scaffold sobre `vite-tsconfig-paths` e `inlineDynamicImports`. O lockfile e as dependências permaneceram inalterados. Nenhum deploy foi executado.

## Problemas encontrados e corrigidos

Os serviços anteriores permitiam produto novo em categoria inativa e não validavam a imagem. As validações compartilhadas agora tratam ambos e diferenciam manter categoria atual de transferir para outra. Nome de categoria passa a remover espaços repetidos para prevenir duplicatas equivalentes.

ProductImage mantinha o estado de erro mesmo ao receber outra URL; o fallback agora se associa à fonte que falhou. O checkout recalculava valores sem comparar com a prévia confirmada; o serviço agora pode rejeitar essa divergência. A inicialização de referências monetárias de carrinhos antigos foi limitada a linhas sem referência, evitando aceitar silenciosamente outras alterações de preço.

O TypeScript identificou a diferença entre uma descrição opcional do schema e o contrato com exactOptionalPropertyTypes; o formulário normaliza a descrição ausente para string vazia ao chamar o serviço, sem relaxar o typecheck.

## Validação visual

Tentada revisão em navegador real para desktop/mobile, incluindo a administração da Sprint 03. Vite iniciou em `http://127.0.0.1:8081/` com a permissão necessária, pois 8080 estava ocupada. O acesso ao navegador retornou “The browser access host is unavailable”. Não foi possível capturar telas nem validar layouts em resoluções reais. O servidor iniciado foi encerrado; o serviço já existente em 8080 não foi alterado. Testes de DOM não substituem essa validação, que permanece pendente.

## Limitações e pendências

- LocalStorage e sessão demo mantêm as limitações anteriores: sem autenticação real, autorização, transações, garantia durável ou sincronização entre dispositivos. Erros de armazenamento podem deixar alterações apenas em memória.
- URLs remotas dependem de seus servidores, não são verificadas por download no cadastro e não representam upload. Falhas usam fallback; apenas imagens locais da galeria são aceitas por caminho.
- Revisão de preço não reserva valor nem resolve concorrência distribuída. A prévia protege o checkout atual, enquanto chamadas legadas sem terceiro argumento continuam recalculando pelo catálogo.
- Linhas de carrinho anteriores a esta sprint não têm preço histórico conhecido até a primeira leitura. O campo opcional mantém compatibilidade sem descartar os dados.
- Confirmação de descarte cobre os fechamentos do editor; fechar a aba/recarregar o navegador não preserva rascunhos.
- Validação estrutural profunda de dados persistidos e testes ponta a ponta/visuais em navegador real continuam pendentes.
- Não há exclusão definitiva, estoque, fornecedores, balcão, emissão fiscal, banco, Supabase, autenticação real, cobrança ou publicação.

## Recomendações para Sprint 05

Implementar atendimento de balcão com createCounterOrder, usando o catálogo e as regras atuais e alimentando a mesma fila. Priorizar revisão visual desktop/mobile e testes ponta a ponta quando o navegador estiver disponível. Antes de produção, planejar persistência transacional, auth/RLS, validação server-side e numeração/concorrência com backend autorizado.

## Estado final do Git

Alterações mantidas no working tree da branch `feature/gestao-cardapio`. Sem commit, push, merge, force push ou publicação nesta execução. Main local preservada; routeTree.gen.ts atualizado somente pelo gerador TanStack.
