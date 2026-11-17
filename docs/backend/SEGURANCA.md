# Segurança e autenticação propostas

## Estado reconferido — Sprint 06.2C (17/11/2026)

As duas migrações de fundação **já estavam aplicadas**, após autorização explícita na etapa anterior. A conferência desta sprint foi somente de leitura/dry run no remoto: histórico com ambas as versões, hashes esperados, **upToDate: true e migrations: []**. Não houve nova aplicação, reparação, importação ou alteração de configuração. O texto histórico abaixo que menciona aplicação pendente deve ser lido conforme esse estado atualizado.

A stack local iniciou normalmente e passou nos **121 testes SQL**. A suíte da aplicação passou nos **200 testes na repetição isolada**; a primeira execução concorrente teve nove falhas, registradas sem alterar testes/timeouts. A auditoria hospedada reconfirmou dez tabelas/RLS/PKs, 71 constraints, 33 índices, nove policies de leitura e vinte triggers ALWAYS, com bloqueio de escrita para os papéis de API e proteção das tabelas privadas.

A ausência de grants privados foi comprovada; a lista completa de “Exposed schemas” da Data API hospedada não foi comprovada pela consulta de parâmetros/diff e permanece como verificação operacional antes de ampliar acesso. Não confundir configuração local com remota. Frontend e Lovable continuam preservados, sem SDK/Auth real/vendas remotas. Ver [relatório 06.2C](../sprints/SPRINT-06.2C.md) para evidências, divergência documental, avisos e limites. Nenhuma nova autorização de aplicação é solicitada para migrações já executadas; mudanças futuras exigem plano próprio.

## Estado validado — Sprint 06.2B

Em 17/11/2026, a fundação passou em PostgreSQL local 17.11: **121 testes SQL em dois arquivos (34 anteriores + 87 novos)** e **200 testes da aplicação**. Foram conferidos RLS nas dez tabelas, vinte triggers ALWAYS, privilégios efetivos, owner dos helpers e search_path vazio, papéis ativos/inativos e bloqueio de acesso direto às três tabelas privadas. A modelagem e as duas migrações não precisaram de correção.

O remoto `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1) foi inspecionado somente em read-only e por dry run: as duas migrações estão pendentes, sem tabelas public/private ou funções conflitantes encontradas. A aplicação hospedada **aguarda aprovação explícita**. Não confundir testes locais com comprovação de RLS hospedada. O frontend continua local, sem SDK/Auth real ou operações de venda. Os controles de RPCs/transações/retenção e os fluxos de autenticação abaixo continuam proposta futura, não foram liberados por esta validação.

Ver [Sprint 06.2B](../sprints/SPRINT-06.2B.md) para auditoria, limitações, hashes e plano de implantação/recuperação. O texto das etapas anteriores abaixo é contexto histórico e planejamento, sujeito a esse estado atualizado.

> Atualização Sprint 06.2A: para o Supabase externo `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1), vale a exceção específica de AGENTS.md. A administração ocorre pela CLI do proprietário, sem modificar o bloco gerenciado do Lovable. As migrações versionadas de fundação estão preparadas, mas não foram aplicadas ao remoto. A proposta histórica abaixo não é uma migração pronta. Ver [Sprint 06.2A](../sprints/SPRINT-06.2A.md).

Não há autenticação real nem banco configurado. Esta é uma especificação de segurança para implementação/teste na Sprint 06.2, não uma garantia de que RLS já está em operação. A sessão local atual permanece intacta e jamais poderá autorizar acesso ao backend futuro.

## Matriz de permissões

