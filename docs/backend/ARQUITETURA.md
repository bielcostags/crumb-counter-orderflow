# Arquitetura do backend — proposta da Sprint 06.1

## Fundação hospedada — atualização após autorização

Em **17/11/2026**, após aprovação explícita do proprietário e reconfirmação dos hashes/dry run, as duas migrações de fundação foram aplicadas em `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1). O histórico e a inspeção read-only hospedada confirmaram dez tabelas com RLS, 71 constraints, 33 índices, nove policies de leitura e vinte triggers ALWAYS. Não há permissões DML para anon/authenticated/service_role ou leitura direta das tabelas privadas; owners e search_path dos helpers foram conferidos.

O frontend permanece local, sem SDK, Auth real ou vendas remotas; nenhuma conta, produto ou pedido foi importado/criado. Os **121 testes SQL foram executados somente localmente**; no remoto foram conferidos metadados/privilégios, sem fixtures. A aprovação foi exclusiva para essa fundação, sem liberar operações de negócio ou configuração Auth. Ver [relatório e evidências de implantação](../sprints/SPRINT-06.2B.md). Os estados “aguarda aprovação” abaixo registram a fase histórica anterior a essa autorização.

## Estado validado — Sprint 06.2B

Em 17/11/2026, a fundação passou em PostgreSQL local 17.11: **121 testes SQL em dois arquivos (34 anteriores + 87 novos)** e **200 testes da aplicação**. Foram conferidos RLS nas dez tabelas, vinte triggers ALWAYS, privilégios efetivos, owner dos helpers e search_path vazio, papéis ativos/inativos e bloqueio de acesso direto às três tabelas privadas. A modelagem e as duas migrações não precisaram de correção.

O remoto `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1) foi inspecionado somente em read-only e por dry run: as duas migrações estão pendentes, sem tabelas public/private ou funções conflitantes encontradas. A aplicação hospedada **aguarda aprovação explícita**. Não confundir testes locais com comprovação de RLS hospedada. O frontend continua local, sem SDK/Auth real ou operações de venda. Os controles de RPCs/transações/retenção e os fluxos de autenticação abaixo continuam proposta futura, não foram liberados por esta validação.

Ver [Sprint 06.2B](../sprints/SPRINT-06.2B.md) para auditoria, limitações, hashes e plano de implantação/recuperação. O texto das etapas anteriores abaixo é contexto histórico e planejamento, sujeito a esse estado atualizado.

> Atualização Sprint 06.2A: para o Supabase externo `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1), vale a exceção específica de AGENTS.md. A administração ocorre pela CLI do proprietário, sem modificar o bloco gerenciado do Lovable. As migrações versionadas de fundação estão preparadas, mas não foram aplicadas ao remoto. A proposta histórica abaixo não é uma migração pronta. Ver [Sprint 06.2A](../sprints/SPRINT-06.2A.md).

Estado: preparação para revisão, sem Supabase provisionado, SDK instalado, conexão, autenticação real ou alteração do comportamento local. Lovable, SSR/Nitro, CSRF, rotas e ferramentas permanecem intactos. A Sprint 05.2 foi cancelada definitivamente.

## Auditoria do código atual

| Ponto                                    | Situação observada                                                                                       | Transição proposta                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `services/contracts.ts`                  | CatalogService, OrderService e DemoService agrupados em AppServices; prévia opcional por compatibilidade | Preservar legado local; contratos remotos segregam catálogo, público e equipe; prévia e idempotência obrigatórias |
| `services/local/index.ts`                | Revalidação após 250 ms; snapshots; sequência calculada em memória; limpa carrinho público no serviço    | Adaptador remoto não limpa carrinho; UI limpa só após resposta confirmada; SQL transacional calcula tudo          |
| `services/local/store.ts`                | StoreData agrega produtos/categorias/pedidos; parser externo superficial                                 | Cache remoto validado, consultas paginadas e separadas por permissão                                              |
| `StoreContext.tsx`                       | Importa dataStore e localServices diretamente; useSyncExternalStore; preenche imagens ausentes no store  | Injeção explícita de provider de dados; operação de preenchimento permanece exclusiva do modo local               |
| `CartContext.tsx`                        | Guarda linhas localmente; addItem busca preço diretamente em dataStore                                   | Carrinho local consulta catálogo do provider; referência de preço não autoriza gravação                           |
| `counter-cart.ts`                        | add/review leem dataStore, complete guarda referência local                                              | Receber catálogo pelo provider, preservar rascunho em falhas, confirmar por resposta remota                       |
| `CounterCartContext.tsx` / counter-store | Estado local próprio com parser Zod, última venda e troco                                                | Continuar local; futura chave de tentativa vinculada ao conteúdo e ao operador, sem alterar chaves atuais         |
| `AdminSessionContext.tsx`                | Booleano persistido sem identidade ou senha                                                              | Provider Supabase Auth separado; booleano demo nunca vira JWT ou papel                                            |
| `persistent-store.ts`                    | Cache por módulo, eventos storage entre abas, erro de escrita só avisa                                   | Apenas carrinhos/demo; nunca usar para confirmar pedido remoto ou como fonte de permissões                        |
| `orders.ts`, `catalog.ts`, `pos.ts`      | Cálculo seguro JS, disponibilidade, categoria, status, schemas, quote e troco                            | Reutilizar validação de UX; implementar e testar equivalentes autoritativos no servidor; troco segue auxiliar     |
| `mock.ts` / catalog-product-images       | 8 categorias, 57 produtos/imagens e pedidos fictícios separados                                          | Manifesto só de catálogo usando createSeedCategories/createSeedProducts; sem importar pedidos                     |
| `acompanhar.tsx`                         | Lê StoreContext por número, apesar de existir getOrderByNumber                                           | Remover dependência de listagem de pedidos no modo remoto; endpoint de token com DTO restrito                     |

As quatro chaves `padaria-digital:demo:store:v1`, `padaria-digital:demo:cart:v1`, `padaria-digital:demo:admin-session:v1` e `padaria-digital:demo:counter-cart:v1` são preservadas. Não existe transação entre elas, isolamento entre operadores ou garantia de concorrência entre abas. Falha de localStorage pode deixar alteração somente em memória. Nenhum dado do navegador foi lido para migração ou apagado nesta sprint.

## Fronteiras propostas

```mermaid
flowchart LR
  UI[React / TanStack Router] --> Provider[Provider explícito por ambiente]
  Provider --> Local[Serviços locais existentes]
  Provider -. futuro .-> API[TanStack server functions / API controlada]
  API --> Auth[JWT verificado + funcionário ativo]
  API --> RPC[Operações transacionais PostgreSQL]
  API --> Public[Catálogo / criação pública / token]
  RPC --> DB[(Supabase PostgreSQL + RLS)]
  UI --> Cart[Carrinhos locais independentes]
  DB -. invalidação autorizada .-> RT[Realtime restrito à equipe]
