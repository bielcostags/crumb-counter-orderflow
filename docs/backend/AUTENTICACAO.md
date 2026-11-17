# Autenticação e funcionários — Sprint 06.3

## Pré-implantação de 17/11/2026 — Sprint 06.3B

A migração **00300 continua pendente no hospedado**, com SHA-256 original c79e2a16a7e1411e52c6bf0789c41fa9ac88ea9aa2346e1aba0d483289d195e5. O dry run listou somente esse arquivo; nenhuma aplicação, conta ou configuração Auth foi alterada. A execução parou no primeiro ponto de aprovação. As duas migrações anteriores permanecem aplicadas.

A Data API foi reconfirmada por leitura de configuração: public e graphql_public expostos; private aparece como opção no painel, mas **não está selecionado/exposto**. Auth remoto: signup público true, confirmação de e-mail true, senha mínima 6, Site URL http://localhost:3000 e sem redirects adicionais. Esses valores exigem revisão/autorização separada antes de criar a equipe. O provedor Email e entrega de recovery/convites não foram comprovados; o proprietário informou não conseguir conferir o provedor.

A auditoria corrigiu dois problemas de logout: foco/polling durante mutação podia restaurar estado privado; erro retornado pelo SDK podia ser tratado como sucesso. Agora há exclusão entre login/logout/revalidação, estado privado removido enquanto aguarda e erro sanitizado com cookies sempre limpos. Isso não promete revogação imediata de JWT já emitido antes de seu exp, nem substitui homologação entre abas/navegador.

Resultados: **252 testes da aplicação (247 anteriores + cinco novos), 155 SQL locais e 12 checks Auth locais**, typecheck/build aprovados e lint sem erros/nove avisos anteriores. Browser indisponível, modo demo preservado, nenhum login/conta/PDV hospedado ativado. Ver [Sprint 06.3B](../sprints/SPRINT-06.3B.md) para configurações observadas, riscos, plano exato e aprovações separadas. As notas anteriores abaixo são históricas e não antecipam autorização de ativação.

Estado em 17/11/2026: implementação/testes **locais**; modo demo continua padrão. Supabase hospedado mantém somente as duas migrações da fundação. Não foram criados funcionários/admins reais ou modificadas configurações Auth remotas.

## Fronteira de identidade e permissões

O servidor usa @supabase/supabase-js 2.119.0 e @supabase/ssr 0.12.7, com cliente novo por requisição. A aplicação não usa cliente administrativo/secret key. O cliente SSR usa somente a chave pública e cookies HttpOnly, Secure no alvo hospedado, SameSite=Lax e path /. Refresh escreve de volta todos os cookies/chunks pelo adaptador getAll/setAll do TanStack Start. Não há singleton de sessão, tokens em estado React ou escrita nas chaves demonstrativas de localStorage.

