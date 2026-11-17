# Sprint 06.1 — Fundação e modelagem do backend

Data: 16/11/2026. Branch: `feature/backend-fundacao`. Base: `origin/main`, commit `594923c` (`btn-adm`). Estado: preparação técnica concluída, sem backend provisionado ou prontidão de produção.

## Objetivo e escopo entregue

Preparar a futura integração Supabase/PostgreSQL sem alterar o frontend funcional. Lovable e suas configurações originais foram preservados; a Sprint 05.2 continua cancelada e sua branch não foi integrada nem usada como base. Não há banco, Auth, Realtime, Storage, SDK ou serviço pago ativado nesta etapa.

Entregues arquitetura de integração, modelo relacional, ER, dicionário de dados, proposta SQL apenas em Markdown, índices/restrições, planejamento de RLS/privilégios, autenticação, transações/idempotência, importação idempotente e critérios para a Sprint 06.2. Código de preparação é isolado: nenhuma tela/provider passou a usá-lo.

## Preparação e auditoria

Git inicialmente limpo na main, sincronizada com origin/main após fetch. Branch dedicada criada sem alterar main, descartar dados/alterações ou reescrever histórico. Lidos AGENTS.md, README.md, VALIDACAO-MVP.md, relatórios 02/03/04/05/05.1 e consolidado do MVP, além de catálogo/inventário. O relatório inicial está em VALIDACAO-MVP.md; não há relatório separado de Sprint 01 no repositório.

Instalação congelada aprovada, sem alteração do bun.lock. Antes da implementação passaram **170 testes em 11 arquivos**; o número 169 citado no escopo corresponde à etapa anterior às últimas mudanças de apresentação/acesso administrativo.

Auditados tipos, contratos, serviços locais, dataStore/cartStore/adminSessionStore/counterCartStore, persistent-store, regras puras, providers/carrinhos, seed e imagens, rotas/consumidores e middleware. A interface usa operações de serviço, mas leitura reativa ainda depende de StoreContext/dataStore; carrinhos também acessam catálogo local diretamente. Apenas trocar o cliente de banco não basta. Foram documentados riscos de concorrência, perda de durabilidade em falha de localStorage, parser superficial, numeração MAX local e ausência de autenticação real. Nenhuma dessas limitações foi mascarada como resolvida.

## Arquitetura e modelagem propostas

- Providers/serviços locais continuam ativos. Backend futuro terá composição explícita, adaptador próprio e erros sem fallback para pedidos fictícios.
- Fronteiras de pedidos públicas e da equipe separadas; pública retorna projeção sem dados pessoais, IDs internos, observações ou operador. Consulta remota por token imprevisível, nunca só pelo número.
- Profiles vinculados a auth.users; categorias/produtos com UUID e source_id; código comercial não único. Orders/items/history/payment_events preservam snapshots e trilha. Dados pessoais, hashes de tracking e reservas de idempotência em schema privado.
- Valores bigint limitados ao intervalo seguro JS, quantidades 1–99, identity concorrente, FKs RESTRICT, desativação lógica e timestamps com timezone. Fuso proposto America/Porto_Velho depende de confirmação; frontend segue comportamento atual.
- Uma operação transacional recalcula catálogo e compara quote sob locks, grava pedido/itens/histórico/pagamento e responde de modo idempotente. Chave preservada nas retentativas, conflitos de payload rejeitados, resposta protegida recuperável após timeout. Não usa MAX+1 remoto.
- RLS/grants mínimos e RPCs autorizadas, funcionário ativo, papéis admin/atendente, sem promoção própria ou cadastro público de admin. Sessão demo não concede autorização remota.
- Recebimentos append-only, um evento pelo total; troco não é faturamento. Cancelamento pago não faz estorno, e métricas continuam agrupadas pela criação, excluindo cancelados.

## Código preparado e testes novos

`parseBackendPlan` recebe configuração explicitamente, mantém local por padrão, rejeita modo inválido/configuração remota incompleta/URL insegura/chave secreta ou legada e não cria conexão. `.env.example` tem placeholders; não ativa backend. Nenhuma variável real foi criada ou lida. A chave pública proposta usa formato publishable; compatibilidade JWT legada exige revisão futura.

Contratos remotos exigem quote e chave de tentativa, separam leitura pública e operações da equipe e não incluem reset de dados. Tipos não implementam nem garantem validação ou autorização de banco.

`createCatalogImportManifest` produz conteúdo determinístico a partir das funções de catálogo existentes, com oito categorias e 57 produtos; preserva preço, nome, descrição, disponibilidade, ordenação, caminhos e origem. Não usa createSeedStore, pedidos ou dados do navegador. Mantém dois produtos distintos de código 362. Não executa importação remota nem altera seed.