| Recurso / operação                              | Público não autenticado                           | Atendente ativo                                      | Admin ativo                                                   |
| ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Catálogo publicado                              | Leitura de categorias ativas/produtos disponíveis | Leitura, inclusive catálogo operacional              | Leitura, inclusive inativos                                   |
| Criar/editar/desativar catálogo                 | Negado                                            | Negado (proposta de menor privilégio)                | Operação controlada validada                                  |
| Criar pedido online                             | Endpoint limitado; pagamento pendente             | Mesmo endpoint público, sem elevação por payload     | Mesmo endpoint público                                        |
| Criar pedido balcão                             | Negado                                            | RPC autenticada, retirada, ator real                 | Igual                                                         |
| Listar pedidos/itens/histórico                  | Negado                                            | Leitura operacional paginada                         | Igual                                                         |
| Dados pessoais do pedido                        | Negado                                            | Endpoint por pedido, mínimo operacional              | Igual, com auditoria                                          |
| Avançar/cancelar pedido                         | Negado                                            | Máquina de estados no servidor                       | Igual, sem contornar estados finais                           |
| Registrar recebimento                           | Negado                                            | Comando atômico e auditado                           | Igual                                                         |
| Editar/excluir pagamentos, itens ou histórico   | Negado                                            | Negado                                               | Negado                                                        |
| Acompanhar pedido                               | Token imprevisível, projeção restrita             | Mesmo acesso limitado ou consulta interna autorizada | Igual                                                         |
| Perfis                                          | Negado                                            | Próprio perfil ativo, sem escrita de privilégios     | Listagem/gestão por fluxo controlado                          |
| Criar funcionário/promover/desativar            | Negado                                            | Negado                                               | Endpoint administrativo; nunca update direto                  |
| Restauração demo / importação de pedidos locais | Sem acesso remoto                                 | Negado                                               | Negado; seed comercial por operação de implantação autorizada |
| Storage comercial futuro                        | Apenas leitura de assets publicados               | Leitura                                              | Upload validado autorizado                                    |

Política proposta de catálogo somente admin deve ser confirmada com o proprietário. Usuário autenticado sem profile ativo equivale a público para catálogo e não recebe operações de equipe. Papel é lido de profiles, nunca de user_metadata editável pelo usuário ou do localStorage. Service role não é conta de operador.

## RLS e fronteiras

Todas as dez tabelas da proposta têm RLS habilitada, inclusive as três privadas; ausência de policy/grant equivale a negar acesso. Anon não tem SELECT em pedidos/itens/perfis/histórico/pagamentos, nem INSERT público direto. Tabelas privadas ficam fora dos schemas expostos pela Data API. Grants restritos são necessários além de RLS. Não criar view pública que ignore RLS; eventual view requer security_invoker e revisão de projeção. Política de leitura pública de products exige disponibilidade e categoria ativa.

Funcionários ativos podem ler a fila compartilhada (uma padaria); dados pessoais ficam em tabela separada, disponíveis via endpoint autenticado para uma operação necessária. Não emitir payload completo de dados privados no Realtime. Perfil/role alterado deve surtir efeito imediatamente pela consulta de active/role no servidor e RLS, mesmo que o JWT ainda seja válido.

As RPCs de escrita usam SECURITY DEFINER somente quando necessário, owner mínimo revisado, `search_path = ''`, nomes qualificados, EXECUTE revogado de PUBLIC e autorização dentro da função. Não aceitar actor_id ou papel de argumento. Helpers de RLS precisam evitar recursão em profiles. Exemplos constam na [proposta SQL](PROPOSTA-SQL.md). Service/secret keys ficam exclusivamente no servidor gerido pelo Lovable; se uma operação elevar privilégios, a verificação real de usuário/papel continua obrigatória antes de chamar o banco.

