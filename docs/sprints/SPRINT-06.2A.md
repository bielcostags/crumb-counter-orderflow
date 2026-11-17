# Sprint 06.2A — Configuração do Supabase próprio

Data: 17/11/2026. Branch: `feature/backend-supabase`. Base: `origin/main`, commit `e9c3a36` (merge da Sprint 06.1). Sem commit/push/merge/publicação nesta execução.

## Projeto utilizado e evidências

Projeto externo do proprietário **vila-rica-dev**, ref **yzxsuoxthkbzbkcumauz**, região **sa-east-1 (São Paulo)**. Plano Free informado pelo proprietário; não houve contratação ou alteração de plano. A API de gerenciamento confirmou nome/ref, região, estado ACTIVE_HEALTHY e PostgreSQL 17.11.0.018; config local usa major_version 17. O projeto antigo na Virginia não foi vinculado, consultado em banco ou alterado.

A CLI 3.1.0 já estava adicionada localmente pelo usuário em package.json/bun.lock, e supabase/config.toml e .gitignore estavam não rastreados. Essas alterações foram preservadas ao criar a branch a partir da main remota atualizada. O diretório .temp não foi versionado. A dependência oficial `supabase` permanece exclusivamente de desenvolvimento; nenhum SDK ou dependência de runtime foi instalado. O lockfile preparado pelo usuário foi verificado pelo Bun, sem atualização oportunista para CLI 3.2.0.

A CLI inicialmente precisou de permissão para gravar seu arquivo de telemetria fora do workspace; depois executou normalmente. A sessão autenticada já existia. `supabase link --project-ref yzxsuoxthkbzbkcumauz` concluiu e gravou o vínculo local; não foi necessário iniciar login interativo nem solicitar senha/token. A CLI identifica a instância principal hosted como `production`; isso não muda o propósito de desenvolvimento autorizado do projeto e não autoriza publicação.

## Compatibilidade com Lovable

O bloco gerenciado de AGENTS.md foi comparado com origin/main e preservado integralmente. A regra adicionada fora do bloco autoriza especificamente a administração independente deste Supabase externo e migrações em supabase/, com plano/dry run/aprovação antes de alterações remotas. A regra não autoriza modificar recursos de Lovable Cloud, desconectar integrações ou usar outro ref.

.lovable, configuração Vite, dependências Lovable, tratamento SSR, middleware de segurança e frontend permanecem intactos. Foram lidos README, AGENTS e todos os documentos da Sprint 06.1. Os documentos atuais de backend ganharam nota de transição para a exceção externa; os relatórios históricos continuam históricos.

## Alterações efetivas

- Preservada/verificada CLI oficial 3.1.0 de desenvolvimento e instalação pelo bun.lock.
- config.toml inicial adaptado: identificador local vila-rica-dev, API somente public (private não exposto), limite de retorno 100, auto-exposure desabilitada, seed desabilitado/sem sql_paths, Auth local sem signup ou login anônimo, senha mínima 12, origem local 8080 e sem redirects adicionais. Nenhum config push remoto.
- Duas migrações versionadas revisadas a partir da proposta da Sprint 06.1. A proposta incompleta não foi aplicada diretamente.
- Dez tabelas: profiles, categories, products, orders, order_items, order_status_history, payment_events; private.order_customer_data, private.order_tracking e private.idempotency_requests.
- FKs restritivas, valores em centavos dentro do limite seguro, quantidade 1–99, snapshots, subtotal gerado, identity concorrente, unicidade de origem/idempotência/token, timestamps, índices e RLS em todas as tabelas.
- Privilégios mínimos, papéis admin/atendente lidos de profiles ativo; catálogo público filtrado e acesso operacional apenas de funcionário ativo. Nenhuma conta/perfil/admin é criada; privilégio não vem de user_metadata/localStorage.
- Nas migrações preparadas, escrita de negócio bloqueada por grants/policies e vinte triggers ALWAYS, incluindo INSERT/UPDATE/DELETE/TRUNCATE nas dez tabelas. Não há RPCs de pedidos, pagamentos, importação ou alteração de perfil. Mesmo service_role não ganha escrita; owner/superusuário pode administrar DDL, portanto remoção de travas exige governança e migração futura autorizada.
- Scripts check/link/dry-run com ref fixo, sem operação de apply/reset, argumentos extras recusados e guard de vínculo antes de dry run.
- Exportação revisável de catálogo via createCatalogImportManifest(), sem conexão, pedido fictício ou localStorage. Preserva oito categorias, 57 produtos, imagens/preços e dois produtos de código 362. Não há importação automática ou executada.
- Preparada suíte pgTAP local com fixtures fictícias transacionais/rollback para grants, RLS, papéis, restrições e congelamento de escrita.

## Arquivos criados/modificados

Criados nesta sprint: `scripts/supabase/project.ts`, `cli.ts`, `export-catalog.ts`; `src/test/supabase-project.test.ts`; `supabase/README.md`; `supabase/migrations/20261117000100_backend_foundation.sql`; `supabase/migrations/20261117000200_read_policies.sql`; `supabase/tests/database/foundation.test.sql`; este relatório.

Arquivos locais do usuário preservados e complementados: package.json (CLI existente + quatro scripts), bun.lock (adição local da CLI preservada), supabase/config.toml e supabase/.gitignore. Modificados: .gitignore (ambientes com credenciais ignorados, template preservado), AGENTS.md (somente seção externa), tsconfig.json (typecheck dos scripts), .env.example (URL pública correta comentada, modo ainda local), README.md e os cinco documentos em docs/backend/ com nota sobre o projeto externo. Nenhum arquivo de UI, catálogo, regra de domínio, asset, chave ou store local foi alterado.

