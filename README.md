# Vila Rica — Padaria e Confeitaria Artesanal

Sistema frontend personalizado para Vila Rica — Padaria e Confeitaria Artesanal, iniciado no Lovable. Cardápio comercial conforme o texto fornecido pelo proprietário, com pedidos/clientes fictícios, gestão online e de balcão em ambiente demonstrativo local. Não é adequado para produção.

## Identidade Vila Rica e catálogo inicial

A Sprint 05.1 mantém os módulos e regras das cinco sprints e aplica identificação comercial, tokens de cores e o catálogo Vila Rica. São 8 categorias e 57 produtos: Lanches (4), Sanduíches (10), Tapiocas (7), Crepiocas (2), Cuscuz (5), Capuccinos (10), Sucos (4) e Adicionais (15). Preços em centavos, IDs novos e disponibilidade inicial apenas para a demo. Os pedidos de exemplo foram adaptados ao novo catálogo, sem representar vendas reais.

A logomarca e as quatro páginas do cardápio foram recebidas posteriormente na conversa. A conferência visual confirmou os 57 itens e preços, incluindo o código 362 duplicado. A logo oficial está em `public/images/brand/logo.jpeg` e é usada no cabeçalho público, acesso/menu administrativo, destaque do cardápio e comprovante. A imagem original é preservada sem recorte, filtros ou distorção, com `object-contain`, dimensões 1600×1333 e texto alternativo. A identificação textual permanece como apoio e fallback. Favicon oficial também está pendente. Todos os novos produtos usam placeholders; a galeria existente permanece disponível e suas fotos são identificadas como ilustrativas.

O código comercial 362 consta em Chocolate Quente (R$ 13,00) e Moça Expresso (R$ 10,00). Ambos foram preservados com IDs internos distintos; confirmar a duplicidade com o proprietário. Códigos e todos os preços estão em [catálogo Vila Rica](docs/catalogo-vila-rica.md), sem novo campo de SKU no modelo.

