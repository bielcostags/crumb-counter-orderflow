# Sprint 06.3B — Pré-implantação e auditoria da autenticação

Data: **17/11/2026**, America/Porto_Velho. Branch: **feature/auth-homologacao-remota**. Base: **1ae2dc5bf31acdf8c67538ad82b7b9e9bdf1f4df**, merge do PR #10. Estado: **pré-implantação concluída com pendências de configuração/homologação registradas; parada no primeiro ponto de aprovação**. Não houve implantação, criação de administrador ou ativação remota nesta sprint.

## Preparação e preservação

Git inicialmente limpo em feature/auth-funcionarios, commit 44e746f. Executado fetch; confirmados o merge e a base atualizada, sem usar branch antiga como base, reescrever histórico, descartar alterações ou modificar main. Nova branch criada de origin/main. Lidos AGENTS, README, supabase/README, documentos AUTENTICACAO/SEGURANCA/ARQUITETURA/MIGRACAO, relatórios 06.2C/06.3, serviços Auth, provider, layouts/rotas/telas, migração 00300 e seus testes.

Lovable, bloco gerenciado de AGENTS, .lovable, Vite, middleware CSRF/erros, catálogo/preços/imagens, serviços comerciais e chaves demo preservados. Nenhuma dependência nova. AUTH_MODE/VITE_AUTH_MODE e flags operacionais não foram ativados. O modo demo continua padrão. Nenhuma identidade, senha, token ou secret key foi incluída em código, documentos ou logs desta execução.

## Projeto e estado remoto inicial

Destino exclusivo **vila-rica-dev / yzxsuoxthkbzbkcumauz / sa-east-1 (São Paulo)**, desenvolvimento/homologação. O projeto antigo da Virginia não foi utilizado. O vínculo foi conferido por supabase:check e o ref foi fixado em todos os comandos remotos. A CLI confirmou o nome do projeto.

A consulta read-only ao histórico mostrou **00100 e 00200 aplicadas; 00300 pendente**. Nenhuma migração inesperada. Metadados mostraram:

- Dez tabelas/PKs, todas com RLS, 71 constraints, 33 índices, nove policies de leitura e vinte triggers ALWAYS vinculados à função de bloqueio.
- Zero permissões DML de API nas dez tabelas, zero leitura anônima interna e zero leitura direta privada pelos papéis de API.
- Sem uso/alteração da sequência por anon/authenticated/service_role.
- Helpers is_staff/is_admin de postgres, SECURITY DEFINER e search_path vazio; EXECUTE somente nos papéis previstos.
- **Ausência** de vila_rica_staff_writer, private.staff_access_audit e funções novas conflitantes.
- Role **postgres** com CREATEROLE e CREATE no schema private; profiles pertence a postgres. A conexão --read-only usa **supabase_read_only_user**, sem privilégios de DDL: isso não foi confundido com o executor de migrações. A conexão efetiva de aplicação precisa ser reconfirmada após autorização.

Somente catálogos/configurações necessários foram consultados. Não foi feito inventário de e-mails/contas ou leitura de conteúdo comercial/pessoal. O fluxo interno da CLI pode inicializar um login role temporário; não houve aplicação de schema de negócio por esta execução.

## Data API — evidência positiva

O proprietário informou: **public selecionado, graphql_public selecionado, private aparece como opção mas NÃO está selecionado**. Essa distinção está preservada: aparecer na lista não equivale a exposição.

Além da confirmação manual, a leitura de configuração hospedada via **config diff read-only** retornou **api.schemas = [public, graphql_public]**. private não integra a lista exposta. O resultado foi obtido comparando com uma cópia temporária da configuração local, sem config push/pull, sem modificar o arquivo real e sem enviar as opções locais ao remoto. A cópia temporária foi removida. Foram exibidos somente campos não sensíveis previamente permitidos; o restante da resposta permaneceu em memória e foi suprimido.

A restrição de SELECT nas tabelas privadas também foi conferida por metadados. Não foi executada consulta REST autenticada com dados pessoais ou criação de identidade para testar a API.

## Configuração Auth hospedada observada

Valores **remotos** confirmados pelo diff de configuração, não inferidos do config.toml local:

