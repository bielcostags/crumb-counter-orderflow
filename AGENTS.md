<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Supabase externo do proprietário — exceção específica autorizada

O projeto externo **vila-rica-dev**, ref **yzxsuoxthkbzbkcumauz**, região **sa-east-1 (São Paulo)**, plano Free, é administrado independentemente do Lovable Cloud por instrução explícita do proprietário na Sprint 06.2A. Para esse projeto exclusivamente, é permitido criar/revisar configurações CLI, testes e migrações versionadas em `supabase/` neste repositório. Esta regra específica substitui a delegação de alterações de banco ao Lovable apenas para esse Supabase externo. O bloco gerenciado acima permanece intacto e continua valendo para recursos gerenciados pelo Lovable, inclusive outros bancos, conectores e segredos.

- Não usar o projeto anterior da Virginia nem outro project ref. Conferir o vínculo antes de qualquer comando remoto; usar alvo explícito quando suportado.
- `supabase/config.toml` configura desenvolvimento local; não demonstra que configurações Auth/API foram aplicadas ao remoto. Não executar config push implicitamente.
- Antes de qualquer operação que altere o remoto: apresentar plano concreto de migrações, executar dry run no projeto correto e obter aprovação explícita do proprietário para aquele conjunto de alterações. Sem push/reset/repair/seed/contas automáticas nesta etapa.
- Preservar `.lovable`, dependência/configuração Vite do Lovable e seu histórico. Não desconectar serviços.
- Manter escrita de negócio bloqueada até concluir/testar transações, triggers e segurança. Nunca usar sessão demo para autorizar backend nem fazer fallback silencioso para pedidos locais.
- Tokens pessoais, database password, service_role e secret keys não entram em commits, argumentos de comandos, logs, capturas ou relatórios. Login interativo no terminal do proprietário; cliente futuro usa somente publishable key com RLS. Credenciais externas não são gerenciadas automaticamente pelo Lovable Cloud; usar armazenamento seguro aprovado, sem copiar segredos entre plataformas.
- Não importar pedidos demo/dados pessoais de localStorage. Preservar carrinhos, chaves, catálogo, preços e imagens. Não habilitar pedidos ou PDV remoto nesta sprint.
