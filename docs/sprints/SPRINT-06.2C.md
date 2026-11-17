# Sprint 06.2C — Reconciliação e conferência da implantação PostgreSQL

> Nota de atualização em 17/11/2026 — Sprint 06.3: as duas migrações de fundação foram aplicadas após autorização na interação posterior à entrega pré-implantação; a 06.2C reconfirmou o histórico e dry run vazio. Esses fatos históricos são preservados abaixo. A nova migração 00300 de perfis está somente preparada/testada localmente e não foi aplicada no hospedado. Autenticação remota não foi ativada. Ver [Sprint 06.3](SPRINT-06.3.md).

Data: 17/11/2026, America/Porto_Velho. Branch: `feature/backend-implantacao-remota`, criada de `origin/main` atualizada, commit **c31fc1e**, merge do PR #8. Nenhuma alteração remota foi aplicada nesta sprint.

## Divergência entre o escopo recebido e o estado existente

O anexo descrevia duas migrações ainda pendentes e exigia parar antes de qualquer aplicação. Entretanto, após a entrega da Sprint 06.2B o proprietário já havia respondido **“autorizo”**, e as duas migrações foram efetivamente aplicadas e verificadas naquela etapa. Esse fato constava na conversa e na documentação pós-implantação do commit **03f8e19**, preservado na branch anterior `feature/backend-validacao-postgresql`.

A main c31fc1e contém a versão anterior do relatório, integrada no PR #8 a partir de 9d6361b; não inclui o commit 03f8e19. Isso explica a divergência documental. O working tree inicial estava limpo. A nova branch foi criada exatamente de origin/main, sem usar branch antiga como base, fazer cherry-pick ou alterar commits anteriores. A referência/commit pós-implantação foi preservada.

Foi interrompida a sequência de implantação prevista no anexo. Continuaram somente verificações locais, inspeções read-only, dry run e documentação. Não se usou a autorização antiga para executar nova escrita. Não há mudança pendente a autorizar ou reaplicar: a CLI confirmou **upToDate: true**, com lista de migrações vazia. Pedir autorização para aplicar novamente os mesmos arquivos criaria uma falsa pendência.

## Projeto e limites operacionais

Alvo conferido: **vila-rica-dev**, ref **yzxsuoxthkbzbkcumauz**, finalidade desenvolvimento/homologação, região **sa-east-1 (São Paulo)** conforme identificação e evidências da etapa anterior; plano Free informado pelo proprietário, sem alteração de plano/custos. `bun run supabase:check` confirmou o vínculo local; os comandos remotos fixaram novamente o mesmo ref e a CLI confirmou o nome. O projeto anterior da Virginia não foi utilizado.

Lidos/revisados AGENTS.md e a exceção para o Supabase externo, README, supabase/README, relatórios 06.1/06.2A/06.2B e documentos ARQUITETURA/MODELAGEM/PROPOSTA-SQL/SEGURANCA/MIGRACAO. Foram preservados o Lovable, os recursos gerenciados, as migrações, dependências, frontend e armazenamento local.

## Integridade dos arquivos reais

A pasta de migrações continha exclusivamente os dois arquivos esperados. Os SHA-256 foram recalculados e corresponderam aos aprovados:

| Arquivo em supabase/migrations/       | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| 20261117000100_backend_foundation.sql | `049268d20d43f939b27c8ad31b3a47845a5c75fe2be04712232884cd662773f8` |
| 20261117000200_read_policies.sql      | `3523a77cf74feea18ffb1d4bcd69398f458deb82b1bb87d8a6300889592a6f81` |

Não foram alterados SQL, histórico, triggers ou policies. Os testes SQL existentes também permaneceram intactos.

## Validação PostgreSQL exclusivamente local

Docker Desktop foi usado pelo caminho `/Applications/Docker.app/Contents/Resources/bin`, incluído somente no ambiente dos comandos, sem mudança global no shell. `supabase start` retornou exit 0 na stack já existente. Sua saída de status foi capturada apenas em memória e suprimida, para não expor chaves locais. Não houve reset, remoção de volumes ou exclusão de dados.

```sh
env PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" bunx --no-install supabase start --agent yes
env PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" bunx --no-install supabase db test --agent yes
```

