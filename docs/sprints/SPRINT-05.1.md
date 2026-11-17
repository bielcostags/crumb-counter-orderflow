# Sprint 05.1 — Identidade Vila Rica Artesanal

Data: 16/11/2026. Branch: `feature/identidade-vila-rica`.

## Objetivo e escopo

Personalizar identificação comercial, paleta e catálogo inicial para **Vila Rica — Padaria e Confeitaria Artesanal**, mantendo a arquitetura, tecnologias, rotas e regras das cinco sprints anteriores. Nenhum módulo, mecanismo de adicionais, autenticação, pagamento ou banco foi criado.

O escopo anexado preserva explicitamente ambiente demonstrativo e comprovante não fiscal, substituindo a solicitação ampla anterior de remover todos os avisos. Os avisos e a frase obrigatória do comprovante foram mantidos.

## Preparação e Git

O working tree estava limpo em feature/pdv-balcao, commit 05f8dec. Branches locais/remotas foram inspecionadas e git fetch origin executado. A branch desta sprint foi criada diretamente de origin/main atualizada, commit a72afa9 (merge da Sprint 05), sem alterar main local ou reescrever histórico publicado. Nenhuma alteração local do usuário foi descartada.

Lidos AGENTS.md, README.md e relatórios anteriores; revisados seed, tokens, identidade compartilhada, áreas pública/admin/PDV e fixtures. Antes de implementar, bun install --frozen-lockfile e os 146 testes existentes passaram.

## Identidade aplicada

- Nome Vila Rica nos cabeçalhos, rodapé, menu, dashboard, acesso, títulos/metadados de cardápio/carrinho/checkout/acompanhamento/admin e comprovante.
- Complemento “Padaria e Confeitaria Artesanal” no componente compartilhado e identificação institucional “Vila Rica Artesanal” no cardápio.
- Paleta centralizada nos tokens: oliva #2B3E1E, marrom #4C2F11, dourado #E4A326, creme #F1EAE4, amarelo #F0D6A4, vinho #680D0D e branco. Primário oliva, destaques/textos marrons, dourado e creme nas superfícies, vinho no erro. Estados semânticos de sucesso/aviso/status permanecem distintos.
- Fontes Poppins/Inter, estrutura e responsividade existentes preservadas. Gráfico usa tokens em vez dos antigos valores fixos.
- Arte genérica de balcão removida do destaque público para não se apresentar como imagem oficial da empresa. Nova apresentação é textual, sem textura, gradiente ou logomarca inventada.
- Fotos da galeria antiga identificadas como ilustrativas na seleção administrativa e nas áreas de compra quando usadas. Os 57 produtos novos usam placeholders do ProductImage, sem fotos comerciais inventadas.

## Logomarca e pendências dos anexos

O diretório do anexo contém somente Pasted text.txt; não há logomarca nem quatro imagens do cardápio disponíveis no projeto ou nesse anexo. Nenhuma marca foi desenhada ou reconstruída. BrandMark usa texto provisório, e public/images/brand/README.md registra como integrar a arte quando fornecida. Favicon oficial permanece pendente; o ícone genérico preexistente não foi apresentado como arte oficial.

Os nomes/preços foram transcritos do texto fornecido pelo proprietário, sem alegar conferência visual das artes ausentes. A aplicação final da logomarca oficial depende desse arquivo.

## Catálogo

Exatamente 8 categorias ativas e 57 produtos inicialmente disponíveis para demonstração, não como garantia de disponibilidade comercial:

| Categoria  | Produtos |
| ---------- | -------: |
| Lanches    |        4 |
| Sanduíches |       10 |
| Tapiocas   |        7 |
| Crepiocas  |        2 |
| Cuscuz     |        5 |
| Capuccinos |       10 |
| Sucos      |        4 |
| Adicionais |       15 |

Valores em centavos e IDs novos com prefixos vr-cat-/vr-prod-, sem reaproveitar IDs antigos para produtos diferentes. Descrições oficiais preservadas; descrições não fornecidas vazias. Adicionais indicam lanches/sucos, sem novas relações ou regras de preço. Códigos comerciais permanecem apenas na documentação, sem campo adicional no domínio.

Chocolate Quente e Moça Expresso mantêm código comercial 362, preços de R$ 13,00 e R$ 10,00 e IDs distintos. A duplicidade é uma pendência de confirmação com o proprietário, sem código inventado. A relação completa está em [catálogo Vila Rica](../catalogo-vila-rica.md).

Os 14 pedidos fictícios iniciais foram adaptados apenas nas referências de produtos, com snapshots/totais gerados pelo mecanismo já existente. Mantêm identificação de exemplos e não representam vendas reais.

## Persistência e funcionalidades preservadas

STORE_VERSION, chaves de localStorage, parser, contextos e serviços de negócio não foram alterados. Dados já salvos continuam sendo lidos, incluindo catálogo antigo/customizações e pedidos históricos. O novo seed só aparece em armazenamento novo ou restauração explícita já existente.

Procedimento de restauração documentado com aviso de descarte, opção preferencial de perfil novo e cuidado com rascunho próprio do PDV. Nenhum reset foi executado no navegador do usuário, nem criado botão/migração destrutiva. Não há alteração de IDs antigos em dados persistidos.

Permanecem cadastro/edição, disponibilidade, categorias, carrinhos independentes, checkout, acompanhamento, revisão de preços, dashboard, Kanban, recebimentos/cancelamentos, PDV, troco e comprovante. Nenhuma regra de cálculo/status foi alterada; a personalização usa o mesmo Product e Order.

## Estratégia de testes

