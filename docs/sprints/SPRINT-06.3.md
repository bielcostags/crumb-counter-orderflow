# Sprint 06.3 — Autenticação real e preparação de funcionários

Data: 17/11/2026 (America/Porto_Velho). Branch: **feature/auth-funcionarios**, criada de origin/main **b3623ec**, PR #9. Working tree inicial limpo; referências atualizadas com fetch. Nenhum commit/push/merge/force push/publicação nesta execução.

## Resumo e estado entregue

Implementada autenticação real servidor-centrada com Supabase Auth/SSR e cookies, validada na stack **local** com serviços reais. Controle admin/atendente centralizado, perfis ativos obrigatórios, proteção de rotas e revalidação no servidor. Demo continua padrão e todas as jornadas anteriores foram preservadas. Nenhum modo real foi ativado automaticamente.

Módulo /admin/funcionarios: leitura de perfis autorizada no servidor, visualização de papel/situação e editor com confirmação. Alteração exige flags explícitas e migração nova. A RPC de perfis, bootstrap privado e auditoria foram implementados/testados localmente. **Convites/criação de contas Auth por endpoint não foram implementados/liberados**; a interface informa a dependência e não finge sucesso. Não há escrita comercial de pedidos/pagamentos/catálogo.

Detalhes de arquitetura, configuração, matriz e procedimentos em [AUTENTICACAO.md](../backend/AUTENTICACAO.md).

## Conferência e preservação

Lidos AGENTS.md, README, supabase/README, documentos de arquitetura/modelagem/segurança/migração, relatórios 06.2B/06.2C e código de contextos/rotas/serviços. Preservados o bloco Lovable, .lovable, Vite, middleware CSRF/erros, histórico Git, catálogo comercial/imagens/preços e todas as chaves demo. routeTree.gen.ts foi atualizado somente pelo gerador TanStack durante build.

As migrações 00100/00200 permanecem idênticas e já estavam aplicadas no hospedado, conforme autorização anterior. Os relatórios históricos receberam notas datadas, sem apagar o contexto pré-implantação. Nenhuma delas foi reaplicada ou modificada.

### Data API e remoto

O proprietário respondeu neste diálogo: **“public e graphql_public”** ao conferir Project Settings → Data API → Exposed schemas. A evidência é confirmação manual do proprietário, não uma afirmação de consulta positiva pela CLI. private não aparece na lista informada; nenhuma configuração foi alterada.

A consulta read-only inicial a yzxsuoxthkbzbkcumauz reconfirmou dez tabelas/RLS, 71 constraints, 33 índices, nove policies de leitura, vinte triggers ALWAYS, helpers postgres/search_path vazio e zero grants indevidos de DML, leitura privada ou sequência para papéis de API. O projeto anterior da Virginia não foi usado. A configuração Auth hospedada (signup, redirects, recovery etc.) **não foi alterada ou homologada**. Nenhuma conta real/admin foi criada, nenhum segredo remoto foi configurado e nenhum endpoint foi publicado.

## Arquitetura efetiva

- SDKs oficiais adicionados por Bun: @supabase/supabase-js **2.119.0**, @supabase/ssr **0.12.7**. Falha inicial de cache restrito foi resolvida pela permissão de instalação, sem contornar sandbox.
- Modos AUTH_MODE/VITE_AUTH_MODE explícitos e coerentes; demo padrão. Alvo real fixo ao projeto do proprietário ou loopback local explicitamente selecionado. Configuração inválida falha sem fallback.
- Cliente SSR por requisição, cookies HttpOnly/Secure/SameSite, refresh persistido e respostas privadas no-store. Nada de singleton ou token em localStorage demo.
- auth.getUser() autoritativo e perfil do mesmo UUID, ativo e papel válido. Funções de servidor e RPC revalidam; metadata, flags demo, URL e formulário não autorizam.
- Login e logout reais, mensagens genéricas, estado de envio/erro/expiração, limpeza do estado privado, proteção contra respostas antigas após logout. Revalida ao foco/60 segundos, e sempre em operações privadas.
- beforeLoad protegido no modo real e guarda de UI. Atendente não entra em funcionários/produtos/categorias. No modo real, módulos comerciais não exibem StoreContext local como substituição de backend; ficam explicitamente bloqueados. Demo conserva os componentes/jornadas existentes.
- Carregamento lazy do provider real/gestão evita impor módulos Auth ao fluxo demo/público quando não usados.

## Migração nova e desenho de segurança

**supabase/migrations/20261117000300_staff_access.sql**

SHA-256: **c79e2a16a7e1411e52c6bf0789c41fa9ac88ea9aa2346e1aba0d483289d195e5**.