O catálogo existente no navegador não é migrado, sobrescrito ou limpo automaticamente. Para conhecer o novo seed sem perder dados, prefira um perfil de navegador novo. A restauração deliberada pelo serviço existente descarta produtos/categorias/pedidos locais e limpa o carrinho público; o procedimento e o cuidado com o rascunho do PDV estão documentados no [catálogo](docs/catalogo-vila-rica.md#restauração-deliberada-no-ambiente-local). Nenhuma restauração foi executada nos dados do usuário nesta sprint.

Os avisos de demonstração, sessão sem autenticação real e comprovante não fiscal permanecem conforme o escopo de personalização. Não houve alteração das regras de pedidos, pagamentos, adicionais, preços ou persistência.

A validação da personalização passou com **162 testes em 10 arquivos** (146 anteriores + 16 novos), typecheck e build aprovados, lint sem erros e com nove avisos preexistentes. Revisão visual em navegador permanece pendente; a logo oficial já está integrada. Veja [Sprint 05.1](docs/sprints/SPRINT-05.1.md).

## Execução com Bun

Use Bun 1.4.4 (versão utilizada nesta validação) e Node.js 24 para os scripts das ferramentas. O `bun.lock` existente é a referência das dependências; não é necessário gerar lockfile npm.

```sh
bun install --frozen-lockfile
bun run dev
```

Verificações locais:

```sh
bun run typecheck
bun run lint
bun run test
bun run build
bun run preview
```

`bun run test` executa Vitest, com jsdom e Testing Library disponíveis. O comando `bun test` usa outro executor e não substitui esta configuração. O build gera artefatos em `.output/`; executá-lo não publica a aplicação.

## Arquitetura

- React 19 e TypeScript, com TanStack Start/Router para SSR e rotas por arquivo.
- Tailwind CSS v4, shadcn/ui, Radix e Lucide. Identidade visual em `src/styles.css`: oliva #2B3E1E, marrom #4C2F11, dourado #E4A326, creme #F1EAE4, amarelo #F0D6A4 e vinho #680D0D; fontes Poppins e Inter.
- `src/routes/`: cardápio (`/`), carrinho (`/carrinho`), checkout (`/checkout`), acompanhamento (`/acompanhar`) e equipe (`/admin`). O arquivo `routeTree.gen.ts` é gerado pelo TanStack e não deve ser editado manualmente.
- `src/types/`: tipos de catálogo, carrinho e pedidos.
- `src/lib/catalog.ts`: schemas Zod, normalização, validação de imagens e atribuição de categorias.
- `src/lib/orders.ts`: regras puras de validação, totais, fluxo de status e métricas.
- `src/services/contracts.ts`: contratos de catálogo, pedidos e restauração da demo.
- `src/services/local/`: implementação local dos contratos, com latência simulada de 250 ms.
- `src/lib/persistent-store.ts`: armazenamento externo consumido por `useSyncExternalStore`, persistido em localStorage e sincronizado entre abas do mesmo navegador.
- `src/components/admin/`: layout, dashboard, fila, detalhes, tabela compartilhada e coordenação de operações administrativas.
- `src/contexts/`: catálogo/serviços, carrinho e sessão demonstrativa. Durante SSR, os providers expõem estado de carregamento para evitar divergência de hidratação.
- `src/data/mock.ts`: oito categorias, 57 produtos Vila Rica e 14 pedidos fictícios iniciais. As fixtures técnicas do catálogo anterior ficam em `src/test/fixtures/catalog.ts`.
- `src/server.ts`, `src/start.ts` e `src/lib/error-*`: tratamento de falhas SSR e middleware CSRF do scaffold.

Os contratos facilitam uma futura implementação remota. A leitura reativa atual ainda depende diretamente do store local; a integração futura precisará adaptar os providers e a atualização dos dados, além de implementar os serviços.

## Estado funcional

O cardápio possui pesquisa, filtro por categoria e bloqueio de produtos indisponíveis. O carrinho permite alterar quantidades, remover itens e registrar observações por produto.

O fluxo online está disponível: cardápio → carrinho → `/checkout` → confirmação → `/acompanhar?numero=1015` (exemplo de número). O checkout valida os dados com `checkoutSchema`, mostra o resumo e usa `createOnlineOrder`, que revalida preços, quantidades e disponibilidade antes do registro. Durante o envio, os campos ficam bloqueados e uma trava síncrona impede submissões repetidas. O carrinho é limpo pelo serviço somente após a criação bem-sucedida; erros preservam os itens e permitem nova tentativa.

A confirmação mostra o número, itens, total, recebimento, pagamento e status, com links para acompanhamento e cardápio. O acompanhamento consulta os pedidos do store reativo pelo número, mostra status, linha do tempo e histórico, inclusive cancelamento, sem renderizar nome, telefone, endereço ou observações potencialmente pessoais. Alterações locais são refletidas sem recarregar. A consulta é local e não sincroniza entre dispositivos.

Para experimentar, adicione produtos disponíveis, finalize com nome/telefone fictícios e escolha retirada ou entrega (com endereço fictício). O pagamento é apenas uma seleção de como pagar ao receber: não existe cobrança online. A consulta também permite ver os pedidos fictícios iniciais, números 1001 a 1014. Não há estimativas de entrega.

A área da equipe está disponível em `/admin`, com acesso demonstrativo em `/admin/acesso` e fila em `/admin/pedidos`. Não há senha ou autenticação real: o botão de entrada grava a sessão demo existente no navegador. Sair encerra essa sessão e as rotas administrativas redirecionam para o acesso no fluxo normal da interface. Isso não constitui segurança de produção.

O dashboard exibe indicadores de hoje, evolução dos últimos sete dias com Recharts, origem, distribuição por status e pedidos recentes. Os valores vêm do estado atual, com exclusão de cancelados dos totais de pedidos/vendas e distinção entre valor pedido e valor pago. A data usa o fuso do navegador e é atualizada enquanto a tela fica aberta.

A fila permite alternar Kanban/lista e filtrar por número ou cliente, status, origem, recebimento, pagamento e data local de criação. Os detalhes administrativos mostram os dados fictícios do cliente, itens, observações e histórico. As ações usam os serviços existentes para avançar somente uma etapa, cancelar com confirmação e marcar como pago com confirmação. Operações em processamento ficam bloqueadas. Pedidos finais não avançam nem são cancelados; o recebimento demonstrativo é independente do preparo e pode ser registrado após a conclusão, caso ainda esteja pendente. Pagamento já registrado ou pedido cancelado não aceita novo recebimento.

O cancelamento preserva os dados e, se o pedido estiver pago, mantém essa marcação sem estorno. Esse pedido deixa de compor as vendas pagas do dashboard. Nenhuma cobrança ou movimentação financeira real ocorre.

Produtos e categorias estão disponíveis em `/admin/produtos` e `/admin/categorias`, protegidos pelo mesmo acesso demonstrativo. O PDV está disponível em `/admin/balcao`, com a mesma proteção demonstrativa.

Produtos: cadastro/edição, preço em reais convertido para centavos, descrição, categoria, imagem e disponibilidade; pesquisa por nome/descrição, filtros por categoria/disponibilidade e ordenação por nome/preço. Novos produtos e transferências exigem categoria ativa; a edição pode manter a categoria inativa atual, com aviso de venda bloqueada. Não há exclusão definitiva.

Categorias: cadastro/edição, pesquisa, filtro de situação e contagens de produtos vinculados/individualmente disponíveis. Nomes são normalizados e duplicatas são rejeitadas. Desativação exige confirmação com a quantidade afetada, inclusive pela edição, preservando produtos e pedidos. Reativação não muda a disponibilidade individual dos produtos. Edição preserva ID e ordenação.

Imagens podem ser escolhidas na galeria local ou informadas por URL HTTPS sem credenciais. Outros protocolos, base64 e caminhos locais desconhecidos são rejeitados. A prévia e o cardápio usam `ProductImage`, com fallback e recuperação ao mudar a fonte. Imagens remotas dependem da disponibilidade dos servidores de origem; não há upload nem armazenamento remoto.

Os formulários bloqueiam envios repetidos e pedem confirmação ao fechar com alterações não salvas. As operações usam os serviços de catálogo e atualizam o estado compartilhado; nenhum componente acessa localStorage diretamente. Veja [relatório da Sprint 04](docs/sprints/SPRINT-04.md).

## Atendimento no balcão

O PDV tem pesquisa por nome/descrição, categorias ativas, grade de produtos e pedido atual independente do carrinho público. Itens repetidos são consolidados, com quantidades de 1 a 99, observações por item, remoção, nome fictício opcional e observações gerais. Não exige cadastro, CPF, telefone ou endereço.

Ao finalizar, a equipe revisa o resumo, escolhe Pix/dinheiro/cartão e pagamento pendente/recebido. Dinheiro recebido permite informar valor entregue opcional, validado em centavos, com troco não negativo. Trocar forma ou situação limpa esse campo. Valor entregue e troco são auxiliares do atendimento; não alteram o total da venda ou o faturamento.

O serviço `createCounterOrder` revalida itens, disponibilidade e categoria e recebe a prévia confirmada. Nome/preço/categoria alterados exigem revisão; mudanças durante a latência rejeitam o registro, preservando o pedido para nova tentativa. O pedido usa o modelo Order e a mesma sequência/fila dos pedidos online: origem balcão, retirada, status pendente, pagamento escolhido e snapshots dos itens.

O rascunho completo e a referência da última venda são persistidos em `padaria-digital:demo:counter-cart:v1`, separadamente do carrinho público. Navegar, sair e entrar na sessão demo não descarta o atendimento, que é compartilhado neste navegador, não por operador. Limpar exige confirmação. Após sucesso, os itens são limpos e a confirmação/comprovante continuam acessíveis ao retornar/recarregar; nenhuma venda é enviada automaticamente. “Nova venda” inicia o próximo atendimento. O troco auxiliar fica associado apenas à última confirmação, sem novo campo no modelo Order.

A confirmação oferece acesso aos pedidos e aos detalhes existentes. O comprovante tem a identificação “COMPROVANTE DEMONSTRATIVO — SEM VALOR FISCAL” e botão de impressão nativa com CSS específico. Não há integração fiscal, impressora térmica ou processamento financeiro. A impressão real ainda requer validação no navegador.

Pedidos de balcão seguem pendente → em preparação → pronto → concluído; podem ser cancelados ou pagos depois pelos serviços existentes. O dashboard distingue valores registrados/pagos e agrupa vendas pagas pela data de criação do pedido. Veja [Sprint 05](docs/sprints/SPRINT-05.md) e [estado consolidado do MVP frontend](docs/MVP-FRONTEND.md).

## Regras de pedidos

- Preços e totais são inteiros seguros em centavos; não são aceitos preços negativos, zero ou fracionários nos itens.
- Cada item guarda o nome e o preço do catálogo no momento da criação. Alterações futuras no catálogo não alteram pedidos anteriores.
- Pedidos exigem ao menos um item, produtos existentes e disponíveis em categorias ativas, quantidades inteiras entre 1 e 99 e uma única linha por produto.
- O checkout exige nome fictício e telefone com 10 ou 11 dígitos; entrega exige endereço com ao menos oito caracteres. Isso é validação demonstrativa, não verificação de endereço ou telefone.
- Pagamentos disponíveis: Pix, dinheiro e cartão, sem processamento financeiro. O serviço de balcão também valida seus dados em runtime.
- Retirada: pendente → em preparação → pronto → concluído.
- Entrega: pendente → em preparação → pronto → saiu para entrega → concluído.
- Cancelamento é permitido antes de um estado final. Pedidos concluídos/cancelados não avançam; cancelados não podem ser marcados como pagos.
- Números são sequenciais dentro do estado local. Não há garantia transacional entre abas/dispositivos.
- Métricas excluem cancelados dos pedidos válidos e distinguem valor pedido de valor marcado como pago. O ticket médio usa pedidos válidos, pagos ou não, pela data de criação no fuso do navegador.

## Testes e validação desta etapa

Branch de trabalho: `test/validacao-mvp`. Dependências instaladas/verificadas com `bun install --frozen-lockfile`, sem alteração do lockfile.

A suíte cobre roteamento básico, snapshot e totais, limites de quantidade, indisponibilidade, categoria inativa, duplicidade, preços inválidos/overflow, conversão monetária, checkout, matriz de transições, numeração, métricas e integração dos serviços locais (fila compartilhada, limpeza do carrinho, rejeições sem mutação, histórico e pagamento).

O build e o typecheck iniciais já passavam; o lint inicial apresentou 86 erros de formatação. As correções de formatação preservam os elementos, classes e identidade visual. Foram corrigidos o tratamento de ponto decimal em preços, validação dos pedidos de balcão, linhas duplicadas e limites de representação monetária. Os nove avisos existentes de Fast Refresh vêm de arquivos que exportam componentes e hooks/variantes juntos; não impedem o lint ou o build.

O build pode emitir avisos do scaffold sobre `vite-tsconfig-paths` e `inlineDynamicImports`. Os plugins são geridos pela configuração Lovable e não foram duplicados ou removidos.

## Revisão de preços e integridade

O carrinho sempre calcula com o catálogo atual. O preço visto ao adicionar/revisar um item fica em `reviewedPriceCents`, um campo opcional compatível com carrinhos antigos. Mudanças são mostradas com preço anterior/atual, e o checkout exige clicar em “Revisei os preços atualizados”. Para linhas legadas sem referência de preço, a primeira leitura estabelece a referência atual; não é possível reconstruir o preço visto antes desta sprint.

O checkout passa a prévia confirmada como terceiro argumento opcional de `createOnlineOrder`. Após a latência simulada, o serviço refaz os itens pelo catálogo e compara essa prévia; mudanças em nome, quantidade, notas ou preço rejeitam o registro, preservam o carrinho e exigem revisão/nova confirmação. Essa verificação evita alteração silenciosa durante o envio; não reserva preço nem representa transação entre dispositivos. Chamadas legadas sem prévia continuam recalculando com o catálogo atual.

Itens indisponíveis ou em categorias inativas são identificados no carrinho e bloqueiam a confirmação pelo serviço. Podem ser removidos ou revisados. Pedidos históricos mantêm seus snapshots e totais mesmo após alterações de catálogo.

## Validação da Sprint 03

A suíte completa passou com 65 testes em 5 arquivos, preservando os 46 casos da Sprint 02. Inclui sessão demo, indicadores reativos, filtros, detalhes, transições, confirmação de cancelamento/pagamento e integração checkout → equipe → acompanhamento. `bun run typecheck`, `bun run build` e `git diff --check` passaram; o lint terminou com zero erros e nove avisos preexistentes de Fast Refresh.

A revisão visual desktop/mobile foi tentada, mas o acesso ao navegador estava indisponível; essa verificação permanece pendente. Veja os detalhes e limitações no [relatório da Sprint 03](docs/sprints/SPRINT-03.md).

## Validação da Sprint 04

Os 65 testes anteriores foram preservados e a suíte completa passou com 109 testes em 7 arquivos (44 casos adicionais). Foram executados instalação com lockfile congelado, typecheck, lint, testes, build e `git diff --check`. Lint: zero erros e nove avisos preexistentes; demais verificações aprovadas. A revisão visual desktop/mobile foi tentada novamente, mas o acesso ao navegador continuava indisponível. Veja o [relatório completo da Sprint 04](docs/sprints/SPRINT-04.md).

## Validação da Sprint 05

A suíte completa passou com 146 testes em 9 arquivos: 109 anteriores e 37 novos, cobrindo PDV, pagamentos/troco, persistência independente, revisão do catálogo, fila/indicadores e regressões anteriores. Instalação com lockfile congelado, typecheck, build e diff passaram; lint teve zero erros e nove avisos preexistentes. A homologação visual desktop/tablet/celular e impressão real continuam pendentes porque o acesso ao navegador estava indisponível. Veja [Sprint 05](docs/sprints/SPRINT-05.md) e [MVP frontend consolidado](docs/MVP-FRONTEND.md).

## Limitações e próximas etapas

- Nenhum Supabase, backend de negócios, autenticação real, estoque, emissão fiscal ou pagamento online foi conectado.
- Use somente dados fictícios. Pedidos e carrinho ficam em localStorage; apagar o armazenamento elimina as alterações locais. A sessão demo não constitui controle de acesso.
- O parser do store persistido verifica apenas a estrutura externa; validação profunda e recuperação de registros corrompidos ainda precisam ser tratadas.
- A sincronização entre abas não fornece transações: edições simultâneas podem sobrescrever dados. Não existe sincronização entre dispositivos.
- Os dados iniciais são criados ao iniciar/restaurar a demo; não mudam de dia automaticamente. Datas e métricas usam o fuso do navegador.
- A validação inicial não incluiu navegação ponta a ponta. A Sprint 02 adiciona integração de telas e navegação com TanStack Router em memória/jsdom, sem auditoria visual ou teste ponta a ponta em navegador real.
- Checkout/acompanhamento foram implementados na [Sprint 02](docs/sprints/SPRINT-02.md), painel/fila administrativa na [Sprint 03](docs/sprints/SPRINT-03.md) e gestão de cardápio na [Sprint 04](docs/sprints/SPRINT-04.md). O PDV foi integrado na [Sprint 05](docs/sprints/SPRINT-05.md). A próxima etapa recomendada é homologação visual/ponta a ponta e preparação dos contratos para backend, conforme novo escopo.
- Antes de produção: backend com validação e cálculo server-side, numeração transacional, Supabase Auth, autorização por papéis/RLS, validação completa dos dados e proteção das informações pessoais.

## Integração Lovable

[Editor do projeto](https://lovable.dev/projects/8ccba599-ea7f-49d5-9f1f-1ee592d25409).

Siga `AGENTS.md`: preserve o histórico publicado, não edite arquivos gerados e delegue mudanças de banco/segredos ao Lovable. Esta etapa não publica nem envia commits para a branch conectada.
