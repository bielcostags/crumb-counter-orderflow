# Crumb Counter Orderflow

Crie um projeto chamado Padaria Digital (fase 01: protótipo frontend navegável de MVP para uma única padaria). O objetivo é cardápio digital para clientes e gestão de pedidos online e de balcão para funcionários. Use React, TypeScript, Vite quando compatível com o scaffold, Tailwind CSS, shadcn/ui, Lucide Icons e React Router se compatível. Organize componentes, páginas public/admin, tipos, serviços/mock data centralizados e contextos. Prepare interfaces de serviços para futura integração Supabase/PostgreSQL, mas NÃO conecte banco, não ative Lovable Cloud, não provisione backend, não faça login real ou pagamentos reais, não publique em produção. Não use dados pessoais reais.

Design profissional, acolhedor, minimalista, responsivo, área pública mobile-first, área admin desktop/tablet e adaptável. Paleta marrom #543629, caramelo #B77945, dourado #E8C18B, bege #F9F5EF, verde #66866A, branco #FFFFFF; Poppins títulos e Inter textos. Use imagens de produtos de padaria adequadas. Português brasileiro, BRL, foco visível, contraste e estados vazios/erro/carregamento. Evite gradientes e excesso de decoração.

Área pública: / cardápio com marca, pesquisa, categorias pães, bolos, salgados e bebidas, fotos, descrições, preços e disponibilidade; não permitir adicionar indisponíveis; carrinho com quantidades, remoção, observações por item, total; checkout com nome, telefone, retirada ou entrega (endereço obrigatório quando entrega), forma de pagamento no recebimento Pix/dinheiro/cartão, confirmação; acompanhamento com número e status e resumo. Não solicitar credenciais financeiras. Área admin: login demonstrativo claramente identificado com acesso de demonstração, menu lateral recolhível; dashboard com pedidos do dia, vendas demonstrativas, ticket médio, pendentes, gráfico e recentes; painel Kanban com pendente, em preparação, pronto, saiu para entrega (somente entrega), concluído e cancelado (ação com confirmação). Pedidos de retirada não passam por saiu para entrega. Mostrar origem online/balcão, itens, observações, dados fictícios de cliente, status pagamento pendente/pago e permitir marcar pago na demo. Gerenciar produtos com cadastro/edição, preço, imagem, disponibilidade e categoria; categorias cadastro/edição/desativação; balcão com busca, seleção de produtos e quantidade, nome opcional, observações, resumo e registro de pedido presencial. Pedidos de ambos canais alimentam a mesma fila de pedidos. Não implementar estoque, emissão fiscal, pagamentos online ou multi-tenant.

Interações de demonstração reais no frontend, com estado compartilhado e localStorage apenas para dados fictícios de produtos/pedidos/carrinho; nenhum dado pessoal real, sinalizar que os dados digitados para demonstração devem ser fictícios e que esta versão não é adequada à produção. Use número de pedido único na demo, snapshot de preço/nome do item, cálculos consistentes, quantidades positivas e não aceitar carrinho vazio. Relatório e dashboard derivados dos dados mock; diferenciar pedidos realizados de vendas pagas. Use textos úteis e não invente integração em tempo real entre dispositivos; atualização local na demo. Evite botões sem ação. Inclua navegação funcional, tabelas adaptadas aos dispositivos, feedback de ações, layout coerente e README com instruções locais de execução e limitações, arquitetura e futuras etapas (Supabase, auth, RLS, cálculo server-side e segurança). Não crie credenciais reais nem habilite serviços pagos. Teste build/typecheck e corrija erros se possível. Priorize fluxo completo de pedido cliente -> fila admin -> alteração de status e pedido de balcão -> mesma fila. Entregue frontend demonstrativo, sem publicação.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ccba599-ea7f-49d5-9f1f-1ee592d25409).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
