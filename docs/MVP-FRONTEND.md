# Padaria Digital — Estado consolidado do MVP frontend

Referência: Sprint 05, 16/11/2026. Frontend demonstrativo para uma única padaria. Não adequado para produção e sem dados pessoais reais.

## Módulos disponíveis

| Área             | Rotas                    | Estado funcional                                                               |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Cardápio         | `/`                      | Pesquisa, categorias ativas, imagens, preços e disponibilidade                 |
| Carrinho online  | `/carrinho`              | Quantidades, notas, revisão de preço e remoção de inválidos                    |
| Checkout online  | `/checkout`              | Validação, retirada/entrega, pagamento ao receber, prévia conferida e registro |
| Acompanhamento   | `/acompanhar?numero=...` | Consulta local, resumo sem dados pessoais, status e histórico                  |
| Acesso da equipe | `/admin/acesso`          | Sessão demo sem senha/autenticação real                                        |
| Dashboard        | `/admin`                 | Indicadores de hoje, sete dias, origens, status e recentes                     |
| Pedidos          | `/admin/pedidos`         | Kanban/lista, filtros, detalhes, avanço, cancelamento e recebimento            |
| Produtos         | `/admin/produtos`        | Cadastro/edição, imagens, categorias, preços, disponibilidade e filtros        |
| Categorias       | `/admin/categorias`      | Cadastro/edição, ativação/desativação confirmada, vínculos preservados         |
| PDV              | `/admin/balcao`          | Atendimento próprio, troco demo, registro na fila, confirmação e comprovante   |

## Jornadas

Cliente: cardápio → adicionar → carrinho → revisar preços/itens → checkout com dados fictícios → confirmação → acompanhamento. Entrega exige endereço; retirada não. Pagamento inicial pendente. Não há cobrança, prazo inventado ou exposição de telefone/endereço na consulta por número.

Equipe: acesso demo → dashboard → pedidos → localizar pedido → detalhes → avanço sequencial ou cancelamento confirmado → registro de recebimento confirmado. Pedidos online e balcão compartilham a fila e o modelo de domínio. Acompanhamento/indicadores reagem às alterações locais.

Catálogo: produtos/categorias → cadastrar/editar/disponibilizar → confirmar desativação quando necessário → cardápio reflete mudanças → carrinhos revisam valores e bloqueiam itens inválidos. Histórico de pedidos não muda.

Presencial: acesso demo → PDV → pesquisa/seleção → itens/notas/cliente opcional → revisar resumo → forma/situação do pagamento → dinheiro recebido opcional e troco → registro → confirmação/comprovante → nova venda ou fila → preparar → pronto → concluir. Pagamento pendente pode ser recebido depois, inclusive após conclusão do preparo.

## Arquitetura

React/TypeScript com TanStack Start/Router e Vite, Tailwind v4, shadcn/ui/Radix, Lucide e Recharts. Bun e lockfile congelado; Vitest com jsdom e Testing Library. Paleta, Poppins e Inter existentes preservados.

Rotas por arquivo em src/routes, componentes públicos/administrativos/compartilhados separados, contratos em services/contracts, implementação local em services/local. StoreContext e stores externos com useSyncExternalStore alimentam telas reativas; SSR expõe carregamento para evitar divergência de hidratação. Providers e serviços ainda dependem da persistência local, portanto uma integração remota precisará adaptar a leitura/atualização reativa, não apenas trocar métodos.

Regras puras em lib/orders e lib/catalog, schemas Zod e valores inteiros seguros em centavos. BuildOrderItems usa o catálogo atual e gera snapshots; assertOrderQuote confere o resumo confirmado. No PDV a prévia inclui categoria opcional, fora do modelo Order. UI não altera diretamente pedidos/localStorage.

## Persistência e sessão

Produtos/pedidos: `padaria-digital:demo:store:v1`. Carrinho público: `padaria-digital:demo:cart:v1`. Sessão: `padaria-digital:demo:admin-session:v1`. PDV: `padaria-digital:demo:counter-cart:v1`.

