# Supabase externo — vila-rica-dev

Alvo único autorizado: `yzxsuoxthkbzbkcumauz`, São Paulo / sa-east-1. O nome local em config.toml não vincula um projeto remoto; o vínculo da CLI fica em `.temp/project-ref`, ignorado pelo Git. O projeto anterior da Virginia não é utilizado.

## Comandos seguros preparados

```sh
bun install --frozen-lockfile
bun run supabase:check
bun run supabase:link
bun run supabase:dry-run
bun run catalog:manifest
```

Os wrappers fixam o ref e recusam argumentos extras. check só compara o cache local; não atesta schema, conta, região ou permissões. dry-run verifica o cache e fixa novamente o ref remoto, usa `--dry-run --skip-vault`; não aplica migrações. Não há script de push/reset/deploy/importação. Comandos diretos da CLI podem contornar o wrapper e exigem os mesmos cuidados e aprovações.

## Autenticação

Nesta execução a sessão da CLI já estava disponível e o vínculo foi confirmado pela API; nenhum token ou senha foi solicitado ou copiado para arquivos do projeto. Em outra máquina, execute no seu próprio terminal:

```sh
bunx --no-install supabase login
bun run supabase:link
bun run supabase:check
```

Se o navegador não abrir, use `bunx --no-install supabase login --no-browser` e conclua a autenticação no seu navegador, inserindo o código somente no terminal interativo. Não envie tokens, database password ou códigos para o chat. Se uma operação pedir database password, digite apenas no prompt seguro; não use `--password`, argumentos, logs ou arquivos versionados.

## Migrações e bloqueio de escrita

1. `20261117000100_backend_foundation.sql`: dez tabelas, UUIDs/identity, FKs, checks, índices, RLS habilitada, revogações de privilégios e triggers ALWAYS que bloqueiam INSERT/UPDATE/DELETE/TRUNCATE nas dez tabelas, inclusive por service_role/owner nas operações normais.
2. `20261117000200_read_policies.sql`: helpers de papel, leitura pública somente de categorias ativas/produtos disponíveis em categorias ativas; leitura operacional restrita a funcionário ativo; perfil próprio ou gestão de leitura admin. Nenhuma policy de escrita, RPC de negócio, permissão de sequência, dados pessoais ou hashes de token é liberada.

Cada arquivo é transacional. Não altera dados/tabelas do Auth, não cria contas/perfis/admin, não importa catálogo e não publica dados no Realtime. O owner/superusuário pode alterar DDL ou desabilitar triggers; isso não é uma barreira contra administradores do próprio banco. Remover a trava requer outra migração revisada depois dos testes de invariantes, transações e autorização. A primeira fundação é deliberadamente inutilizável para registrar vendas.

A configuração CLI define Auth local com signup desabilitado, login anônimo desabilitado, senha mínima 12 e sem redirects adicionais. Configurações locais NÃO são sincronizadas pelo link nem pelas migrações. Conferir e alterar configurações de Auth remoto somente em operação autorizada posterior; não afirmar que signup remoto já foi desabilitado. Nenhum `config push` foi executado. O frontend continua sem SDK ou cliente Supabase.

## Banco local e pgTAP

Requer Docker compatível em execução; não foi encontrado PostgreSQL local disponível nesta execução. Os comandos abaixo são exclusivamente para stack local descartável, nunca acrescente `--remote`:

```sh
bunx --no-install supabase start
bunx --no-install supabase db test
```

start prepara a stack local e aplica as migrações localmente. Seeds estão desabilitados; não executar reset contra banco compartilhado. A suíte `tests/database/foundation.test.sql` usa pgTAP, transação/rollback, dados inteiramente fictícios e desabilita temporariamente a trava como owner só para fixtures locais. Verifica RLS, grants, papéis ativos/inativos, catálogo público, código 362 duplicado, restrições e bloqueios de escrita. Não executar esse arquivo no remoto; ele é teste com preparação de dados, não dry run.

A tentativa local desta sprint falhou por falta de PostgreSQL em 127.0.0.1:54322. O dry run remoto não executa as migrations e não prova correção sintática/semântica, RLS, triggers ou constraints; testes reais permanecem pendentes.

## Plano antes de qualquer aplicação remota

1. Validar as duas migrações e pgTAP no ambiente local; revisar owners, grants herdados e schema remoto existente.
2. Confirmar `bun run supabase:check` e o ref correto; executar novo dry run após qualquer alteração SQL.
3. Apresentar arquivos exatos e resultado dos testes/dry run ao proprietário; obter aprovação explícita para aplicação desse conjunto.
4. Somente depois, executar a operação remota aprovada com alvo explícito e sem incluir seed/roles/Vault não aprovados. Não realizar db reset, repair ou rollback destrutivo.
5. Conferir histórico/tabelas/grants e comprovar escrita bloqueada. Auth real, contas, RPCs, importação e ativação de frontend são etapas posteriores independentes.

A CLI chama o ambiente principal do projeto de `production`, mesmo com nome vila-rica-dev. Isso distingue o alvo hosted de uma preview branch; não autoriza uso de produção nem identifica o antigo projeto. O ref fixo é a fronteira de seleção.

## Catálogo e credenciais

`bun run catalog:manifest` apenas emite JSON revisável usando createCatalogImportManifest(): oito categorias, 57 produtos, source_id, descrições, preços, disponibilidade inicial e imagens locais. Ambos os códigos 362 são mantidos. Não há importador nem seed automático. O futuro importador deverá usar source_id único, transação, dry run e revisão de conflitos; código comercial não é unique. Nenhum pedido/demo/PII do navegador é exportado.

`.temp/`, `.branches/`, arquivos de ambiente e dumps são ignorados. Não versionar dados de sessão da CLI. Nenhum segredo deve ter prefixo VITE_. Somente publishable key será admitida no cliente futuro com RLS; service_role/secret keys/database password permanecem fora do cliente e dos relatórios. Não usar `--debug` em capturas de diagnóstico que possam expor conexão.

Referências oficiais: [CLI como dependência de desenvolvimento](https://supabase.com/docs/guides/local-development/cli/getting-started), [workflow local e link/dry run](https://supabase.com/docs/guides/local-development/cli-workflows). A sintaxe dos comandos foi também conferida no help da CLI 3.1.0 instalada; difere de exemplos antigos da CLI v2 (`--remote` explícito).