Escopo: papel técnico sem login/herança/BYPASSRLS; policies limitadas a ele; função interna de escrita de perfis; wrappers de identidade/admin; bootstrap privado owner-only; guard específico de profiles e tabela privada append-only staff_access_audit. Mantém gates comerciais, TRUNCATE de profiles e ausência de UPDATE genérico. Nenhum usuário/perfil/admin é criado pela migração.

Operações obtêm identidade de auth.uid no wrapper confiável, verificam admin ativo dentro da transação e não aceitam actor_id da API. Um advisory lock serializa bootstrap e mudanças para impedir corridas/remoção dos admins. Mudanças no próprio perfil são negadas, e registros sensíveis são auditados. Os wrappers de entrada são de postgres; só a função interna de escrita pertence ao papel técnico com RLS explícita e grants mínimos. O papel não ganha leitura de Auth ou acesso a pedidos/produtos/pagamentos.

Os 87 testes de security_audit foram mantidos, com duas consultas de policies refinadas para negar policies de escrita/exposição **de API** (inclusive PUBLIC), sem proibir as policies novas do papel técnico não assumível. Isso acompanha a mudança intencional de escopo de profiles; não remove casos ou enfraquece grants de API. A suíte nova testa também esse papel e o isolamento comercial.

## Execução local, problemas e correções

1. Baseline: 200 testes da aplicação aprovados antes da implementação.
2. A primeira aplicação local falhou em ALTER FUNCTION OWNER por exigência de SET ROLE. A transação reverteu; foi acrescentada concessão temporária ao executor e revogação ao final.
3. A primeira versão funcional aplicada localmente não conseguia usar o schema Auth com o papel técnico. Os testes novos falharam; os 121 casos anteriores continuaram passando. O desenho foi corrigido para wrappers de postgres que resolvem identidade, sem conceder Auth ao escritor. Corrigidas apenas as funções **novas locais**, em transação e sem apagar registros; migração ainda não aplicada no remoto foi atualizada. Grants locais residuais de leitura de auth.users.id da primeira tentativa foram revogados; conferência final confirmou nenhum USAGE no schema Auth nem SELECT dessa coluna pelo escritor, e zero perfis/eventos de teste remanescentes.
4. A expectativa de pg_has_role(postgres, writer) como falsa era inválida para administrador do banco; substituída por checagem explícita de NOINHERIT do papel, mantendo os testes de que papéis de API não assumem o writer.
5. Replay do **arquivo final completo**, junto às duas migrações anteriores, em banco local descartável com contrato mínimo de auth.users/auth.uid: três migrações passaram e os 155 testes pgTAP passaram. O banco descartável criado pela execução foi removido. Esse teste de DDL não foi chamado de serviço Auth real.
6. Integração separada na stack real local Auth/REST/PostgreSQL passou em 12 checks, inclusive cookies, refresh, logout e concorrência entre dois admins. Cinco identidades sintéticas locais e seus próprios perfis/auditoria foram limpos; registros originais preservados. Credenciais da stack foram mantidas em memória e não impressas.
7. Vitest teve sete falhas/231 passes em tentativa sob carga (incluindo timeouts já conhecidos). Após separar o carregamento lazy e executar isoladamente, a suíte passou; não foram aumentados timeouts, removidos testes ou desativadas validações. A causa de cada falha transitória não foi comprovada; a ocorrência foi registrada.
8. Typecheck apontou inferência de configuração/sessões do script; tipos foram corrigidos. Lint apontou formatação, catch vazio de teste e uso de ref em cleanup; corrigidos sem desabilitar regras.

## Testes e resultados finais

| Validação                                   | Resultado                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| bun install --frozen-lockfile               | Aprovado após atualização de package.json/bun.lock pelo Bun                                    |
| bun run typecheck                           | Aprovado                                                                                       |
| bun run lint                                | Zero erros, nove avisos Fast Refresh preexistentes                                             |
| bun run test (isolado)                      | **247 aprovados em 16 arquivos**, 200 anteriores + 47 novos                                    |
| bun run build                               | Aprovado, cliente/SSR/Nitro Lovable                                                            |
| git diff --check                            | Aprovado                                                                                       |
| pgTAP na stack local                        | **155 aprovados em três arquivos**, 121 anteriores + 34 novos                                  |
| Replay SQL completo em DB local descartável | Três arquivos aplicados, 155 testes aprovados                                                  |
| Integração local Auth real                  | **12 checks aprovados**, fixtures próprias removidas                                           |
| Dry run remoto                              | Sucesso; apenas 20261117000300_staff_access.sql pendente, seeds/roles.sql vazios, --skip-vault |
| Navegador                                   | Tentado; host indisponível, sem homologação visual alegada                                     |