O PDV persiste itens, referências revisadas, dados opcionais e pagamento em andamento. Logout/login/navegação não descartam o atendimento. Limpar exige confirmação; sucesso limpa itens e conserva ID/auxílio de troco da última venda para reexibir a confirmação sem reenviar. Nova venda descarta essa confirmação auxiliar; o pedido registrado permanece na fila. Não existe isolamento por operador.

Abas do mesmo navegador podem receber eventos de storage; não há sincronização entre dispositivos nem transações contra concorrência. Limpar o armazenamento apaga dados locais. Armazenamento indisponível pode resultar em estado apenas em memória. Rascunho do PDV é validado por Zod; catálogo/pedidos ainda possuem validação estrutural superficial. Corrupção de rascunho reinicia o estado.

## Integridade e finanças demonstrativas

Retirada/balcão: pendente → em preparação → pronto → concluído. Entrega inclui saiu para entrega. Estados finais não reabrem/avançam/cancelam. Pagamento é independente e só aceita marcação quando ainda pendente e não cancelado. Cancelar pedido pago não faz estorno; mantém o dado e exclui o cancelado dos totais válidos.

Valor de pedido vem do catálogo, não do preço enviado pela UI. Os fluxos online e PDV passam prévia ao serviço e rejeitam mudanças relevantes no registro, preservando carrinhos. Preço/nome/categoria/disponibilidade atualizados não alteram snapshots anteriores. Chamadas legadas dos serviços sem prévia continuam recalculando sem comparação, por compatibilidade.

Dinheiro entregue/troco são auxiliares, nunca faturamento. Vendas pagas somam o total de pedidos não cancelados marcados como pagos e são agrupadas pela data de criação, não pela data efetiva do recebimento. Ticket médio usa pedidos válidos, pagos ou não. Fuso é o do navegador.

## Homologação

Critérios automatizados: rotas/proteção, regras, jornadas de cliente/equipe/catálogo/PDV com providers e serviços reais, erros sem perda, limites monetários/quantidades, snapshots, independência/persistência de carrinhos, mudanças de catálogo e prevenção de cliques duplicados. A suíte das sprints anteriores é mantida.

A Sprint 05 passou com 146 testes em 9 arquivos (109 anteriores + 37 novos), typecheck e build aprovados, lint com zero erros/nove avisos preexistentes e diff sem erros. A instalação com lockfile congelado também passou. Resultados e escopo dos testes estão no [relatório](sprints/SPRINT-05.md). Typecheck, lint, testes, build e diff devem passar para considerar a revisão técnica concluída. Testes de integração usam Router em memória/jsdom; não são testes ponta a ponta de navegador.

A tentativa visual desta sprint encontrou o host do navegador indisponível. Permanecem sem homologação real: desktop/tablet/celular, toque, overflow/foco em dispositivos, console, reload do navegador e impressão/preview. Persistência foi testada em novas instâncias do store e navegação/remount no jsdom; print é apenas uma chamada interceptada no teste.

## Requisitos para backend e produção futura

- Definir modelo/schema, migração e descarte dos dados fictícios, com alterações de banco pelo Lovable conforme AGENTS.md.
- Autenticação real, papéis de equipe, autorização por operação, RLS e consulta pública com acesso restrito a dados necessários.
- Validação completa server-side, cálculo/preços/quantidades/status como fonte da verdade, numeração transacional e concorrência.
- Transações e idempotência para criação de pedidos, atualizações e recebimentos; persistência durável e recuperação de falhas.
- Transporte seguro, proteção de dados pessoais, logs/auditoria por operador, monitoramento e tratamento de erros sem exposição de segredos.
- Política de retenção, backups, testes de integração reais e operação multi-dispositivo.
- Homologação visual/ponta a ponta e acessibilidade em navegador real antes de qualquer uso operacional.

Esses itens são pendências, não integrações realizadas. Caixa financeiro, pagamentos online, fiscal/SEFAZ, impressoras térmicas, estoque, fornecedores e multi-tenant estão fora do MVP demonstrativo atual. A existência dos módulos frontend não autoriza operação de produção.