## Plano e dry run executado

O plano foi apresentado antes do dry run: fundação com bloqueio integral de escrita, seguida por políticas de leitura. Nenhum seed, conta, role adicional de banco ou alteração Vault foi proposto.

```sh
bunx --no-install supabase db push --remote=yzxsuoxthkbzbkcumauz --dry-run --skip-vault --agent yes
```

Resultado: sucesso, `dryRun: true`, duas migrações pendentes listadas, `seeds: []`, `roles: []`, alvo vila-rica-dev/ref autorizado. A CLI mostrou “migrations will not be pushed”. Nenhuma migração foi aplicada, nenhum db reset/config push/seed/repair foi executado. A CLI utiliza seu fluxo de login role para conexão; isso não é implantação das tabelas de negócio. O dry run não é execução/validação SQL e não comprova políticas RLS. Mudança futura nos arquivos requer novo dry run e revisão.

## Testes e validações

Antes das alterações: **188 testes aprovados em 12 arquivos**. Depois: **200 testes aprovados em 13 arquivos**, preservando todos os anteriores e acrescentando 12 testes do alvo/guard/comandos seguros. Novos casos bloqueiam ref ausente/incorreto, aceitam ref autorizado com newline, fixam alvo de link/dry run e recusam operações de escrita ou argumentos de aprovação anexados.

| Verificação                   | Resultado                                                         |
| ----------------------------- | ----------------------------------------------------------------- |
| bun install --frozen-lockfile | Aprovado, CLI instalada consistente com lockfile                  |
| bun run typecheck             | Aprovado, inclusive scripts da CLI                                |
| bun run lint                  | Aprovado: zero erros, nove avisos Fast Refresh preexistentes      |
| bun run test                  | 200 aprovados, 188 anteriores + 12 novos                          |
| bun run build                 | Aprovado, cliente/SSR/Nitro original Lovable                      |
| git diff --check              | Aprovado                                                          |
| bun run supabase:check        | Ref autorizado confirmado no cache local                          |
| bun run catalog:manifest      | JSON revisável 8/57, dois produtos 362, sem pedidos               |
| CLI link / gerenciamento      | Projeto correto confirmado e vinculado                            |
| Dry run remoto                | Sucesso; duas migrações listadas, nenhuma aplicada                |
| pgTAP / PostgreSQL local      | Tentado; ECONNREFUSED em 127.0.0.1:54322, ambiente não disponível |
| RLS / migrações reais         | Não executados em banco; pendentes                                |

Docker/psql/initdb/pg_ctl não foram encontrados no PATH inspecionado, e o banco local não respondeu. Não foi provisionado um servidor para contornar essa falta. Não foram executados testes de banco no remoto. Os 200 testes são de frontend/preparação, não comprovam RLS ou implantação. A suíte pgTAP foi escrita, mas não executada; requer stack local descartável compatível. Não houve homologação visual nova ou alteração de interface.

## Segurança e limites desta entrega

Nenhum database password, service_role, secret key ou token pessoal foi copiado para commits, logs, capturas ou este relatório. Não há cliente Supabase no frontend nem chave real em .env.example. Login utiliza armazenamento da CLI, fora do repositório; .temp/branches/envs/dumps são ignorados. O link não altera o comportamento local nem sincroniza configurações Auth.

A configuração Auth remota, inclusive signup, não foi alterada/confirmada como segura. Sem perfis ativos e sem escrita, a fundação não oferece autorização de equipe nem vendas remotas. Transações de negócio, triggers de integridade diferida, atualização de timestamps, auditoria administrativa, recuperação de idempotência/tokens e rate limit permanecem escopo posterior. Retenção/TTL/permissões finais ainda precisam de confirmação. Não remover a trava para importar catálogo antes desse fluxo ser revisado.

## Ações exatas do proprietário e próximas etapas

Não há pendência de login nesta máquina durante esta execução. Em outra máquina, executar `bunx --no-install supabase login` no próprio terminal/navegador e então `bun run supabase:link`; nunca compartilhar token/senha no chat. Detalhes em [supabase/README.md](../../supabase/README.md).

1. Disponibilizar Docker compatível local em execução; rodar `bunx --no-install supabase start` e `bunx --no-install supabase db test` **sem --remote**, para validar migrations/pgTAP em stack descartável. Não executar testes de fixtures no remoto.
2. Revisar os resultados SQL e corrigir eventuais problemas antes de liberar aplicação. O dry run não substitui essa validação.
3. Repetir `bun run supabase:check` e `bun run supabase:dry-run` após qualquer mudança, apresentar plano/arquivos finais e solicitar aprovação explícita para essas duas migrações no ref autorizado.
4. Somente depois da aprovação, aplicar a fundação e confirmar políticas/grants/bloqueios no projeto correto. Nenhum comando de aplicação foi executado ou autorizado implicitamente por esta sprint.
5. Em etapa posterior autorizada: configurar Auth remoto sem signup público, bootstrap administrativo controlado, operações transacionais e testes reais de segurança/idempotência; só então planejar importação idempotente por source_id e integração de frontend. Sem PDV/checkout real nesta etapa.

Git final: working tree de feature/backend-supabase com alterações preservadas e preparadas, main sem alteração, sem commit/push/merge/force push/publicação. Dados locais e integração Lovable preservados.
