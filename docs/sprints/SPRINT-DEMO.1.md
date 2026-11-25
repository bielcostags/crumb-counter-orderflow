# Sprint DEMO.1 — Finalização para apresentação acadêmica

Data: 17/11/2026, America/Porto_Velho. Branch: **feature/demo-apresentacao**. Base: **origin/main, bd17afd85f2bd3c60def0eca7cb6021fa804ecbe**, merge do PR #11. Git inicialmente limpo; referências atualizadas com fetch antes de criar a branch. Nenhum commit, push, merge, alteração de histórico ou publicação foi realizado nesta execução.

## Escopo entregue

Demonstração local sem Docker, PostgreSQL ou Supabase: login com duas contas fictícias fixas, permissões por perfil, sessão persistida, ViaCEP opcional para preenchimento automático, dinheiro/troco no checkout e PDV, comprovante não fiscal e manual acadêmico. A autenticação real anterior foi preservada sem ativação. Não há cadastro/edição de contas demo.

### Contas e permissões

| Perfil        | E-mail fictício           | Senha pública        |
| ------------- | ------------------------- | -------------------- |
| Administrador | admin@vilarica.demo       | Admin@Demo2026       |
| Funcionário   | funcionario@vilarica.demo | Funcionario@Demo2026 |

| Recurso                                                      | Admin demo       | Funcionário demo |
| ------------------------------------------------------------ | ---------------- | ---------------- |
| Dashboard, indicadores e informações consolidadas existentes | Sim              | Não              |
| Pedidos, Kanban e atualização de andamento                   | Sim              | Sim              |
| Confirmação de recebimento/cancelamento demonstrativos       | Sim              | Sim              |
| PDV e comprovante                                            | Sim              | Sim              |
| Criar/editar produtos e disponibilidade                      | Sim              | Não              |
| Categorias e ativação                                        | Sim              | Não              |
| Gestão de contas reais                                       | Não no modo demo | Não              |

O login tem logo original, e-mail, senha, mostrar/ocultar, feedback de erro, link ao cardápio e bloco expansível com credenciais públicas. O contexto conserva o contrato da autenticação real e adiciona uma identidade **demo separada de StaffProfile**. O nome/papel aparece no cabeçalho. Funcionário entra em pedidos; admin entra no dashboard.

Mantida a chave de sessão existente. O parser aceita somente identidade canônica de uma das duas contas e reconstrói a sessão sem senha. Sessões antigas contendo apenas signedIn:true são invalidadas; não recebem privilégio por migração. Login sem credenciais é rejeitado. Logout limpa somente a sessão, preservando carrinho público, pedidos, catálogo e rascunho de balcão. A reidratação é testada pelo parser real via evento storage. As contas são locais e adulteráveis por alguém com acesso ao navegador: isso não substitui autorização de backend.

As restrições são aplicadas no menu, no gate de rotas antes de montar telas privadas e no hook de mutações. O serviço de catálogo também revalida admin após a latência, em cada escrita de produto/categoria, evitando operação com sessão trocada durante envio. URLs de catálogo/dashboard para funcionário redirecionam a pedidos. A conta demo não autoriza Supabase.

### ViaCEP e endereço

Campos CEP, rua/logradouro, número, bairro, cidade, UF e complemento opcional. Máscara 00000-000; consulta somente após oito dígitos completos e debounce de 350 ms. Somente CEP é enviado ao ViaCEP, sem nome/telefone/endereço pessoal. Há AbortController, limite de oito segundos e controle de revisão para ignorar respostas antigas mesmo quando o transporte ignora abort. Alterar CEP limpa rua/bairro/cidade/UF anteriores; editar esses campos manualmente invalida a resposta pendente. Número/complemento podem ser digitados durante a busca sem impedir o preenchimento automático.

CEP inexistente, falha de rede, resposta inválida e timeout apresentam orientação para preenchimento manual; nenhum resultado da API é requisito para submeter. Validação local exige CEP completo, endereço e UF válida. Número é sempre manual. Retirada não exige endereço. A composição permanece no campo address e respeita o máximo existente de 160 caracteres; endereços maiores exigem abreviação/correção e exibem erro, sem truncamento silencioso.

O endereço completo aparece na confirmação imediata do checkout e nos detalhes administrativos. O acompanhamento público continua sem nome/telefone/endereço, preservando a privacidade anterior.