O alvo anunciado dos testes foi **local stack (127.0.0.1:54322)**, sem --remote. Resultado: **dois arquivos, 121 testes, zero falhas, PASS**. Foundation mantém 34 casos; security_audit acrescenta 87 verificações de catálogo/permissões. Fixtures são fictícias, transacionais e revertidas por rollback; não foram executadas no banco hospedado.

Cobertura: RLS nas dez tabelas; grants efetivos/herdados; papéis de equipe ativos/inativos; bloqueio de promoção própria; leitura pública só do catálogo vendável; proteção de pedidos/perfis/finanças/tabelas privadas; vinte triggers ALWAYS; owners/search_path/execução dos helpers; PKs/FKs/identity/subtotal gerado e congelamento da escrita. As verificações de índices/constraints incluem auditoria estática e contagens remotas, não uma operação comercial liberada.

Avisos não fatais preservados: pgtap já existe; nenhum privilégio concedido para grant_pg_cron_access e grant_pg_net_access na fixture. Os GRANTs de teste são locais e revertidos. A CLI informou versão nova disponível; não foi atualizada para resolver avisos ou modificar escopo.

## Aplicação — resultados e falha transitória registrada

| Comando                          | Resultado                                                                  |
| -------------------------------- | -------------------------------------------------------------------------- |
| bun install --frozen-lockfile    | Aprovado, sem alterar lockfile/dependências                                |
| bun run typecheck                | Exit 0                                                                     |
| bun run lint                     | Exit 0; zero erros, nove avisos preexistentes de Fast Refresh              |
| bun run test — primeira execução | 191 passaram e nove falharam, com vários timeouts sob execução concorrente |
| bun run test — repetição isolada | **200 aprovados em 13 arquivos**, exit 0                                   |
| bun run build                    | Exit 0, cliente/SSR/Nitro original Lovable                                 |
| git diff --check                 | Aprovado                                                                   |

A primeira suíte concorreu com build/typecheck e operações da stack local. As falhas incluíam timeout de 5000 ms e consultas de DOM antes de concluir navegação. Repetir a suíte completa isoladamente, após essas operações terminarem, passou sem modificar código, testes, timeouts ou configuração. Isso é compatível com contenção do ambiente, mas a causa de cada falha transitória não foi comprovada. Registrar a instabilidade para investigação se reaparecer; não ocultar a primeira falha nem tratá-la como regressão corrigida por alteração inexistente.

Nenhum frontend, imagem, catálogo, preço, chave de persistência, serviço local ou sessão demonstrativa foi modificado. Não foi introduzido SDK Supabase ou autenticação real.

## Histórico e novo dry run hospedados

Executados no ref fixo:

```sh
bun run supabase:check
bun run supabase:dry-run
bunx --no-install supabase migration list --remote=yzxsuoxthkbzbkcumauz --agent yes
```

Dry run retornou **dryRun: true**, **upToDate: true**, **migrations: []**, **seeds: []**, **roles: []**, “Remote database is up to date”. O wrapper continua usando --skip-vault, sem operações de Vault ou include-all/seed/roles. Nenhum comando de aplicação real foi executado.

O histórico hospedado contém exatamente **20261117000100** e **20261117000200**, iguais às versões locais. Assim, o critério literal do novo anexo (“dry run deve listar duas migrações pendentes”) não é aplicável ao estado já implantado. Não houve tentativa de reset, repair ou exclusão para fabricar esse resultado.

## Auditoria hospedada read-only

Consulta de metadados em pg_catalog e de privilégios efetivos, via `supabase db query --remote=yzxsuoxthkbzbkcumauz --read-only`, reconfirmou:

| Item                  | Resultado                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Tabelas               | Dez, sete public e três private, todas pertencentes a postgres                                             |
| RLS / PKs             | Dez habilitadas / dez PKs                                                                                  |
| Constraints / índices | 71 / 33                                                                                                    |
| Policies              | Nove de leitura; zero de escrita/ALL e zero nas tabelas privadas                                           |
| Triggers              | Vinte ALWAYS, vinculados a private.reject_foundation_write                                                 |
| Helpers               | is_staff/is_admin SECURITY DEFINER, owner postgres, search_path vazio                                      |
| Execução dos helpers  | authenticated permitido; anon/service_role negados                                                         |
| Escrita de API        | Zero grants efetivos de INSERT/UPDATE/DELETE/TRUNCATE para anon/authenticated/service_role nas dez tabelas |
| Privacidade           | Zero SELECT anônimo nas tabelas internas/privadas; zero leitura privada direta pelos três papéis de API    |
| Sequência             | Sem USAGE/UPDATE para os três papéis de API                                                                |
| Relações              | FKs RESTRICT; nenhuma exclusão em cascata histórica; FK de tentativa deferida                              |
| Valores gerados       | order_number ALWAYS identity; subtotal STORED gerado                                                       |
| Catálogo              | SELECT público previsto, submetido às policies de disponibilidade/categoria ativa                          |

