# Plano de importação e transição dos dados

## Pré-implantação de 17/11/2026 — Sprint 06.3B

A migração **00300 continua pendente no hospedado**, com SHA-256 original c79e2a16a7e1411e52c6bf0789c41fa9ac88ea9aa2346e1aba0d483289d195e5. O dry run listou somente esse arquivo; nenhuma aplicação, conta ou configuração Auth foi alterada. A execução parou no primeiro ponto de aprovação. As duas migrações anteriores permanecem aplicadas.

A Data API foi reconfirmada por leitura de configuração: public e graphql_public expostos; private aparece como opção no painel, mas **não está selecionado/exposto**. Auth remoto: signup público true, confirmação de e-mail true, senha mínima 6, Site URL http://localhost:3000 e sem redirects adicionais. Esses valores exigem revisão/autorização separada antes de criar a equipe. O provedor Email e entrega de recovery/convites não foram comprovados; o proprietário informou não conseguir conferir o provedor.

A auditoria corrigiu dois problemas de logout: foco/polling durante mutação podia restaurar estado privado; erro retornado pelo SDK podia ser tratado como sucesso. Agora há exclusão entre login/logout/revalidação, estado privado removido enquanto aguarda e erro sanitizado com cookies sempre limpos. Isso não promete revogação imediata de JWT já emitido antes de seu exp, nem substitui homologação entre abas/navegador.

Resultados: **252 testes da aplicação (247 anteriores + cinco novos), 155 SQL locais e 12 checks Auth locais**, typecheck/build aprovados e lint sem erros/nove avisos anteriores. Browser indisponível, modo demo preservado, nenhum login/conta/PDV hospedado ativado. Ver [Sprint 06.3B](../sprints/SPRINT-06.3B.md) para configurações observadas, riscos, plano exato e aprovações separadas. As notas anteriores abaixo são históricas e não antecipam autorização de ativação.

## Atualização de 17/11/2026 — Sprint 06.3

A fundação hospedada (duas migrações) foi aplicada anteriormente após autorização e continua com escrita comercial bloqueada. Nesta sprint, a autenticação servidor-centrada por cookies e a preparação de perfis foram implementadas/testadas **somente localmente**. SDKs oficiais estão instalados; demo continua padrão, sem SDK administrativo no browser, sem ativação real automática e sem alteração de catálogo/localStorage.

O proprietário confirmou no painel **public e graphql_public** como Exposed schemas (private ausente na lista informada); isso é evidência manual, não uma prova da CLI. Auth hospedado, primeira conta/admin e nova migração 00300 não foram ativados. A migração nova, funções de perfis e bootstrap privado aguardam aprovação própria. Convites por endpoint não estão implementados/liberados. Resultados locais: **247 testes da aplicação, 155 SQL e 12 checks com Auth/REST reais locais**; browser indisponível.

Ver [guia de autenticação](AUTENTICACAO.md) e [Sprint 06.3](../sprints/SPRINT-06.3.md) para modos, flags, matriz, bootstrap, hash/plano e limites. O histórico/planejamento abaixo não deve ser interpretado como declaração de que Auth remoto está homologado ou de que a fundação ainda está pendente.

> Atualização Sprint 06.2A: para o Supabase externo `vila-rica-dev` (`yzxsuoxthkbzbkcumauz`, sa-east-1), vale a exceção específica de AGENTS.md. A administração ocorre pela CLI do proprietário, sem modificar o bloco gerenciado do Lovable. As migrações versionadas de fundação estão preparadas, mas não foram aplicadas ao remoto. A proposta histórica abaixo não é uma migração pronta. Ver [Sprint 06.2A](../sprints/SPRINT-06.2A.md).

Nenhum dado foi importado, removido ou extraído do navegador. O manifesto é uma preparação pura, criada com `createCatalogImportManifest()` em `src/services/backend/catalog-manifest.ts`. Usa funções de seed do catálogo, sem createSeedStore, pedidos fictícios ou acesso a localStorage. Não executa SQL nem rede.

## Fonte e identidade

Origem identificada como `vila-rica-cardapio-v1`. O manifesto contém oito categorias e 57 produtos: Lanches 4, Sanduíches 10, Tapiocas 7, Crepiocas 2, Cuscuz 5, Capuccinos 10, Sucos 4 e Adicionais 15. Exporta nomes, descrições, preços inteiros em centavos, flags iniciais, ordenação, caminho de imagem e vínculos por category_source_id. Fonte comercial: [catálogo conferido](../catalogo-vila-rica.md); imagens e proveniência: [inventário](../catalogo-imagens.md).