O contrato foi conferido na [documentação oficial ViaCEP](https://viacep.com.br/). A consulta pública de exemplo [01001000/json](https://viacep.com.br/ws/01001000/json/) retornou CEP 01001-000, Praça da Sé, Sé, São Paulo/SP. Isso valida disponibilidade/formato na consulta desta execução; não equivale a homologação de CORS ou interação em navegador. Testes automatizados simulam respostas e falhas, sem depender do serviço externo.

### Dinheiro e troco

Reutilizado **calculateCashChange**, conversão BRL para centavos inteiros e validação de valores seguros. No checkout o campo “Vai pagar com quanto?” é opcional; quando preenchido, precisa ser válido e suficiente. Troco zero aparece como “Sem troco”. Pix/cartão ocultam o campo e limpam o valor ao trocar a forma.

Adicionado somente o campo opcional local **cashAmountCents** ao pedido e aos inputs compatíveis. Pedidos antigos sem o campo continuam válidos. No serviço, o valor é validado contra o total recalculado do catálogo antes de gravar e não é aceito como fonte de preço. Pix/cartão não persistem informação de troco. Pedidos online continuam sempre com pagamento pendente: o valor informado é intenção de pagamento, não recebimento. Troco é derivado do snapshot do total, sem persistir valor redundante de mudança nem alterar métricas.

No PDV, dinheiro marcado como recebido exige valor efetivo suficiente; pendente não exige nem persiste recebimento. A UI e a submissão do componente validam o preenchimento. O contrato de serviço preserva compatibilidade com chamadas anteriores sem campo. Mudança de forma/situação continua limpando o campo do rascunho. Confirmação, detalhe e comprovante exibem valor recebido/troco quando disponível. Para vendas anteriores que guardavam esse dado apenas no lastSale do rascunho, há fallback de exibição vinculado ao ID da venda, sem regravar o histórico. Depois de descartar tal rascunho antigo, não é possível recuperar o recebido que nunca foi salvo no pedido.

Comprovante mantém **COMPROVANTE — SEM VALOR FISCAL** e impressão nativa existente. Valor entregue nunca é receita; faturamento segue total do pedido e situação de pagamento. Nenhuma cobrança real ou alteração de regras financeiras/fluxos de status.

## Testes e execução

- **bun install --frozen-lockfile:** aprovado, dependências/lockfile sem alterações.
- **bun run typecheck:** aprovado.
- **bun run lint:** zero erros, nove avisos Fast Refresh preexistentes; nenhuma regra desativada.
- **bun run test --maxWorkers=2:** **294 testes aprovados em 20 arquivos — 252 anteriores + 42 novos**, sem falhas na execução isolada final.
- **bun run build:** aprovado, cliente/SSR/Nitro e configuração Lovable preservados.
- **bun run dev --host 127.0.0.1 --port 3012:** Vite iniciou e anunciou http://127.0.0.1:3012/. GET /admin/acesso retornou HTTP 200 com documento HTML e script de aplicação. A abertura de porta/loopback exigiu execução fora do sandbox após EPERM; não houve mudança da configuração Vite.
- **git diff --check:** sem problemas na conferência final.

A primeira tentativa de testes durante a preparação não constituiu uma baseline estável: houve carga alta/alterações em andamento, 41 falhas, 187 aprovações e um erro de execução. Após adaptar fixtures ao login obrigatório, os **252 casos anteriores passaram**. A suíte com os primeiros 39 casos novos passou em seguida (**291**). A execução final com o paralelismo padrão teve três falhas (dois timeouts de 5 segundos e uma falha posterior de seleção no mesmo arquivo de PDV); com dois workers, os **293** casos então existentes passaram. Não foram aumentados timeouts, removidos casos nem modificadas configurações de teste para esconder falhas. A última execução, com o caso adicional de compatibilidade de comprovante antigo, aprovou **294/294 em 20 arquivos** (30,67 segundos).

Os testes antigos receberam identidades demo válidas nas fixtures, preenchimento do formulário de login e campos estruturados de endereço. O cenário anterior de dinheiro pago no PDV passou a informar o recebido obrigatório. As verificações anteriores de catálogo, integridade de preço, pedidos, Auth real, logout e domínio foram preservadas.

Os novos testes cobrem: duas contas, credenciais incorretas/inexistentes/vazias, persistência pelo parser real, sessão antiga, mostrar senha, logout/troca de usuário sem apagar dados, acesso direto e menus de funcionário, mutações locais negadas, CEP válido/inexistente/incompleto, falha/revisão manual, corrida de respostas, número durante busca, composição do endereço, checkout offline até detalhes administrativos, valores monetários iguais/superiores/inferiores/inválidos, dinheiro pendente, Pix/cartão, histórico compatível e comprovante com troco.

## Manual e preservação

Entregue [MANUAL-DEMONSTRACAO.md](../MANUAL-DEMONSTRACAO.md), vinculado no README. Inclui instalação Git/Bun/VS Code, acesso e clone, versão correta da sprint, instalação com lockfile, execução/URL, credenciais, matriz, roteiro de apresentação e problemas comuns. Explica que bun npm run é incorreto e Bun é o procedimento oficial; sem banco/Docker/credenciais para a demo.

Não foram alterados AGENTS, .lovable, dependências/lockfile, configuração Vite, middleware, migrações, SQL, serviços Supabase/Auth real, catálogo comercial, imagens, preços ou chaves de armazenamento. O seed continua com **57 produtos e oito categorias**, verificado pelos testes existentes. Nenhum dado do navegador do usuário foi limpo; os testes usam fixtures próprias de jsdom. Não foram executados comandos Supabase, Docker, migrações, bootstrap, config push ou mudanças remotas nesta sprint.

## Homologação e pendências

A ferramenta de navegador retornou **The browser access host is unavailable**. Não há evidências visuais novas, nem alegação de homologação desktop/mobile, toque, impressão real, teclado ou CORS no navegador. Estrutura responsiva/labels/feedback foram mantidos, com testes de componentes e jornadas automatizadas reais dos serviços/contextos locais. Conferir visualmente o roteiro completo do manual antes da apresentação.

ViaCEP depende da internet somente para autopreenchimento. Login e dados são demonstrativos, sem sincronização entre dispositivos. Rascunho do PDV é do navegador e pode ser retomado por outra conta; conferir/descartar explicitamente evita mistura entre atendimentos. Backend real e demais pendências das Sprints 06.x permanecem fora desta entrega. A migração 00300 não foi aplicada nem reavaliada remotamente nesta sprint; seu último estado documentado continua histórico, sem nova afirmação de estado remoto.

Branch local sem commit/push/merge; portanto colegas precisam receber esta versão ou aguardar publicação manual da branch antes de cloná-la. Nenhuma outra sprint foi iniciada. O sistema não é declarado pronto para produção.

## Arquivos criados e alterados

- `README.md`
- `docs/MANUAL-DEMONSTRACAO.md`
- `docs/sprints/SPRINT-DEMO.1.md`
- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/OrderDetails.tsx`
- `src/components/admin/pos/POSCheckout.tsx`
- `src/components/admin/pos/POSConfirmation.tsx`
- `src/components/admin/pos/POSReceipt.tsx`
- `src/components/admin/pos/PointOfSale.tsx`
- `src/components/admin/use-catalog-mutation.ts`
- `src/components/public/DeliveryAddressFields.tsx`
- `src/components/public/OrderSummary.tsx`
- `src/components/shared/CashSummary.tsx`
- `src/contexts/AdminSessionContext.tsx`
- `src/contexts/admin-session.ts`
- `src/hooks/use-delivery-address.ts`
- `src/lib/delivery-address.ts`
- `src/lib/orders.ts`
- `src/routes/admin.acesso.tsx`
- `src/routes/admin.tsx`
- `src/routes/checkout.tsx`
- `src/services/local/demo-session.ts`
- `src/services/local/index.ts`
- `src/services/local/store.ts`
- `src/test/admin-flow.test.tsx`
- `src/test/catalog-images.test.tsx`
- `src/test/catalog-management.test.tsx`
- `src/test/catalog-service.test.ts`
- `src/test/checkout-flow.test.tsx`
- `src/test/demo-address.test.tsx`
- `src/test/demo-login.test.tsx`
- `src/test/demo-payment.test.tsx`
- `src/test/helpers/demo-session.ts`
- `src/test/pos-flow.test.tsx`
- `src/test/pos-rules.test.ts`
- `src/test/vila-rica.test.tsx`
- `src/types/index.ts`