**18 testes novos** cobrem configuração local/remota sem rede, rejeição de modo/configuração/URL/chaves inválidos, erro sem vazamento de credencial, manifesto exato 8/57, campos/vínculos/preços, duplicidade 362, determinismo sem mutação de armazenamento e existência física das 57 imagens. Os 170 testes anteriores permanecem intactos.

## Arquivos criados e modificados

Criados:

- `.env.example`
- `src/services/backend/config.ts`
- `src/services/backend/contracts.ts`
- `src/services/backend/catalog-manifest.ts`
- `src/test/backend-foundation.test.ts`
- `docs/backend/ARQUITETURA.md`
- `docs/backend/MODELAGEM.md`
- `docs/backend/PROPOSTA-SQL.md`
- `docs/backend/SEGURANCA.md`
- `docs/backend/MIGRACAO.md`
- `docs/sprints/SPRINT-06.1.md`

Modificado: `README.md`, com referências ao pacote de preparação e resultados desta etapa. Nenhum arquivo funcional existente, asset, chave de storage, dependência, lockfile, .lovable, AGENTS.md ou vite.config.ts foi alterado. Nenhum arquivo de migração gerenciado foi criado/editado.

## Validações executadas

| Verificação                              | Resultado                                                     |
| ---------------------------------------- | ------------------------------------------------------------- |
| `bun install --frozen-lockfile`          | Aprovado; lockfile preservado                                 |
| Testes antes de implementar              | 170 aprovados em 11 arquivos                                  |
| `bun run typecheck`                      | Aprovado, exit 0                                              |
| `bun run lint`                           | Aprovado, 0 erros e 9 avisos preexistentes Fast Refresh       |
| `bun run test`                           | 188 aprovados em 12 arquivos: 170 anteriores + 18 novos       |
| `bun run build`                          | Aprovado, cliente/SSR/Nitro com configuração original Lovable |
| `git diff --check`                       | Aprovado                                                      |
| Navegador real                           | Tentado; host de acesso indisponível                          |
| Banco, RPC, RLS, Auth, importação remota | Não executados: nenhum banco configurado                      |

Os testes anteriores incluem jornadas online, administrativa, gestão do catálogo e PDV com componentes/contextos/serviços reais e Router em memória/jsdom. São regressões automatizadas, não homologação visual. Não foram verificadas resoluções reais, console de browser, impressão ou recarga visual nesta sprint. Build pode manter os avisos conhecidos do scaffold; plugins não foram alterados. Nenhuma publicação foi realizada.

## Riscos, limitações e pendências

- SQL é proposta incompleta para implantação: funções de escrita, triggers de integridade diferida/imutabilidade, grants finais e endpoints ainda serão implementados e testados no banco autorizado. A base documentada nega escrita direta até isso ocorrer.
- Regras Zod/JS atuais não substituem a implementação autoritativa de validação/concorrência no servidor. Testes desta etapa não comprovam transações, RLS ou Auth reais.
- Confirmar permissões de edição do catálogo (proposta: admin), disponibilidade comercial inicial, fuso, retenção de dados pessoais, prazo do token e política de replay/tombstones.
- Resolver gestão de contas, bootstrap/último admin, sessões SSR, rate limit distribuído, auditoria de mudança de papel, recuperação de token e Secrets de cifragem pelo Lovable antes de ativar operações.
- Mapear IDs de origem para UUID remotos sem reaproveitar carrinhos demo automaticamente, mantendo revisão explícita. Não importar pedidos fictícios nem dados pessoais locais.
- Revisão visual e testes ponta a ponta em dispositivos reais permanecem pendentes por indisponibilidade do host.
- Não foi solicitada autorização de provisionamento nesta sprint, pois o escopo é preparação. Nenhum envio de mensagem ao Lovable, alteração de conta/serviço ou desconexão foi realizado.

## Próxima etapa e Git final

Sprint 06.2: obter aprovação da proposta e autorização para projeto de desenvolvimento; aplicar schema pelo fluxo Lovable autorizado; implementar e testar RLS/RPCs/triggers/idempotência e Auth; importar apenas catálogo aprovado; então adaptar provider/serviços sem fallback e homologar jornadas. Seguir checklist em ARQUITETURA/SEGURANCA/MIGRACAO. Produção exige aprovação posterior, backups/recuperação e homologação real.

Alterações mantidas no working tree de `feature/backend-fundacao`, sem commit, push, merge, force push ou publicação nesta execução. Main e branch de refatoração não foram alteradas. Nenhum dado persistido foi excluído.