```

A seleção de backend será explícita no ponto de composição, sem fallback de remoto para local. Timeout significa resultado desconhecido: consultar/repetir a mesma tentativa, nunca gerar um pedido demo. O código desta sprint não altera StoreProvider nem lê variáveis de ambiente automaticamente. `parseBackendPlan` é uma função pura de preparação; configurar `.env` não ativa backend. Não há adaptador Supabase implementado.

## Contratos e integração futura

`src/services/backend/contracts.ts` define PublicOrderService, StaffOrderService, RemoteServices e PublicOrderTracking. O tipo público usa lista positiva de campos, omitindo IDs internos, operador, nome/telefone/endereço, observações gerais e por item. Não é um alias de Order nem uma subtração informal de campos sensíveis. A implementação terá que validar respostas em runtime e mapear snake_case/UUID/timestamps para domínio. Tipos não são autorização nem validação de payload.

Preservar CatalogService no legado; no remoto as operações de escrita requerem admin e listagens da equipe podem incluir inativos. Catálogo público lê somente categorias ativas e produtos disponíveis; se futuramente a UI quiser mostrar indisponíveis, definir outra projeção aprovada. StaffOrderService lista com cursor e limite (proposto 50, máximo 100), e usa versão esperada para detectar conflito. DTO remoto exigirá UUIDs, quantidades 1–99, notas <=200, nome <=60, nome online >=2, telefone normalizado com 10/11 dígitos e endereço de entrega 8–160; balcão nome opcional, sem exigir telefone/endereço.

Criar operações por intenção (`createOnlineOrder`, `createCounterOrder`, `updateStatus`, `markPaid`), nunca aceitar updates arbitrários em orders. UUID local de tentativa criado por Web Crypto no primeiro envio e preservado nos retries; após mudança de conteúdo confirmado, criar outra tentativa. Não reutilizar automaticamente um rascunho demo como venda remota. Chave de status/recebimento também deve persistir até resolver resultado incerto. A sessão real deve isolar/desvincular rascunhos de terminal de outro operador mediante confirmação, sem apagar dados antigos implicitamente.

Realtime é invalidação de cache da equipe autenticada, seguida de refetch autorizado. Desconectar canais ao sair/desativar; recuperar eventos perdidos por refetch. Não publicar tabelas privadas, token ou dados pessoais em canais anônimos. Acompanhamento inicialmente por polling limitado no endpoint de token; não publicar pedidos para usuários anônimos. Storage não é necessário para as imagens locais atuais; eventual bucket público somente para assets comerciais, upload exclusivo admin com validação de tamanho/MIME, sem nomes pessoais.

## Configuração e implantação futura

`.env.example` contém apenas placeholders comentados e modo local. `parseBackendPlan` aceita somente chave pública no formato `sb_publishable_...`, URL HTTPS sem credenciais/query/fragmento e falha em configuração remota inválida; não admite fallback. Chaves legadas JWT não são aceitas por esse contrato inicial; qualquer compatibilidade futura exige revisão. A validação de formato não prova legitimidade da chave/projeto. Não enviar o objeto de ambiente completo a logs ou bundle. VITE_* são públicas; nenhuma senha, connection string, chave secreta ou service_role pode ter esse prefixo.

Segredos permanecem sob gestão do Lovable no servidor. Ambientes dev/homologação/produção devem ter projetos e credenciais separados, redirects Auth permitidos explicitamente e CORS limitado. Preservar o middleware CSRF e tratar também autorização, origem, limites e erros no novo endpoint. Nada foi alterado em `.lovable`, AGENTS.md, vite.config.ts, dependências ou bun.lock.

## Sequência da Sprint 06.2

1. Aprovar modelagem/permissões, fuso operacional e política de retenção; autorizar projeto de desenvolvimento e custos.
2. Solicitar ao Lovable o esquema revisado pelo fluxo de banco autorizado; não copiar a proposta como migração pronta.
3. Implementar RPCs, triggers, grants, rate limits e testes reais em banco descartável; nenhum frontend remoto antes dessas barreiras.
4. Criar contas individuais de teste, bootstrap controlado de admin e autenticação; testar usuário inativo e tentativas de escalada.
5. Importar catálogo pelo manifesto revisado e dry run, sem pedidos/dados pessoais; mapear IDs e revisar carrinhos antes do corte.
6. Implementar adaptador, respostas validadas e provider injetável, testes de falha sem fallback e acompanhamento seguro.
7. Homologar jornadas, concorrência, idempotência, RLS, vazamento de dados, browser e recuperação antes de autorizar implantação.