O desenho é servidor-centrado: login/logout e consultas são server functions do TanStack Start, protegidas pelo middleware CSRF já existente. Não foi necessário um createBrowserClient ou expor JWTs ao JavaScript. Toda resposta de sessão/dados privados usa Cache-Control private/no-store e Vary Cookie. Não registrar payload de credenciais. A integração usa os padrões de [Supabase SSR com TanStack Start](https://supabase.com/docs/guides/getting-started/quickstarts/tanstack) e [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), adaptados à abordagem exclusiva de cookies HttpOnly no servidor.

Cada operação privada chama **auth.getUser()**, depois busca profiles pelo mesmo UUID com a chave pública/sessão do usuário. Não usa getSession, user_metadata, parâmetros de URL, formulário ou localStorage para autorizar. Perfil inexistente, inativo, de UUID diferente ou papel inválido é negado. O retorno ao navegador é somente status e perfil mínimo (id, full_name, role, active), nunca tokens/senha. O banco reaplica RLS; a futura RPC de gestão também verifica o administrador ativo.

| Recurso no modo real                 | Visitante / inativo / sem perfil | Atendente ativo                                     | Admin ativo                                                              |
| ------------------------------------ | -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Cardápio público demonstrativo       | Disponível como antes            | Igual                                               | Igual                                                                    |
| Área operacional autenticada         | Negado                           | Acesso verificado; módulos remotos ainda bloqueados | Igual                                                                    |
| Produtos/categorias/funcionários     | Negado                           | Negado                                              | Área autorizada; negócios permanecem bloqueados                          |
| Lista de funcionários                | Negado                           | Negado pelo servidor                                | Leitura real de profiles via RLS, até 100 registros                      |
| Alterar perfil de outro funcionário  | Negado                           | Negado no servidor e na RPC                         | Só com flags da aplicação e migração liberadas; ver controles abaixo     |
| Alterar o próprio papel/ativação     | Negado                           | Negado                                              | Negado                                                                   |
| Criar/convocar identidade Auth       | Não disponível                   | Não disponível                                      | Interface preparada/indisponível; endpoint privilegiado não implementado |
| Pedidos, pagamentos, catálogo remoto | Bloqueado                        | Bloqueado                                           | Bloqueado                                                                |

permissionsForPath/mayAccess centralizam a política. beforeLoad consulta a sessão no servidor antes de carregar uma rota interna real. A UI também verifica a sessão/permissão e não renderiza conteúdo privado enquanto carrega ou em erro. No modo real, o pai /admin não monta os módulos comerciais locais como fallback: apresenta o estado “remotos ainda não liberados”. No demo, todos os módulos anteriores continuam intactos. A sessão demo não é aceita por nenhuma função de servidor de autenticação real.

## Login, refresh, expiração e logout

- Formulário real de e-mail/senha aparece somente no modo real. Valida campos, bloqueia envio concorrente e usa erro genérico para falha de credenciais/rede, sem confirmar existência de conta.
- Login Auth válido não basta: profile ativo/papel correto continuam obrigatórios.
- Sessão é inicializada por chamada de servidor; em SSR a UI fica sem conteúdo privado até a verificação. Revalidação ao focar a janela e a cada 60 segundos remove a árvore privada enquanto confere active/sessão.
- Toda leitura/mutação privada revalida no servidor, independentemente do intervalo da UI. Uma sessão visual ainda aberta não autoriza uma operação de usuário desativado.
- Logout remove imediatamente o perfil/árvore privada na UI, encerra a sessão Auth local e expira apenas os cookies vr-staff-auth*. Carrinhos, pedidos demo e chaves existentes são preservados. Erro de transporte no logout é exibido como saída não confirmada, não como sucesso fictício.
- Não há cache remoto persistido: a lista fica em estado do componente, destruído ao sair/revalidar, e respostas HTTP privadas não são compartilhadas. Contador de requisições impede que uma resposta antiga restaure identidade após logout.
- A revalidação periódica desmonta telas privadas e pode descartar rascunho de edição de funcionário ainda não confirmado; nenhum comando é reenviado automaticamente. Planejar eventual melhoria de UX sem manter dados privados de outro operador.

## Configuração explícita

Valores abaixo são apenas exemplos; nenhuma ativação real foi executada nesta sprint. Usar ambiente de teste separado. Para demo, VITE_AUTH_MODE=demo e AUTH_MODE=demo (default). VITE_BACKEND_MODE=local permanece preservado.

Para testar autenticação local: ambos os AUTH_MODE devem ser supabase, AUTH_TARGET=local, SUPABASE_URL=http://127.0.0.1:54321 e SUPABASE_PUBLISHABLE_KEY com a chave pública/anon da stack local. O formato JWT legado só é admitido para o alvo loopback quando o payload informa role anon; isso não substitui a validação da chave pelo Auth. Chave service_role é rejeitada na configuração da aplicação.

Para o alvo hospedado futuro: AUTH_TARGET=vila-rica-dev e URL **exatamente** https://yzxsuoxthkbzbkcumauz.supabase.co, com publishable key no formato sb_publishable_. Outros projetos/URLs são rejeitados. Configurar ambos os modos de forma coerente; modo inválido ou configuração incompleta falha fechado, sem conversão para demo. As variáveis não VITE_ devem existir no processo do servidor; Bun pode carregá-las do arquivo de ambiente local ignorado, e a hospedagem futura precisa configurá-las explicitamente.

VITE_STAFF_MANAGEMENT_ENABLED=true habilita o editor, e STAFF_MANAGEMENT_ENABLED=true permite o endpoint da aplicação. Defaults false. **Flags não são autorização nem bloqueiam RPCs diretas**: o banco controla acesso por identidade/perfil. Após migração/bootstrap aprovados, um admin ativo poderá chamar a RPC autorizada diretamente; a aprovação da migração deve considerar isso. O modo público de negócios continua local por desenho explícito, não por fallback de falha remota. Não usar a aplicação como sistema real de vendas.

## Migração nova e operação de perfis

`20261117000300_staff_access.sql` não modifica as duas migrações aplicadas. Prepara:

- Papel técnico vila_rica_staff_writer, NOLOGIN/NOINHERIT/NOBYPASSRLS, sem memberships para papéis da API. Sem privilégios comerciais ou acesso ao schema Auth.
- Policies somente para esse papel em profiles (SELECT/INSERT/UPDATE) e INSERT em private.staff_access_audit. Nenhuma policy de escrita para anon/authenticated/service_role.
- Função interna SECURITY DEFINER pertencente ao papel técnico, EXECUTE fechado para API. Wrappers confiáveis de postgres obtêm auth.uid() e passam a identidade à função interna; o navegador não escolhe actor_id.
- public.manage_staff_profile autoriza exclusivamente administrador ativo, valida entrada, só vincula UUID que já existe em Auth (FK), proíbe mudanças no próprio perfil e audita cada sucesso. Nenhum UPDATE genérico em profiles.
- Um advisory transaction lock serializa bootstrap e mudanças de papel/active. A identidade/ativação do ator é conferida depois do lock; tentativa de duas desativações concorrentes não elimina ambos os admins.
- O gate de linha de profiles é substituído por guard restrito ao papel técnico. Identidade/created_at não mudam; DELETE continua negado, e updated_at vem do banco. Gate de TRUNCATE e todos os gates comerciais anteriores permanecem.
- Auditoria privada append-only com actor/target, operação, papel/active anteriores/novos e instante. Sem credenciais. API não tem leitura/escrita direta; UPDATE/DELETE/TRUNCATE são bloqueados inclusive para owner em operações normais.

O papel técnico recebe CREATE/membership temporários somente para atribuir o owner da função interna; são revogados no fim da transação. O owner/DBA continua capaz de alterar DDL; essa não é uma proteção contra o administrador do próprio banco. Antes da implantação, confirmar permissões DDL e ausência de role conflitante; não ampliar privilégios do provedor para contornar erro. Os grants/defaults da fundação permanecem válidos para os papéis de API.

A suíte security_audit mantém 87 casos, mas duas verificações de policies foram refinadas para conferir ausência de policies de escrita/exposição **dos papéis de API**, considerando PUBLIC e herança/grants, em vez de proibir também policies do papel técnico não assumível. Nenhum teste foi removido. Os 34 casos novos verificam isolamento, RLS, bootstrap, promoção, auditoria e bloqueios comerciais.

## Bootstrap e criação de contas

**Nada é automático.** Não existe trigger de signup para criar perfil/admin e a migração não insere contas/perfis. O bootstrap só vincula uma identidade Auth já existente, por comando administrativo de postgres. private.bootstrap_staff_admin não tem EXECUTE para anon/authenticated/service_role. Rejeita repetição quando já há admin ativo, valida o alvo e registra evento de bootstrap sem fingir ator autenticado (actor null em operação de owner).

Procedimento futuro requer autorização específica adicional à migração:

1. Confirmar Data API e configuração Auth; desabilitar cadastro público de funcionários (“Allow new users to sign up”), revisar redirects e recuperação de senha, em alteração separada aprovada. Não desligar o provedor e-mail/senha para tentar bloquear apenas signup.
2. Criar/convidar a identidade inicial pelo fluxo administrativo Auth autorizado, sem divulgar senha, token ou service key. Nenhuma conta real foi criada nesta sprint.
3. Confirmar UUID e executar como postgres o bootstrap privado para esse único UUID/nome aprovados. Não passar esses dados por endpoint público ou frontend, nem executar via cliente anônimo/service_role.
4. Confirmar profile ativo/admin e auditoria; testar acesso com essa conta e rejeição de perfis ausentes/inativos.
5. Gestão de outras identidades Auth/convites exige endpoint servidor com credencial administrativa segura e autorização/compensação entre Auth e perfil. Esse endpoint permanece **não implementado**; o botão fica indisponível e não mostra sucesso fictício.

A função interna também permite a um admin vincular um profile a uma identidade existente por intenção controlada; a interface atual edita perfis já listados. O vínculo de identidade nova é procedimento administrativo preparado, não cadastro público. A lista é limitada a 100 registros; paginação e endpoint de convite são pendências explícitas.

## Evidências e limites

- Proprietário confirmou neste diálogo **public e graphql_public** em Exposed schemas; private não consta na lista informada. Evidência manual do proprietário, sem alegar que a CLI comprovou sozinha essa configuração. Nada foi alterado no remoto.
- Auditoria read-only inicial hospedada confirmou a fundação de dez tabelas/RLS, 71 constraints, 33 índices, nove policies, vinte gates e ausência de grants indevidos. Nova migração permanece pendente.
- 155 testes pgTAP locais: 121 anteriores + 34 novos. Replay dos três arquivos completos em DB descartável com contrato mínimo auth.users/auth.uid para testar DDL/policies: 155 aprovados; esse scaffold não foi chamado de Auth real.
- Integração separada com **Auth/REST/PostgreSQL reais da stack local**: 12 checks, login, perfis, cookie/requisição, refresh, logout, autopromoção e concorrência. Contas/dados sintéticos criados pela execução foram removidos; nenhum dado do usuário foi apagado. Chaves do teste ficam só em memória no script servidor local, nunca no browser/relatório.
- Testes de política/cookies/provider/rotas usam mocks apenas onde apropriado; não comprovam autenticação de produção.
- Navegador tentou acesso, mas host indisponível: sem homologação visual mobile/desktop, cookies em browser real, acessibilidade completa ou impressão. Nenhum endpoint foi publicado.

Comando de integração local (Mac com Docker Desktop): `env PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" bun run auth:test-local`. O script exige exatamente API_URL loopback; usa a chave administrativa **somente da stack local** para criar/remover suas próprias identidades fictícias e nunca a exibe. Não executar esse script contra o hospedado nem reaproveitar para contas reais.