`source_id` guarda exatamente o ID do catálogo local (`vr-cat-*` / `vr-prod-*`), enquanto PK remoto será UUID gerado pelo banco. commercial_code preserva o trecho numérico documentado do ID, **não é chave única**. Chocolate Quente (`vr-prod-362-chocolate-quente`, 1300) e Moça Expresso (`vr-prod-362-moca-expresso`, 1000) ficam separados com código 362. Não fundir ou corrigir o código sem aprovação comercial. Código desconhecido falha na preparação, sem inventar SKU.

## Processo idempotente futuro

1. Proprietário aprova catálogo, disponibilidade comercial inicial (as flags atuais são demo), duplicidade 362 e ambiente de desenvolvimento. Não provisionar implicitamente.
2. Gerar JSON do manifesto por ferramenta controlada; revisar diff/versionar artefato aprovado e hash de integridade. Nenhum snapshot de pedidos ou dados pessoais é permitido nesse payload.
3. Dry run valida 8/57, unicidade de source_id, categorias existentes, preços oficiais, imagens físicas existentes, HTTPS/galeria e valores seguros. Produzir relatório de inserts/updates/conflitos, sem gravar.
4. Importador servidor autorizado inicia uma transação. Upsert de categorias por source_id, mapeia source_id → UUID; upsert de produtos pelo próprio source_id resolvendo category_source_id. Nunca usar nome ou código comercial como chave. Upsert idêntico não muda timestamps/versões desnecessariamente; repetir não cria duplicatas.
5. Reexecução só confirma conteúdo igual; divergências em registros já editados remotamente são conflitos para revisão, sem sobrescrever preço/disponibilidade/nome silenciosamente. Modo de atualização de catálogo deve exigir aprovação do diff e versionamento. Conflito com nome normalizado de categoria aborta, sem fundir registros.
6. Validar contagens, vínculos, valores e imagens e então commit. Qualquer erro gera rollback de todo lote. Guardar hash/versão do manifesto e relatório de execução no fluxo de implantação autorizado; não misturar com dados pessoais.
7. Testar replay, rollback, source_id duplicado e conflito de categoria em banco de desenvolvimento antes de importar em ambiente autorizado posterior.

Não foi implementado importador remoto nesta etapa. O teste do manifesto comprova conteúdo determinístico/íntegro; não comprova UPSERT ou atomicidade PostgreSQL.

## Imagens e logomarca

Manter assets em public/images e caminhos relativos existentes; não é necessário upload para Supabase Storage. A hospedagem do frontend serve as mesmas 57 imagens e logo.jpeg. Se mudar de origem de assets, exigir mapa e conferência visual, preservar originais/licenças/proveniência e usar Storage só com autorização específica. Não reprocessar nem regenerar imagens nesta sprint.

## Corte futuro do frontend

O catálogo local do usuário pode ser antigo/customizado: não assumimos que seja igual ao seed, nem o enviamos automaticamente. Backend usa UUIDs novos; carrinhos existentes têm IDs de origem. Planejar tradução por source_id para UUID só quando correspondência inequívoca; itens desconhecidos ficam visíveis para revisão, sem vender outro produto ou perder rascunho. Mesmo após mapear, revalidar preço/nome/categoria/disponibilidade e exigir confirmação de diferenças. STORE_VERSION e todas as chaves atuais permanecem como estão nesta sprint.

Carrinho público e PDV continuam estados locais separados; não importar dados pessoais dos rascunhos automaticamente. Na ativação futura, apresentar transição clara e exigir decisão explícita sobre rascunhos/última confirmação demo. Não reenviar pedidos locais nem vendas fictícias para o banco. Falha remota nunca alterna para local ou cria pedido de exemplo.

Pedidos fictícios iniciais, histórico demo, nomes/telefones/endereços/notas e sessão demo não entram na produção. Não limpar o navegador como parte do deploy. Backup/exportação local, se solicitada, é ação distinta com autorização e cuidado com dados; nenhuma executada aqui. Rollback da ativação deve preservar dados reais no banco, desabilitar novas vendas se necessário e mostrar indisponibilidade; não reabrir modo demo silenciosamente para operação real.

## Pendências antes do corte

- Confirmação do fuso America/Porto_Velho e disponibilidade inicial.
- Revisão do código 362, sem bloquear a preservação de ambos.
- Projeto autorizado, custos, Secrets, schema/RLS/RPCs e testes de importação reais.
- Modelo de idempotência persistente e isolamento de rascunhos por operador/ambiente sem apagar chaves antigas.
- Política de retenção/anonimização, recuperação/backups, plano de rollback e homologação visual/operacional.