| Campo                          | Valor observado           | Avaliação / ação posterior                                                          |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------- |
| enable_signup                  | **true**                  | Cadastro público está habilitado; propor false antes de criar/ativar equipe real    |
| email.enable_confirmations     | true                      | Confirmação de e-mail ativa; preservar, sem confundir com provedor habilitado       |
| site_url                       | **http://localhost:3000** | Default atual, não comprova URL de homologação correta; escolher URL aprovada       |
| additional_redirect_urls       | []                        | Sem redirects adicionais; definir apenas destinos exatos necessários após aprovação |
| jwt_expiry                     | 3600 segundos             | Uma hora para JWT; não alterar silenciosamente                                      |
| enable_refresh_token_rotation  | true                      | Rotação ativa                                                                       |
| refresh_token_reuse_interval   | 10 segundos               | Janela atual de reutilização                                                        |
| minimum_password_length        | **6**                     | Propor 12 para o fluxo de funcionários, em aprovação própria                        |
| password_requirements          | null                      | Sem requisito adicional retornado; não inventar política de complexidade já ativa   |
| rate_limit.sign_in_sign_ups    | 30                        | Valor da configuração; não se declara teste de carga/antiabuso                      |
| rate_limit.token_refresh       | 150                       | Valor retornado; nenhuma mudança                                                    |
| rate_limit.token_verifications | 30                        | Valor retornado; nenhuma mudança                                                    |
| email.max_frequency            | 1m0s                      | Intervalo retornado para e-mail                                                     |
| sessions.timebox               | 0s                        | Limite absoluto não configurado nessa opção                                         |
| sessions.inactivity_timeout    | 0s                        | Limite de inatividade não configurado nessa opção                                   |

Os limites são registrados nos formatos/nomes da CLI; não foi inferida unidade adicional ou alcance por IP/usuário sem comprovação do provedor. Os valores de sessão não foram tratados como garantia de expiração de toda a sessão ao vencer o JWT; refresh tokens têm ciclo próprio. Não foram habilitados recursos pagos ou alterado o plano.

### Configurações não comprovadas

O diff não forneceu evidência positiva do campo **auth.email.enabled** ou da cota **rate_limit.email_sent**, mesmo após comparações locais alternativas. O proprietário respondeu **“Não consegui conferir”** ao pedido de checar o provedor Email. Portanto **não se declara o login por e-mail habilitado no remoto**. Confirmar em Authentication → Sign In / Providers → Email (a nomenclatura pode variar no painel), sem desligar o provedor para impedir signup.

