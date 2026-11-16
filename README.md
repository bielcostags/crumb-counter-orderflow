# Padaria Digital

Protótipo frontend para uma única padaria, iniciado no Lovable. O objetivo é oferecer cardápio digital e gestão demonstrativa de pedidos online e de balcão. Esta versão usa apenas dados fictícios no navegador e não é adequada para produção.

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
- Tailwind CSS v4, shadcn/ui, Radix e Lucide. Identidade visual em `src/styles.css`: marrom, caramelo, dourado, bege e verde; fontes Poppins e Inter.
- `src/routes/`: cardápio (`/`), carrinho (`/carrinho`), checkout (`/checkout`), acompanhamento (`/acompanhar`) e equipe (`/admin`). O arquivo `routeTree.gen.ts` é gerado pelo TanStack e não deve ser editado manualmente.
- `src/types/`: tipos de catálogo, carrinho e pedidos.
- `src/lib/orders.ts`: regras puras de validação, totais, fluxo de status e métricas.
- `src/services/contracts.ts`: contratos de catálogo, pedidos e restauração da demo.
- `src/services/local/`: implementação local dos contratos, com latência simulada de 250 ms.
- `src/lib/persistent-store.ts`: armazenamento externo consumido por `useSyncExternalStore`, persistido em localStorage e sincronizado entre abas do mesmo navegador.
- `src/components/admin/`: layout, dashboard, fila, detalhes, tabela compartilhada e coordenação de operações administrativas.
- `src/contexts/`: catálogo/serviços, carrinho e sessão demonstrativa. Durante SSR, os providers expõem estado de carregamento para evitar divergência de hidratação.
- `src/data/mock.ts`: quatro categorias, 12 produtos e 14 pedidos fictícios iniciais.
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

Produtos, categorias e atendimento de balcão aparecem como “Em breve”, sem links ou ações de cadastro nesta sprint. Os respectivos serviços locais continuam disponíveis para evolução futura. Veja [relatório da Sprint 03](docs/sprints/SPRINT-03.md).

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

## Validação da Sprint 03

A suíte completa passou com 65 testes em 5 arquivos, preservando os 46 casos da Sprint 02. Inclui sessão demo, indicadores reativos, filtros, detalhes, transições, confirmação de cancelamento/pagamento e integração checkout → equipe → acompanhamento. `bun run typecheck`, `bun run build` e `git diff --check` passaram; o lint terminou com zero erros e nove avisos preexistentes de Fast Refresh.

A revisão visual desktop/mobile foi tentada, mas o acesso ao navegador estava indisponível; essa verificação permanece pendente. Veja os detalhes e limitações no [relatório da Sprint 03](docs/sprints/SPRINT-03.md).

## Limitações e próximas etapas

- Nenhum Supabase, backend de negócios, autenticação real, estoque, emissão fiscal ou pagamento online foi conectado.
- Use somente dados fictícios. Pedidos e carrinho ficam em localStorage; apagar o armazenamento elimina as alterações locais. A sessão demo não constitui controle de acesso.
- O parser do store persistido verifica apenas a estrutura externa; validação profunda e recuperação de registros corrompidos ainda precisam ser tratadas.
- A sincronização entre abas não fornece transações: edições simultâneas podem sobrescrever dados. Não existe sincronização entre dispositivos.
- Os dados iniciais são criados ao iniciar/restaurar a demo; não mudam de dia automaticamente. Datas e métricas usam o fuso do navegador.
- A validação inicial não incluiu navegação ponta a ponta. A Sprint 02 adiciona integração de telas e navegação com TanStack Router em memória/jsdom, sem auditoria visual ou teste ponta a ponta em navegador real.
- Checkout/acompanhamento foram implementados na [Sprint 02](docs/sprints/SPRINT-02.md) e painel/fila administrativa na [Sprint 03](docs/sprints/SPRINT-03.md). A próxima etapa recomendada é o balcão na mesma fila, seguido da gestão de catálogo, conforme novo escopo.
- Antes de produção: backend com validação e cálculo server-side, numeração transacional, Supabase Auth, autorização por papéis/RLS, validação completa dos dados e proteção das informações pessoais.

## Integração Lovable

[Editor do projeto](https://lovable.dev/projects/8ccba599-ea7f-49d5-9f1f-1ee592d25409).

Siga `AGENTS.md`: preserve o histórico publicado, não edite arquivos gerados e delegue mudanças de banco/segredos ao Lovable. Esta etapa não publica nem envia commits para a branch conectada.
