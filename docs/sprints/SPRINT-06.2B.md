# Sprint 06.2B — Validação PostgreSQL e plano de implantação

> Nota de atualização em 17/11/2026 — Sprint 06.3: as duas migrações de fundação foram aplicadas após autorização na interação posterior à entrega pré-implantação; a 06.2C reconfirmou o histórico e dry run vazio. Esses fatos históricos são preservados abaixo. A nova migração 00300 de perfis está somente preparada/testada localmente e não foi aplicada no hospedado. Autenticação remota não foi ativada. Ver [Sprint 06.3](SPRINT-06.3.md).

Data: **17/11/2026** (America/Porto_Velho). Branch: `feature/backend-validacao-postgresql`, criada de `origin/main` atualizada em `fecb370` (PR #7). Working tree inicialmente limpo. Nenhum commit, push, merge, force push, publicação ou aplicação de migração remota nesta execução.

## Resultado e fronteira de autorização

A fundação existente foi auditada e validada no PostgreSQL **local**. Não foi necessário corrigir as duas migrações nem alterar a modelagem. Os 34 testes anteriormente executados pelo proprietário foram reproduzidos com sucesso; uma nova suíte acrescentou 87 verificações, totalizando **121 testes SQL aprovados em dois arquivos**. Os **200 testes da aplicação** também passaram.

O remoto permanece sem as migrações. Foram realizadas apenas inspeções de metadados/histórico e dry run, usando o alvo explícito `yzxsuoxthkbzbkcumauz`. A aplicação real exige aprovação explícita do proprietário para os arquivos e hashes abaixo. Esta etapa termina antes dessa aplicação.

## Preparação e ambiente

Lidos AGENTS.md, README.md, ARQUITETURA, MODELAGEM, PROPOSTA-SQL, SEGURANCA, MIGRACAO, relatórios 06.1/06.2A, supabase/README.md, migrações e testes. A exceção específica ao Supabase externo foi respeitada; bloco gerenciado e todos os recursos do Lovable permanecem intactos.

Docker Desktop estava funcionando, com os containers da stack `vila-rica-dev` em execução. A primeira chamada da CLI falhou porque `docker` não estava no PATH do processo; a repetição com `/Applications/Docker.app/Contents/Resources/bin` no PATH daquele comando funcionou. Não houve instalação, alteração de configuração global de shell, reset ou reinicialização da stack do proprietário.

Comando local efetivamente utilizado, sem `--remote`:

```sh
env PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" bunx --no-install supabase db test --agent yes
```

O alvo anunciado foi `local stack (127.0.0.1:54322)`. O PostgreSQL local respondeu versão **17.11**. Nenhuma fixture de teste foi executada no hospedado. Os testes usam transações e rollback; os dados locais de navegador e os volumes Docker foram preservados.

## Auditoria do conjunto SQL

Arquivos revisados: `20261117000100_backend_foundation.sql` e `20261117000200_read_policies.sql`. Permanecem idênticos aos arquivos integrados pelo PR #7.

| Área                 | Constatação / evidência                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Estrutura            | Dez tabelas: sete public e três private; dez PKs                                                                                           |
| Relações             | FKs RESTRICT sem exclusão em cascata histórica; vínculo circular de idempotência com FK deferida                                           |
| Valores              | bigint em centavos, intervalo seguro JS, quantidade 1–99, subtotal STORED gerado e total positivo                                          |
| Numeração            | GENERATED ALWAYS identity única; sem MAX+1 remoto; lacunas são permitidas                                                                  |
| Origem               | source_id único para importação futura; commercial_code deliberadamente não único; dois 362 preservados                                    |
| Histórico            | Sem permissões de edição/exclusão; congelamento de escrita nas dez tabelas impede mutação de snapshots                                     |
| RLS                  | Habilitada nas dez tabelas; nove policies de leitura; nenhuma policy de escrita/ALL                                                        |
| Bloqueios            | Vinte triggers ALWAYS (linha para INSERT/UPDATE/DELETE e statement para TRUNCATE)                                                          |
| Owners               | profiles pertence a postgres; helpers pertencem ao mesmo owner confiável                                                                   |
| SECURITY DEFINER     | Apenas helpers de leitura is_staff/is_admin; sem argumentos de uid/papel e search_path vazio                                               |
| Execução             | Helpers permitidos a authenticated, negados a anon/service_role; trigger function sem EXECUTE para esses papéis                            |
| Privilégios efetivos | Sem INSERT/UPDATE/DELETE/TRUNCATE para anon/authenticated/service_role nas dez tabelas, considerando herança de grants                     |
| Privacidade          | Sem SELECT anônimo em pedidos/itens/perfis/histórico/pagamentos ou tabelas privadas; authenticated/service_role sem leitura direta privada |
| Sequência            | Sem USAGE/UPDATE para os três papéis de API                                                                                                |
| Papéis               | Atendente ativo só vê perfil próprio; admin ativo vê perfis, incluindo inativos; inativo/sem profile não recebe direitos de equipe         |

Contagens medidas diretamente nos catálogos locais após os testes: **10 tabelas, 71 constraints, 33 índices, 9 policies, 20 triggers não internos e 3 funções private**. Não incluem objetos internos de Auth/Storage nem triggers internos de FK. O teste de catálogo confere owners, propriedades dos helpers e privilégios efetivos, além dos testes de comportamento existentes com SET ROLE e fixtures locais.

Não há RPC de venda, registro de pagamento, importação ou administração de funcionários. A fundação congela as escritas até a implementação posterior das operações transacionais. Owner/superusuário ainda pode alterar DDL ou desabilitar triggers: o mecanismo não pretende proteger o banco contra seu próprio administrador.

### Limitações da auditoria

As restrições de soma dos itens/total, histórico completo, fluxo transacional, pagamento coerente, política de URL de imagem, timestamps automáticos e idempotência de negócio ainda dependem das futuras RPCs/triggers específicas. O bloqueio atual impede operações comerciais enquanto essas invariantes não estiverem prontas. Os testes locais não comprovam autenticação real, endpoints REST públicos, proteção contra abuso, configuração Auth hospedada ou segurança de produção.

Default privileges do SQL são relativos ao role que executa as migrações. O owner efetivo no remoto e os grants após aplicação deverão ser conferidos. Não habilitar FORCE RLS indiscriminadamente sobre profiles: os helpers usam o owner para evitar recursão de policies. Não alterar papéis do provedor ou conceder privilégios extras para esconder avisos do ambiente.

## Testes locais e avisos

1. Resultado informado pelo proprietário: um arquivo, **34 testes**, PASS.
2. Primeira repetição bem-sucedida desta execução: um arquivo, **34 testes**, PASS.
3. Execução após acrescentar `security_audit.test.sql`: dois arquivos, **121 testes** (34 anteriores + 87 novos), PASS, zero falhas.

Avisos observados:

- `NOTICE: extension pgtap already exists, skipping`.
- `WARNING: no privileges were granted for grant_pg_cron_access`.
- `WARNING: no privileges were granted for grant_pg_net_access`.

Os dois warnings vêm do GRANT amplo da fixture de teste sobre funções de extensions; nenhuma dessas funções é necessária à aplicação ou aos testes de negócio. A suíte completou com PASS. O GRANT ocorre só na transação local e é revertido por rollback, não consta nas migrações nem deve ser executado no remoto. Os avisos foram preservados, sem ampliar permissões do provedor ou desabilitar verificações. A CLI também informou versão nova disponível; a dependência 3.1.0 foi mantida, sem atualização fora do escopo.

## Projeto e estado hospedado verificados

Destino único: **vila-rica-dev — yzxsuoxthkbzbkcumauz — sa-east-1 (São Paulo)**, ACTIVE_HEALTHY na API. Plano Free informado pelo proprietário; nenhuma contratação/alteração foi realizada. O projeto anterior da Virginia não foi usado. O rótulo `production` mostrado pela CLI significa a instância principal hosted desse projeto, não uma autorização para operar vendas/produção.

- `bun run supabase:check`: vínculo local corresponde ao ref aprovado.
- `supabase migration list --remote=yzxsuoxthkbzbkcumauz`: duas versões locais, colunas remotas vazias para ambas.
- `supabase db query --remote=yzxsuoxthkbzbkcumauz --read-only`: consulta aos catálogos não encontrou tabelas em public/private. Isso não significa que Auth/Storage/schemas do provedor não existam.
- Outra consulta read-only não encontrou schema private nem funções private de nomes is_staff/is_admin/reject_foundation_write conflitantes.
- Não foi lido conteúdo de clientes, contas, pedidos, tokens ou chaves. Essas consultas foram limitadas a metadados. Nenhuma migração, seed, config push, reset, repair ou cadastro foi executado.

O fluxo interno de autenticação da CLI pode inicializar seu login role temporário; isso não representa aplicação de schema de negócio. O snapshot remoto é válido no instante das consultas e deve ser reconfirmado na implantação aprovada.

## Novo dry run remoto

Executado `bun run supabase:dry-run`, wrapper que confere o ref em cache e fixa o destino. O comando equivalente usa `db push --remote=yzxsuoxthkbzbkcumauz --dry-run --skip-vault`, sem include-all/seed/roles.

Resultado: sucesso, `dryRun: true`, `upToDate: false`, apenas:

1. `20261117000100_backend_foundation.sql`
2. `20261117000200_read_policies.sql`

`seeds: []`, `roles: []`, nenhuma migração extra. A CLI declarou que as migrações não seriam enviadas. `--skip-vault` impede atualização implícita de Vault. O dry run é planejamento; a evidência de execução SQL/RLS vem da stack local, não desse comando.

## Validações gerais executadas

| Comando                                    | Resultado                                                   |
| ------------------------------------------ | ----------------------------------------------------------- |
| bun install --frozen-lockfile              | Aprovado, sem mudança de dependências/lockfile              |
| bun run typecheck                          | Exit 0                                                      |
| bun run lint                               | Exit 0, zero erros e nove avisos Fast Refresh preexistentes |
| bun run test                               | 200 aprovados em 13 arquivos; anteriores preservados        |
| bun run build                              | Exit 0, cliente/SSR/Nitro com configuração original Lovable |
| git diff --check                           | Aprovado                                                    |
| bunx --no-install supabase db test (local) | 121 aprovados em dois arquivos                              |
| supabase:check / dry-run                   | Aprovados no ref autorizado; nenhuma aplicação              |

Nenhuma homologação visual nova foi alegada. Nenhum componente/frontend mudou; SDK, sessão real e vendas remotas continuam desabilitados.

## Plano exato de implantação — aguarda aprovação

### Arquivos e integridade

| Arquivo em supabase/migrations/       | SHA-256 aprovado para revisão                                      |
| ------------------------------------- | ------------------------------------------------------------------ |
| 20261117000100_backend_foundation.sql | `049268d20d43f939b27c8ad31b3a47845a5c75fe2be04712232884cd662773f8` |
| 20261117000200_read_policies.sql      | `3523a77cf74feea18ffb1d4bcd69398f458deb82b1bb87d8a6300889592a6f81` |

Aprovação solicitada cobre **somente esses dois arquivos com esses hashes**, no ref yzxsuoxthkbzbkcumauz, sem importação de dados ou ativação de funcionalidade. Qualquer diferença de hash/plano/destino exige interromper e renovar revisão/aprovação. Os testes locais não são arquivos a aplicar no remoto.

### Objetos e privilégios previstos

Primeiro arquivo: schema private, dez tabelas, sequence identity, constraints/índices, RLS, revogações nas novas tabelas/sequence/schema, default privileges de tabelas/sequences/funções para o owner executor e função/triggers de congelamento. Default privileges para schemas public/private afetam objetos futuros criados pelo mesmo role; não são alteração de dados ou do schema Auth.

Segundo arquivo: helpers is_staff/is_admin, policies de leitura, USAGE de schema e SELECT explícito mínimo. authenticated ganha USAGE em private somente para execução dos helpers, **sem SELECT nas tabelas privadas**; anon lê apenas catálogo publicável. Sem DML, sequência, execução de função de mutação ou exposição de token/PII. Nenhum funcionário, admin, produto ou pedido é inserido.

### Procedimento somente após aprovação explícita

1. Confirmar nome/ref/região e vínculo novamente; conferir histórico remoto e ausência de conflitos. Interromper se houver versões/objetos inesperados.
2. Recalcular SHA-256 e comparar com a tabela; repetir dry run e exigir exatamente as duas versões, sem seeds/roles/Vault. Não usar include-all ou reparar histórico automaticamente.
3. Aplicar somente as versões aprovadas ao alvo explícito por `bunx --no-install supabase db push --remote=yzxsuoxthkbzbkcumauz --skip-vault`, atendendo à confirmação da CLI apenas após a aprovação do proprietário. Esse comando **não foi executado** nesta etapa.
4. Verificar o histórico remoto com as duas versões e consultar catálogos em read-only: dez tabelas/RLS, PKs/FKs/checks/índices/identity, owners/search_path, nove policies, vinte triggers ALWAYS e privilégios efetivos. Não executar fixtures pgTAP no remoto.
5. Confirmar ausência de permissões DML/sequence e de RPCs comerciais; manter frontend demo. Testes de inserção real/negativa no remoto, se necessários, exigem plano separado; usar inspeção de metadados nesta verificação para não cadastrar dados.
6. Registrar resultados e eventual falha no relatório posterior. Nenhuma importação, conta Auth, config push, ativação de SDK/PDV/checkout ou publicação faz parte dessa aprovação.

### Recuperação em caso de falha

Cada arquivo possui BEGIN/COMMIT. Falha dentro de um arquivo deve reverter seus objetos não commitados; não presumir atomicidade entre os dois arquivos ou com o histórico mantido pela CLI. Se a primeira migração já tiver concluído e a segunda falhar, a primeira mantém tabelas congeladas e sem grants de leitura da segunda, sem permitir vendas. Parar e inspecionar histórico/objetos read-only; não repetir cegamente, editar migração já aplicada, executar db reset/repair, excluir objetos ou remover volumes/dados.

Restabelecer consistência por correção explicitamente revisada e autorizada após diagnóstico. Um backup/plano de restauração será exigido se o estado remoto tiver mudado ou contiver dados antes da aplicação; não assumir que o plano Free oferece restauração pontual disponível. Nenhuma operação destrutiva automática é estratégia de recuperação.

## Arquivos criados e atualizados

Criados:

- `supabase/tests/database/security_audit.test.sql`: 87 verificações adicionais locais.
- `docs/sprints/SPRINT-06.2B.md`: auditoria, evidências e plano de aprovação.

Atualizados:

- `supabase/README.md`: resultado local, PATH do Docker e situação remota.
- `docs/backend/SEGURANCA.md`: evidências locais e separação de controles atuais/futuros.
- `docs/backend/ARQUITETURA.md`: estágio validado localmente e fronteira de implantação.
- `README.md`: referência ao resultado desta etapa.

Migrações, AGENTS.md, .lovable, configurações Vite, dependências, catálogo/preços/imagens, código frontend/domínio e chaves de armazenamento permanecem intactos. Nenhum dado persistido local foi excluído; fixtures exclusivamente locais são revertidas.

## Pendências e próxima etapa

A única aplicação de fundação hospedada continua pendente da aprovação explícita. Depois dela: executar o procedimento de implantação controlada acima e registrar evidência remota dos controles. Autenticação real, administração da equipe, transações de pedidos/pagamentos, invariantes, idempotência, rate limit, TTL/retenção, importação de catálogo e futura integração de frontend permanecem escopos posteriores, com testes/aprovações próprios. O sistema não é declarado pronto para produção.