SMTP, entrega real de e-mails, recuperação de senha ponta a ponta, templates/redirects de convite e eventuais limites adicionais/MFA não foram homologados. O SDK oferece [convite administrativo no servidor](https://supabase.com/docs/guides/auth/users), mas isso não comprova entrega/configuração do projeto. Não se enviou e-mail nem convite para descobrir esses valores; isso exige identidade/plano autorizado depois.

### Proposta de configuração separada — NÃO executada

- Desabilitar **somente cadastro público**: enable_signup true → false, mantendo login por e-mail ativo após confirmar o provedor.
- minimum_password_length 6 → 12.
- Definir Site URL e redirects exatos para a instância isolada aprovada; URL final ainda precisa ser informada/confirmada pelo proprietário. Não aplicar um localhost/preview inventado ou wildcard.
- Preservar confirmação de e-mail e rotação já ativas. Rever política de sessão/limites e fluxo de recovery antes da ativação; não habilitar recursos pagos automaticamente.

Esse conjunto não faz parte da autorização pedida para a migração. Não foi executado config push. A configuração local não foi sobrescrita.

## Auditoria de autenticação e correções comprovadas

Mantidos: cliente por requisição, cookies HttpOnly/Secure/SameSite no ambiente apropriado, getAll/setAll para chunks/refresh, auth.getUser autoritativo, perfil do mesmo UUID ativo, política central admin/atendente, autorização nas funções de servidor e RLS. Dados privados são no-store e não vão para chaves demo; sessão React/localStorage/metadata não concede direitos. No modo real não se montam módulos comerciais locais como fallback. A lista de funcionários é autorizada no servidor e limitada a 100 perfis.

Foram reproduzidos **quatro testes de regressão que falhavam no código anterior**, relacionados a dois problemas:

1. **Corrida entre login/logout e foco/polling.** Um evento de foco durante logout pendente consultava os cookies ainda válidos e podia restaurar perfil privado. Durante login, a consulta podia invalidar o resultado mais recente. Corrigido StaffSessionProvider: mutações de autenticação são exclusivas; revalidação é suspensa enquanto aguardam; logout remove imediatamente o perfil, mantém estado loading e só confirma signed-out após a resposta. O contador de requisições continua descartando respostas antigas.
2. **Sucesso falso e detalhe indevido no logout.** logoutStaff ignorava o campo error retornado pelo SDK e podia responder success:true sem confirmação; em exceção, propagava a mensagem upstream. Agora confere result.error, retorna erro genérico e limpa os cookies em finally tanto em retorno de erro quanto em exceção. Não exibe credenciais/detalhes internos e não confirma revogação que falhou.

Os testes reproduzidos passaram após a correção; o cenário de sucesso também foi preservado. Middleware CSRF existente não foi alterado ou desativado. Nenhum endpoint de convite foi improvisado e nenhuma chave administrativa foi usada no frontend.

### Limites da sessão e do logout

A correção protege o estado da aplicação e remove cookies locais, mas não promete invalidar criptograficamente JWTs já emitidos. Segundo a [documentação oficial de sign out](https://supabase.com/docs/guides/auth/signout), access tokens de sessão revogada podem permanecer válidos até expirar; a revogação afeta sessões/refresh tokens. O valor hospedado atual é uma hora. Pedidos já aceitos pelo servidor também podem terminar. RLS/rotinas continuam verificando perfil ativo em cada operação, de forma independente da interface.

O bloqueio de foco durante mutação é por instância do provider. Renovação/logout entre abas, troca de usuário, cookies efetivos e comportamento em navegador precisam de homologação na fase autorizada. Cada aba revalida em foco/60 segundos e cada operação privada passa pelo servidor; isso não equivale a uma comprovação de limpeza visual instantânea em todas as abas. Não foi adicionado um modelo de revogação imediata de JWT ou alterada a migração para isso.

## Auditoria da migração 00300

Arquivo **supabase/migrations/20261117000300_staff_access.sql**, sem modificação:

**SHA-256: c79e2a16a7e1411e52c6bf0789c41fa9ac88ea9aa2346e1aba0d483289d195e5**.

As migrações 00100/00200 mantêm os hashes previamente registrados e não foram reaplicadas.

| Item               | Conclusão da revisão e testes locais                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role writer        | NOLOGIN/NOINHERIT/NOBYPASSRLS, sem execução/login por papéis da API e sem privilégios comerciais                                                       |
| RLS técnica        | Policies de profiles/auditoria restritas ao papel técnico; sem UPDATE genérico para API                                                                |
| Auditoria          | Tabela private, INSERT apenas pelo escritor, sem acesso direto por API; imutável em UPDATE/DELETE/TRUNCATE                                             |
| Guard de profiles  | Substitui somente gate de linha de profiles; permite apenas escritor técnico, proíbe DELETE/alteração de identidade/created_at; updated_at do servidor |
| Wrappers           | manage_staff_profile/bootstrap de owner postgres; identidade obtida de auth.uid no wrapper, não do payload do navegador                                |
| Função interna     | Owner writer com privilégio mínimo; EXECUTE fechado para API; sem leitura direta do schema Auth                                                        |
| search_path        | Vazio nas funções revisadas; relações e chamadas sensíveis qualificadas                                                                                |
| Bootstrap          | Privado, owner-only, identidade Auth existente obrigatória, sem seed/trigger de signup, sem segundo bootstrap quando há admin ativo                    |
| Gestão             | Admin ativo obrigatório; sem autopromoção ou mudanças no próprio perfil; eventos transacionais auditados                                               |
| Concorrência       | Advisory lock e nova verificação do ator dentro da transação; teste real local de duas desativações concorrentes preservou um admin                    |
| Proteção comercial | Gates de pedidos/pagamentos/catálogo e TRUNCATE de profiles permanecem                                                                                 |

public.manage_staff_profile é chamável diretamente por admin autenticado após ativação do banco/perfil, **independentemente das flags da UI**. Isso é parte explícita do escopo aprovado, não uma autorização baseada em flags. Atendente, inativo ou identidade sem perfil não ganha direitos só por autenticar. A validação de soma de itens/pagamentos/transações de vendas continua fora deste módulo.

## Testes locais executados

Baseline antes das correções: **247 testes Vitest aprovados**. Novos testes: dois de concorrência do provider e três do handler de logout, total **252 testes em 17 arquivos**. Na reprodução intencional com código anterior, quatro falharam; após a correção passaram os 17 casos dos dois arquivos focais e a suíte completa. Não houve aumento de timeout, remoção de teste ou flexibilização de regra.

| Comando / escopo              | Resultado                                                                |
| ----------------------------- | ------------------------------------------------------------------------ |
| bun install --frozen-lockfile | Aprovado, sem mudar dependências/lockfile                                |
| bun run typecheck             | Aprovado                                                                 |
| bun run lint                  | Zero erros, nove avisos Fast Refresh anteriores                          |
| bun run test isolado          | **252 aprovados**, incluindo os 247 anteriores                           |
| bun run build                 | Aprovado, React/TanStack Start/SSR/Nitro/Lovable preservados             |
| git diff --check              | Aprovado                                                                 |
| Supabase start local          | Exit 0, status que contém chaves suprimido                               |
| pgTAP local                   | **155 aprovados em três arquivos**, zero falhas                          |
| auth:test-local               | **12 checks locais aprovados**, fixtures criadas pela execução removidas |
| supabase:check                | Ref autorizado confirmado                                                |
| supabase:dry-run              | Sucesso, somente 00300 pendente, nenhuma aplicação                       |

Docker foi incluído no PATH apenas dos comandos locais pelo caminho da instalação, sem alterar shell global. SQL e Auth integration rodaram exclusivamente no loopback 127.0.0.1:54322/54321, sem --remote nos testes. O helper recusa alvo Auth diferente do loopback. Não se executaram fixtures ou script Auth no hospedado. Nenhum dado anterior do usuário foi apagado; somente as próprias fixtures sintéticas foram limpas.

Avisos conhecidos não fatais de pgtap já existente e de grant_pg_cron_access/grant_pg_net_access permaneceram nos testes. Os GRANTs de fixture ficam na transação local e são revertidos. Não foram ampliadas permissões do provedor para esconder avisos. Não houve nova instabilidade intermitente da suíte completa isolada nesta execução; falhas de regressão eram reproduções determinísticas dos problemas corrigidos.

## Dry run e primeira aprovação — PARADA ATUAL

O dry run usou wrapper com alvo fixo **yzxsuoxthkbzbkcumauz** e **--skip-vault**. Retornou dryRun:true, upToDate:false e somente **20261117000300_staff_access.sql**; seeds:[] e roles:[]. A CLI declarou que as migrações não seriam enviadas. **roles:[] significa ausência de roles.sql adicional; a 00300 cria um role PostgreSQL dentro do próprio SQL.**

### Mudança exata autorizável

- Um role técnico vila_rica_staff_writer, sem login/herança/BYPASSRLS.
- Uma tabela private.staff_access_audit com RLS e dois triggers de imutabilidade/truncate.
- Quatro policies limitadas ao escritor técnico (três em profiles e uma de INSERT na auditoria).
- Funções guard_staff_profile_write, write_staff_profile, bootstrap_staff_admin e manage_staff_profile, com owners/EXECUTE revistos.
- Substituição apenas do trigger de linha foundation_block_write de profiles por guard restrito. Os bloqueios das demais tabelas e o gate TRUNCATE de profiles permanecem.
- SELECT/INSERT/UPDATE de profiles e INSERT de auditoria apenas para writer, mais USAGE necessário; CREATE/membership temporários para atribuir owner são revogados no fim.
- EXECUTE de manage_staff_profile a authenticated com verificação de admin ativo no banco; bootstrap/interna não são liberados para API. Nenhuma alteração em Auth.users, conta ou seed é executada pela migração.

### Procedimento após eventual aprovação específica

1. Reconfirmar projeto, ref, região, histórico, role/objetos ausentes e executor efetivo. A verificação via --read-only usa outro role e não comprova sozinha a sessão de DDL.
2. Conferir o hash exato acima e que 00100/00200 continuam aplicadas. Repetir dry run; interromper se o plano/arquivo/alvo mudou ou surgiu conflito.
3. Aplicar somente 00300 com comando compatível da CLI, alvo explícito e --skip-vault, sem include-all/seed/roles adicionais. Confirmar a operação somente depois da autorização. Este comando **não foi executado** nesta sprint.
4. Auditar histórico, role, owners, RLS/policies técnicas, guards, grants/EXECUTE e proteção comercial por consultas read-only. Não executar fixtures pgTAP no remoto.
5. Não criar ou vincular primeiro admin, configurar Auth, ativar flags/modo real ou publicar endpoints como consequência dessa aprovação.

### Riscos e recuperação

A RPC torna alterações de perfis possíveis para qualquer admin ativo autorizado, inclusive chamada direta fora da UI. Grants/defaults efetivos e objetos conflitantes devem ser reconferidos no momento da implantação. A tabela de auditoria passa a conter dados administrativos internos e requer política de retenção futura; não expor private para facilitar leitura.

O arquivo contém BEGIN/COMMIT. Em falha, interromper e inspecionar histórico/objetos read-only; não presumir atomicidade com housekeeping da CLI ou que uma desconexão signifique rollback após COMMIT. Não executar reset/drop/repair, apagar perfis ou editar migração aplicada. Qualquer recuperação que altere o remoto exige diagnóstico e autorização separados; usar nova correção versionada se a migração já tiver sido aplicada. Uma concessão temporária de role dentro da transação não justifica ampliar privilégios do provedor fora dela.

A aprovação pedida cobre **somente o arquivo 00300 no hash registrado**, para o projeto indicado. Não há aprovação recebida nesta Sprint 06.3B até a entrega deste relatório.

## Primeiro administrador e configurações — etapas separadas

Não foi criada identidade hospedada, executado bootstrap ou consultado inventário de contas/PII. O estado herdado é ausência de primeiro admin criado pelo fluxo do projeto. A migração pendente ainda não oferece bootstrap hospedado.

Após migração aprovada/aplicada/auditada:

1. Apresentar alteração Auth separada (signup false, senha mínima e URLs aprovadas), confirmar provedor e-mail e fluxo de recovery/convite. Não desabilitar login para bloquear signup. Conferir capacidade/limites de envio e implicações do plano Free sem contratar serviços.
2. Obter autorização específica para uma identidade administrativa e método (preferencialmente convite administrativo controlado ou criação no painel). E-mail real, senha ou tokens não entram em relatório público/chat de diagnóstico. Nenhum e-mail foi escolhido ou inserido neste documento.
3. Confirmar UUID/nome aprovados e executar a função privada bootstrap como owner somente após essa autorização. Sem service_role no navegador e sem admin automático para o primeiro signup.
4. Conferir profile ativo/admin e auditoria, mantendo confidencialidade dos dados; só então preparar instância isolada com Auth real e flags coerentes.
5. Homologar login, negativa de acesso, expiração/refresh, logout, múltiplas abas, troca de usuário, listagem/gestão e auditoria. Contas hospedadas adicionais exigem plano e autorização próprios. Não criar pedidos/pagamentos para testar Auth.

O botão Convidar funcionário permanece desabilitado; endpoint seguro de convite não está implementado/homologado. A autorização da migração não autoriza conta, bootstrap, e-mail, segredo, config push ou ativação do site.

## Homologação visual e limites

A ferramenta de navegador foi consultada e retornou **The browser access host is unavailable**. Não houve homologação visual desktop/mobile, cookies em browser real, foco/teclado, múltiplas abas ou login hospedado. As fases C/D/E não foram executadas, pois aguardam aprovações e configuração. Testes de componentes, transporte simulado, SDK local e pgTAP são evidências distintas e não equivalem a produção homologada.

O modo demo não foi desligado. Nenhum catálogo, PDV, pedido, pagamento ou dado comercial foi ativado no remoto. O projeto não é declarado pronto para vendas reais.

## Arquivos criados/modificados e próxima etapa

Criados: **docs/sprints/SPRINT-06.3B.md** e **src/test/auth-logout-server.test.ts**.

Modificados: **src/contexts/StaffSessionContext.tsx**, **src/services/auth/functions.ts**, **src/test/auth-interface.test.tsx**; documentação README, supabase/README, AUTENTICACAO, SEGURANCA, ARQUITETURA e MIGRACAO. Atualizações documentais são datadas; fatos anteriores são preservados. Migrações, .env.example/defaults, middleware, AGENTS/Lovable, dependências/lockfile, componentes comerciais, preços/imagens e testes SQL permanecem intactos.

Estado final: working tree da branch de homologação, sem commit, push, merge ou publicação por esta execução. Próxima ação é obter **a primeira aprovação específica da 00300**. Configuração Auth/primeiro admin e homologação hospedada continuam pendentes e exigem os próximos pontos de autorização; a Sprint inteira não é declarada concluída com base apenas nesta pré-implantação.

## Referências primárias consultadas

- [Supabase — sign out e validade dos access tokens](https://supabase.com/docs/guides/auth/signout).
- [Supabase — administração de usuários e convites](https://supabase.com/docs/guides/auth/users).
- [Supabase — configuração geral de Auth](https://supabase.com/docs/guides/auth/general-configuration).