Esses controles seguem a orientação de [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) e de [privilégios de funções](https://supabase.com/docs/guides/database/functions). A configuração e as políticas precisam ser testadas como anon, usuário comum, atendente, admin e funcionário inativo; execução no SQL editor como owner não comprova isolamento.

## Autenticação de funcionários

Supabase Auth com e-mail/senha e contas individuais. Sem cadastro público de equipe/admin; desabilitar signup público e criar/convidar via endpoint administrativo autenticado. Bootstrap do primeiro administrador por operação única autorizada, não primeiro usuário cadastrado. Nunca usar perfil default admin ou confiar em dados enviados ao signUp.

Recuperação de senha com mensagens que não confirmem existência de conta, redirects de callback explícitos, tokens de uso único e prazo curto geridos pelo Auth. No SSR, usar integração apropriada de cookies seguros HttpOnly/Secure/SameSite quando aplicável, verificando JWT no servidor com biblioteca oficial; não considerar somente getSession/localStorage como prova de identidade. Planejar renovação e expiração sem reaproveitar dados privados entre requests SSR. Logout limpa cache privado/canais/sessão real; não apagar dados locais demo silenciosamente. Não copiar rascunhos contendo dados pessoais entre operadores.

Desativação: alterar active por comando admin, impedir novas operações imediatamente no banco, encerrar/revogar sessões quando suportado e invalidar canais/cache. Não excluir profile referenciado por pedidos. Impedir desativar o último admin ativo. Trilha de mudanças de papel/perfil precisa ser incluída no fluxo de gestão antes de liberar administração real.

## Ameaças e respostas propostas

| Risco                                    | Controle no backend / critério de teste                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Preço/total adulterado                   | Recalcular catálogo sob locks e comparar quote; rejeitar preço arbitrário e alteração durante envio                     |
| Categoria inativa / produto indisponível | Validação dentro da transação, não só na UI                                                                             |
| Escalada de privilégio                   | profile protegido, active/role autoritativos, RPC com identidade verificada, testar metadata/payload forjados           |
| Enumeração de pedidos                    | Número nunca consulta pública; token 256 bits, hash, prazo, resposta genérica para ausente/expirado                     |
| Vazamento pessoal                        | DTO allowlist, tabelas privadas, sem nomes/telefone/endereço/notas/token em logs, canais ou métricas                    |
| Duplicação/timeout                       | Chave por tentativa + hash + reserva única + replay do mesmo resultado; testar concorrência                             |
| Corrida de status/pagamento              | Row lock e versão; teste simultâneo de pagamento/cancelamento/avanço                                                    |
| Edição histórica                         | Grants mínimos e triggers imutáveis; testar updates diretos inclusive por papéis operacionais                           |
| Abuso automatizado                       | Rate limit distribuído antes de RPC, limite de corpo/linhas, backoff e desafio progressivo                              |
| CSRF / token vazado                      | Preservar middleware CSRF, verificar origem; token via corpo POST, Cache-Control no-store e Referrer-Policy no-referrer |
| Erro de rede mascarado                   | Não usar fallback local; preservar carrinho e tentativa; distinguir falha de resultado desconhecido                     |
| XSS / URL de imagem                      | React escaping, sem HTML arbitrário; manter validação HTTPS/galeria e política de conteúdo revisada                     |

## Operações públicas e limites propostos

Criar endpoint servidor para online e outro para consulta por token, sem RPC anônima de escrita. Proposta inicial para homologação: criação 5 tentativas/minuto e 30/hora por origem pseudonimizada; consulta 30/minuto por origem/token; payload 64 KiB, até 100 linhas, quantidade 1–99. Tentativas repetidas válidas também passam pelo limitador para evitar abuso. Ajustar números conforme carga real e acessibilidade, com monitoramento de falsos positivos. Não é regra funcional já imposta ao frontend local.

Limitador compartilhado e atômico, não Map por processo em ambiente distribuído. Infraestrutura a escolher com orçamento autorizado; não contratar serviço nesta sprint. Hash de IP com sal rotativo e retenção curta; não registrar telefone/endereços em log. Responder 429 com Retry-After, proteger endpoints Auth/recovery conforme limites do provedor e aplicar desafio progressivo se necessário. HTTPS, origem validada e limite de duração/tamanho antes de qualquer chamada privilegiada.

Token de tracking de 32 bytes CSPRNG em base64url; salvar SHA-256, expiração proposta 30 dias, revogação controlada e comparação sem mensagens diferentes para token desconhecido/expirado. Endpoint só retorna PublicOrderTracking e não inclui notas, dados pessoais ou ator. Preferir token no fragmento ou estado local com POST para consulta; se houver link com token na URL, remover antes de analytics/requisições e proibir logs/referrers/caches. Não colocar token em canais públicos. Número isolado não deve resolver nem confirmar existência de um pedido remoto.

## Testes de segurança a executar após autorização

- Todos os papéis e RLS/grants, incluindo acesso direto REST, joins, views, RPCs e usuário desativado.
- SQL injection/payload extra, role e uid forjados; função definer com search_path malicioso; promoção pelo próprio usuário.
- Consultas por número, token aleatório/expirado/revogado, respostas sem PII, logs sem chaves e replay sem vazamento.
- Concorrência/idempotência com resposta perdida após commit e mesma chave com conteúdo/ator divergente.
- Atualização direta de snapshots/histórico/eventos e pagamentos duplicados/cancelados; rollback após falha em cada etapa.
- Limites distribuídos, 429, limite de corpo, cookie/origin/CSRF, logout e SSR sem dados entre usuários.

Nada disso foi declarado aprovado nesta sprint. Sem banco/Auth configurados, testes de TypeScript/jsdom não comprovam segurança de produção. Retenção, backups, restauração, alertas, proteção de dados e revisão operacional são condições antes de produção.
