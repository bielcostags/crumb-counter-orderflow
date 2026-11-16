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
- `src/routes/`: cardápio (`/`), carrinho (`/carrinho`), acompanhamento (`/acompanhar`) e equipe (`/admin`). O arquivo `routeTree.gen.ts` é gerado pelo TanStack e não deve ser editado manualmente.
- `src/types/`: tipos de catálogo, carrinho e pedidos.
- `src/lib/orders.ts`: regras puras de validação, totais, fluxo de status e métricas.
- `src/services/contracts.ts`: contratos de catálogo, pedidos e restauração da demo.
- `src/services/local/`: implementação local dos contratos, com latência simulada de 250 ms.
- `src/lib/persistent-store.ts`: armazenamento externo consumido por `useSyncExternalStore`, persistido em localStorage e sincronizado entre abas do mesmo navegador.
- `src/contexts/`: catálogo/serviços, carrinho e sessão demonstrativa. Durante SSR, os providers expõem estado de carregamento para evitar divergência de hidratação.
- `src/data/mock.ts`: quatro categorias, 12 produtos e 14 pedidos fictícios iniciais.
- `src/server.ts`, `src/start.ts` e `src/lib/error-*`: tratamento de falhas SSR e middleware CSRF do scaffold.

Os contratos facilitam uma futura implementação remota. A leitura reativa atual ainda depende diretamente do store local; a integração futura precisará adaptar os providers e a atualização dos dados, além de implementar os serviços.

## Estado funcional

O cardápio possui pesquisa, filtro por categoria e bloqueio de produtos indisponíveis. O carrinho permite alterar quantidades, remover itens e registrar observações por produto.

Os serviços já suportam pedidos online e de balcão na mesma coleção, alteração de status, pagamento demonstrativo e manutenção do catálogo. Essas operações ainda não possuem todas as telas: checkout, acompanhamento, login demonstrativo, dashboard, Kanban, produtos, categorias e balcão permanecem pendentes. As rotas de acompanhamento e equipe exibem avisos de construção.

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

## Limitações e próximas etapas

- Nenhum Supabase, backend de negócios, autenticação real, estoque, emissão fiscal ou pagamento online foi conectado.
- Use somente dados fictícios. Pedidos e carrinho ficam em localStorage; apagar o armazenamento elimina as alterações locais. A sessão demo não constitui controle de acesso.
- O parser do store persistido verifica apenas a estrutura externa; validação profunda e recuperação de registros corrompidos ainda precisam ser tratadas.
- A sincronização entre abas não fornece transações: edições simultâneas podem sobrescrever dados. Não existe sincronização entre dispositivos.
- Os dados iniciais são criados ao iniciar/restaurar a demo; não mudam de dia automaticamente. Datas e métricas usam o fuso do navegador.
- Os testes desta etapa não incluem navegação ponta a ponta nem auditoria visual no navegador.
- A próxima etapa funcional pode conectar checkout e acompanhamento aos serviços e implementar a fila administrativa. Essa implementação não faz parte desta validação.
- Antes de produção: backend com validação e cálculo server-side, numeração transacional, Supabase Auth, autorização por papéis/RLS, validação completa dos dados e proteção das informações pessoais.

## Integração Lovable

[Editor do projeto](https://lovable.dev/projects/8ccba599-ea7f-49d5-9f1f-1ee592d25409).

Siga `AGENTS.md`: preserve o histórico publicado, não edite arquivos gerados e delegue mudanças de banco/segredos ao Lovable. Esta etapa não publica nem envia commits para a branch conectada.