Os novos testes cobrem visitante, login, ausência/inatividade de perfil, papéis, expiração, falhas, logout, cache/estado, falsificação de metadata/demo, rotas, isolamento de SSR/cookies e configuração sem fallback. Testes de componentes usam transporte simulado e são distinguidos da integração Auth real local e dos testes PostgreSQL. Não se declara autenticação de produção homologada.

## Arquivos criados

- src/services/auth/policy.ts, config.ts, authorization.ts, cookie-client.server.ts, client.server.ts e functions.ts.
- src/contexts/admin-session.ts e StaffSessionContext.tsx.
- src/components/admin/auth/StaffLogin.tsx e StaffManagement.tsx.
- src/routes/admin.funcionarios.tsx.
- src/test/auth-policy.test.ts, auth-interface.test.tsx e auth-cookies.test.ts.
- scripts/supabase/test-auth-local.ts.
- supabase/migrations/20261117000300_staff_access.sql.
- supabase/tests/database/staff_access.test.sql.
- docs/backend/AUTENTICACAO.md e este relatório.

## Arquivos modificados

package.json/bun.lock (SDKs e comando de teste local), .env.example (configuração sem segredos/default demo), AdminSessionContext.tsx, AdminLayout.tsx, admin.tsx, admin.acesso.tsx, app-routing.test.tsx (nova rota), security_audit.test.sql (duas verificações específicas de API), routeTree.gen.ts (gerador), README, supabase/README e docs/backend/ARQUITETURA/SEGURANCA/MIGRACAO, com notas nos relatórios 06.2B/06.2C.

## Plano remoto — não executado, depende de aprovação específica

Destino único: **vila-rica-dev / yzxsuoxthkbzbkcumauz / sa-east-1**. Apenas o arquivo 00300 no hash acima. Não reaplicar 00100/00200.

Antes: confirmar vínculo, hashes e ausência de objetos/role conflitantes, repetir dry run e validar executor DDL. A migração cria um **role técnico dentro do SQL**, embora a CLI reporte roles: [] (nenhum roles.sql extra); isso é parte explícita do escopo de aprovação. Acrescenta uma tabela privada e quatro policies limitadas ao writer; altera somente o gate de escrita de profiles, preservando os demais. EXECUTE de manage_staff_profile é concedido a authenticated, mas a função exige admin ativo; flags de UI não substituem esse controle e não bloqueiam uma chamada direta autorizada à RPC.

O bootstrap e a criação da primeira identidade real são **aprovações separadas**, não estão incluídos na simples aplicação da migração. Não aplicar config push ou criar Secrets/endpoint administrativo de convites. O fluxo remoto só será ativável após confirmar configuração Auth, perfis e controles com contas autorizadas.

Após eventual aplicação aprovada: conferir histórico, role sem login/herança/BYPASSRLS, memberships, owners, RLS e policies técnicas, guards comerciais e auditoria. Sem fixtures no remoto, sem importação ou conta automática. A implantação deve ser transacional; falha aborta/interrompe. Não usar reset, repair, editar migração já aplicada ou apagar dados como recuperação. Uma correção posterior deve ser nova migração revisada/autorizada, preservando auditoria. Não recriar/remover o role se já existir sem diagnóstico.

## Pendências e limites

- Nova migração e permissões adicionais não aplicadas no hospedado.
- Remote Auth signup/redirects/recovery/rate limit não configurados ou homologados; nenhuma conta real criada.
- Convite/criação Auth por endpoint e bootstrap operacional remoto aguardam escopo e aprovação próprios.
- Gestão lista no máximo 100 perfis; paginação futura e auditoria administrativa de consulta ainda pendentes.
- Revalidação periódica pode descartar editor de funcionário ainda não confirmado; nenhum comando é reenviado automaticamente.
- Testes SQL não cobrem toda proteção HTTP/Auth, e testes de UI não substituem browser real. Responsividade/cookies em browser/dispositivos reais permanecem sem homologação.
- Plano de retenção/auditoria, recuperação de conta, rate limit de endpoints e revisão operacional necessários antes de habilitar usuários finais.
- Pedidos/pagamentos/catálogo permanecem bloqueados no remoto; nenhuma prontidão de produção ou alteração comercial foi declarada.

Entrega mantida na branch de trabalho, sem commit/push/merge/publicação. A aprovação pedida a seguir limita-se à nova migração documentada; a implementação local está concluída, mas a ativação hospedada não é automática.