Não houve leitura de dados pessoais, pedidos ou credenciais; somente metadados e configurações não sensíveis. Não foram executados inserts negativos ou fixtures no remoto. Os resultados locais com SET ROLE não são testes de login real ou endpoints REST hospedados.

### Exposição do schema private pela Data API

A configuração local versionada expõe somente public. A consulta somente de leitura a pg_db_role_setting/rolconfig não encontrou um parâmetro pgrst.db_schemas explícito, portanto não serve isoladamente para comprovar a configuração hospedada. A CLI config diff foi consultada em modo read-only, com saída integral suprimida e somente campos de schemas elegíveis para apresentação. Nenhum config pull/push foi executado, e nenhuma configuração foi sobrescrita. A CLI não apresentou registro de diferença com campo schema na estrutura consultada; esse resultado não foi tratado como prova positiva da lista completa de schemas hospedados. A saída restante, potencialmente sensível, não foi impressa ou gravada.

Independentemente da exposição configurada, a auditoria confirmou ausência de acesso direto às tabelas privadas e restrição de uso/execução dos helpers. Confirmar a lista hospedada de “Exposed schemas” nas configurações Data API antes de qualquer futura ampliação de privilégios; não substituir essa confirmação pela configuração local.

## Autorização e estado final

A implantação registrada anteriormente foi autorizada explicitamente na interação “autorizo”, limitada aos dois hashes. **O novo prompt não foi considerado autorização para nova escrita.** Nesta Sprint 06.2C, o estado já aplicado e o dry run vazio encerram a sequência de nova implantação: não há plano de mudança pendente nem nova aplicação a aprovar. Qualquer migration adicional, alteração de configuração, recuperação ou liberação de operação comercial precisa de plano próprio e aprovação específica.

A fundação está implantada desde a etapa anterior e foi reconferida nesta sprint. Não se declara uma nova implantação realizada na 06.2C, nem se afirma que as operações de negócio estão prontas. Todos os bloqueios permanecem; nenhum produto, funcionário, pedido ou pagamento foi cadastrado/importado.

## Recuperação e riscos

Nenhuma falha de implantação ocorreu nesta execução, pois não houve aplicação. Se surgir divergência futura: interromper, inspecionar histórico/catálogos em read-only e elaborar correção revisável. Não presumir atomicidade conjunta de dois arquivos (cada um tem BEGIN/COMMIT), nem alterar migração aplicada retroativamente, remover triggers, executar reset/drop/repair ou apagar dados automaticamente. Recuperação que altere o remoto exige autorização própria.

Persistem pendências de operações transacionais, invariantes entre linhas, autenticação real/equipe, rate limit, idempotência e recuperação de tokens, retenção e importação controlada. Owner/superusuário pode alterar DDL; triggers não são proteção contra o administrador do próprio banco. Não há prontidão de produção ou autorização para vendas remotas.

## Arquivos e próximos passos

Criado `docs/sprints/SPRINT-06.2C.md`. Atualizados README.md, supabase/README.md, docs/backend/ARQUITETURA.md e SEGURANCA.md para distinguir o estado aplicado do plano histórico que estava na main. Nenhum código, teste, migration, dependência, AGENTS.md ou configuração Lovable foi modificado nesta sprint.

Working tree na branch feature/backend-implantacao-remota, sem commit/push/merge/publicação pela execução. Branch e commit anteriores preservados. Próxima etapa: confirmar configuração de exposição da Data API quando necessário, definir o escopo aprovado para autenticação/serviços transacionais e testar antes de permitir escrita. Não reaplicar as migrações existentes nem desbloquear importação/vendas como parte desta conferência.