Os 146 cenários anteriores foram preservados. O catálogo técnico anterior foi movido como fixture de testes para src/test/fixtures/catalog.ts; suites antigas o inserem explicitamente no store. Isso mantém os casos de indisponibilidade, categorias, preços, nomes e IDs sem acoplá-los à tabela comercial. Os helpers/serviços reais continuam em uso e não foram substituídos por mocks de negócio.

Novos testes validam 8 categorias e sua ordem, 57 produtos, correspondência e preços de todas as categorias, unicidade/novidade de IDs, descrições/adicionais, dois itens com código 362, consistência dos pedidos de exemplo, preservação de armazenamento anterior, identificação textual Vila Rica e jornadas comerciais no carrinho/checkout e PDV/comprovante.

| Verificação                   | Resultado                                                  |
| ----------------------------- | ---------------------------------------------------------- |
| bun install --frozen-lockfile | Aprovado, lockfile preservado                              |
| Testes antes da implementação | 146 aprovados em 9 arquivos                                |
| bun run typecheck             | Aprovado, código de saída 0                                |
| bun run lint                  | Aprovado: 0 erros e 9 avisos preexistentes de Fast Refresh |
| bun run test                  | 162 aprovados em 10 arquivos: 146 anteriores e 16 novos    |
| bun run build                 | Aprovado: cliente, SSR e Nitro                             |
| git diff --check              | Aprovado, sem erros de whitespace                          |

Todos os comandos acima foram executados. O build mantém os avisos preexistentes de vite-tsconfig-paths e inlineDynamicImports do scaffold. Um erro inicial de formatação de metadados foi corrigido com Prettier; não houve desativação de regras ou redução dos cenários anteriores. Nenhuma dependência ou lockfile foi alterado.

## Validação visual

Servidor local iniciado em http://127.0.0.1:8081/ (8080 ocupada). A ferramenta de navegador retornou “The browser access host is unavailable”. Não foram realizadas validação visual desktop/tablet/celular, captura de telas, leitura de console ou revisão real de impressão. O servidor desta tentativa foi encerrado, preservando o processo preexistente.

A legibilidade foi tratada por tokens de texto escuro em superfícies claras e contraste forte no primário; a homologação visual/acessibilidade no navegador continua pendente. Nenhum resultado visual foi alegado. O cálculo de contraste dos pares principais resultou em branco/oliva 11,60:1, marrom/creme 10,24:1, texto secundário/creme 6,32:1, oliva/dourado 5,28:1 e branco/vinho 12,71:1. Isso verifica as cores base matematicamente, sem substituir auditoria da interface completa.

## Arquivos criados e modificados

### Criados

- `docs/catalogo-vila-rica.md`
- `docs/sprints/SPRINT-05.1.md`
- `public/images/brand/README.md`
- `src/test/fixtures/catalog.ts`
- `src/test/vila-rica.test.tsx`

### Modificados

- `README.md`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/ProductForm.tsx`
- `src/components/admin/pos/POSProductGrid.tsx`
- `src/components/admin/pos/POSReceipt.tsx`
- `src/components/public/ProductCard.tsx`
- `src/components/public/PublicLayout.tsx`
- `src/components/shared/Brand.tsx`
- `src/data/mock.ts`
- `src/routes/__root.tsx`
- `src/routes/acompanhar.tsx`
- `src/routes/admin.tsx`
- `src/routes/carrinho.tsx`
- `src/routes/checkout.tsx`
- `src/routes/index.tsx`
- `src/styles.css`
- `src/test/admin-flow.test.tsx`
- `src/test/catalog-management.test.tsx`
- `src/test/catalog-service.test.ts`
- `src/test/checkout-flow.test.tsx`
- `src/test/order-service.test.ts`
- `src/test/orders.test.ts`
- `src/test/pos-flow.test.tsx`
- `src/test/pos-rules.test.ts`
- `src/types/index.ts`

## Limitações e próximas etapas

- Logomarca, quatro artes originais, favicon oficial e fotos individuais oficiais ainda precisam ser fornecidos. Identificação textual e placeholders são provisórios.
- Confirmar com o proprietário o código comercial duplicado 362.
- Conferência visual dos preços nas artes e revisão em dispositivos reais permanecem pendentes.
- Catálogos antigos continuam no navegador até ação deliberada; a marca visual nova não implica migração de dados locais.
- Ambiente continua demonstrativo: sem autenticação real, banco, pagamento online, estoque, emissão fiscal, serviços pagos ou publicação. Nenhuma prontidão de produção foi declarada.

## Git final

Alterações no working tree de feature/identidade-vila-rica, sem commit, push, merge ou publicação nesta execução. Main local preservada e histórico publicado intacto.

## Atualização — recebimento das artes na conversa

Foram recebidas posteriormente as quatro páginas do cardápio e a logomarca oficial. A leitura visual das páginas confirmou os 57 produtos, preços e descrições transcritos, sem necessidade de alterar o catálogo. A terceira página confirma a duplicidade do código 362, que continua como pendência comercial.

A logo recebida apresenta bolo, suporte verde, trigos e nome Vila Rica sobre fundo creme, compatível com a direção visual definida. As cinco imagens estão visíveis na conversa, mas não foram disponibilizadas como arquivos no diretório de anexos ou no projeto. Portanto, a logo não foi instalada nem convertida; permanece a identificação textual provisória até o recebimento do arquivo acessível. Não foram criadas cópias aproximadas ou imagens substitutas.

Esta atualização altera somente documentação de conferência das artes. Não foram executados novos testes de código, pois não houve alteração funcional ou de componentes.
