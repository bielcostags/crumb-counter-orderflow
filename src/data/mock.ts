/**
 * Dados FICTÍCIOS de demonstração. Nenhum nome/telefone/endereço real.
 * Tudo é criado dentro de funções (nunca em escopo de módulo com Date/aleatório)
 * para ser compatível com SSR/Workers.
 */
import { buildOrderItems, calcTotalCents, getStatusFlow } from "@/lib/orders";
import type { Category, Order, OrderStatus, Product, StoreData } from "@/types";

export const STORE_VERSION = 1;

export const PRODUCT_IMAGE_GALLERY: { url: string; label: string }[] = [
  { url: "/images/products/pao-frances.jpg", label: "Pão francês" },
  { url: "/images/products/pao-fermentacao-natural.jpg", label: "Pão de fermentação natural" },
  { url: "/images/products/pao-integral.jpg", label: "Pão integral" },
  { url: "/images/products/bolo-cenoura.jpg", label: "Bolo de cenoura" },
  { url: "/images/products/bolo-fuba.jpg", label: "Bolo de fubá" },
  { url: "/images/products/bolo-chocolate.jpg", label: "Bolo de chocolate" },
  { url: "/images/products/coxinha.jpg", label: "Coxinha" },
  { url: "/images/products/pao-de-queijo.jpg", label: "Pão de queijo" },
  { url: "/images/products/empada.jpg", label: "Empada" },
  { url: "/images/products/cafe-coado.jpg", label: "Café coado" },
  { url: "/images/products/cappuccino.jpg", label: "Cappuccino" },
  { url: "/images/products/suco-laranja.jpg", label: "Suco de laranja" },
];

export function createSeedCategories(): Category[] {
  return [
    {
      id: "cat-paes",
      name: "Pães",
      description: "Fornadas ao longo do dia",
      active: true,
      sortOrder: 1,
    },
    {
      id: "cat-bolos",
      name: "Bolos",
      description: "Fatias e bolos inteiros",
      active: true,
      sortOrder: 2,
    },
    {
      id: "cat-salgados",
      name: "Salgados",
      description: "Assados e fritos na hora",
      active: true,
      sortOrder: 3,
    },
    {
      id: "cat-bebidas",
      name: "Bebidas",
      description: "Cafés e sucos",
      active: true,
      sortOrder: 4,
    },
  ];
}

export function createSeedProducts(): Product[] {
  const img = (f: string) => `/images/products/${f}.jpg`;
  return [
    {
      id: "p-pao-frances",
      name: "Pão francês",
      description: "Casca crocante e miolo macio. Preço por unidade.",
      priceCents: 120,
      categoryId: "cat-paes",
      imageUrl: img("pao-frances"),
      available: true,
    },
    {
      id: "p-pao-natural",
      name: "Pão de fermentação natural",
      description: "Fermentação lenta de 24h, casca rústica. Unidade de ~700 g.",
      priceCents: 2290,
      categoryId: "cat-paes",
      imageUrl: img("pao-fermentacao-natural"),
      available: true,
    },
    {
      id: "p-pao-integral",
      name: "Pão integral com grãos",
      description: "Farinha integral, linhaça, girassol e aveia. Fatiado.",
      priceCents: 1490,
      categoryId: "cat-paes",
      imageUrl: img("pao-integral"),
      available: false,
    },
    {
      id: "p-bolo-cenoura",
      name: "Bolo de cenoura (fatia)",
      description: "Fofinho, com cobertura de chocolate brilhante.",
      priceCents: 990,
      categoryId: "cat-bolos",
      imageUrl: img("bolo-cenoura"),
      available: true,
    },
    {
      id: "p-bolo-fuba",
      name: "Bolo de fubá com goiabada (fatia)",
      description: "Receita caseira com pedaços de goiabada.",
      priceCents: 850,
      categoryId: "cat-bolos",
      imageUrl: img("bolo-fuba"),
      available: true,
    },
    {
      id: "p-bolo-chocolate",
      name: "Bolo de chocolate (inteiro)",
      description: "Massa úmida e ganache. Serve até 10 pessoas.",
      priceCents: 5990,
      categoryId: "cat-bolos",
      imageUrl: img("bolo-chocolate"),
      available: true,
    },
    {
      id: "p-coxinha",
      name: "Coxinha de frango",
      description: "Massa leve e recheio cremoso de frango desfiado.",
      priceCents: 750,
      categoryId: "cat-salgados",
      imageUrl: img("coxinha"),
      available: true,
    },
    {
      id: "p-pao-queijo",
      name: "Pão de queijo (porção com 6)",
      description: "Feito com queijo meia cura, saindo do forno.",
      priceCents: 1200,
      categoryId: "cat-salgados",
      imageUrl: img("pao-de-queijo"),
      available: true,
    },
    {
      id: "p-empada",
      name: "Empada de palmito",
      description: "Massa amanteigada que desmancha.",
      priceCents: 800,
      categoryId: "cat-salgados",
      imageUrl: img("empada"),
      available: false,
    },
    {
      id: "p-cafe",
      name: "Café coado (200 ml)",
      description: "Grãos especiais torrados localmente.",
      priceCents: 550,
      categoryId: "cat-bebidas",
      imageUrl: img("cafe-coado"),
      available: true,
    },
    {
      id: "p-cappuccino",
      name: "Cappuccino",
      description: "Espresso, leite vaporizado e espuma cremosa.",
      priceCents: 900,
      categoryId: "cat-bebidas",
      imageUrl: img("cappuccino"),
      available: true,
    },
    {
      id: "p-suco-laranja",
      name: "Suco de laranja natural (300 ml)",
      description: "Espremido na hora, sem açúcar.",
      priceCents: 1000,
      categoryId: "cat-bebidas",
      imageUrl: img("suco-laranja"),
      available: true,
    },
  ];
}

interface SeedOrderSpec {
  daysAgo: number;
  minutesAgo: number;
  channel: Order["channel"];
  fulfillment: Order["fulfillment"];
  status: OrderStatus;
  paymentMethod: Order["paymentMethod"];
  paid: boolean;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  notes?: string;
  lines: { productId: string; quantity: number; notes?: string }[];
}

const SEED_ORDERS: SeedOrderSpec[] = [
  // Dias anteriores (relatório/gráfico)
  {
    daysAgo: 6,
    minutesAgo: 600,
    channel: "online",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "pix",
    paid: true,
    customerName: "Cliente Exemplo A",
    customerPhone: "(00) 90000-0001",
    lines: [
      { productId: "p-pao-frances", quantity: 10 },
      { productId: "p-cafe", quantity: 2 },
    ],
  },
  {
    daysAgo: 5,
    minutesAgo: 540,
    channel: "balcao",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "dinheiro",
    paid: true,
    lines: [{ productId: "p-bolo-chocolate", quantity: 1 }],
  },
  {
    daysAgo: 4,
    minutesAgo: 480,
    channel: "online",
    fulfillment: "entrega",
    status: "concluido",
    paymentMethod: "cartao",
    paid: true,
    customerName: "Cliente Exemplo B",
    customerPhone: "(00) 90000-0002",
    address: "Rua Fictícia, 100 — Bairro Demonstração",
    lines: [
      { productId: "p-pao-natural", quantity: 1 },
      { productId: "p-pao-queijo", quantity: 2 },
    ],
  },
  {
    daysAgo: 3,
    minutesAgo: 420,
    channel: "balcao",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "pix",
    paid: true,
    lines: [
      { productId: "p-coxinha", quantity: 4 },
      { productId: "p-suco-laranja", quantity: 2 },
    ],
  },
  {
    daysAgo: 2,
    minutesAgo: 400,
    channel: "online",
    fulfillment: "retirada",
    status: "cancelado",
    paymentMethod: "pix",
    paid: false,
    customerName: "Cliente Exemplo C",
    customerPhone: "(00) 90000-0003",
    lines: [{ productId: "p-bolo-cenoura", quantity: 3 }],
  },
  {
    daysAgo: 2,
    minutesAgo: 380,
    channel: "online",
    fulfillment: "entrega",
    status: "concluido",
    paymentMethod: "dinheiro",
    paid: true,
    customerName: "Cliente Exemplo D",
    customerPhone: "(00) 90000-0004",
    address: "Avenida Exemplo, 250 — Centro Fictício",
    lines: [
      { productId: "p-bolo-chocolate", quantity: 1 },
      { productId: "p-cappuccino", quantity: 2 },
    ],
  },
  {
    daysAgo: 1,
    minutesAgo: 500,
    channel: "balcao",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "cartao",
    paid: true,
    lines: [
      { productId: "p-pao-frances", quantity: 20 },
      { productId: "p-bolo-fuba", quantity: 2 },
    ],
  },
  {
    daysAgo: 1,
    minutesAgo: 300,
    channel: "online",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "pix",
    paid: true,
    customerName: "Cliente Exemplo E",
    customerPhone: "(00) 90000-0005",
    lines: [
      { productId: "p-pao-queijo", quantity: 1 },
      { productId: "p-cafe", quantity: 1 },
    ],
  },
  // Hoje (fila ativa)
  {
    daysAgo: 0,
    minutesAgo: 95,
    channel: "balcao",
    fulfillment: "retirada",
    status: "concluido",
    paymentMethod: "dinheiro",
    paid: true,
    customerName: "Mesa 2 (exemplo)",
    lines: [
      { productId: "p-cappuccino", quantity: 2 },
      { productId: "p-pao-queijo", quantity: 1 },
    ],
  },
  {
    daysAgo: 0,
    minutesAgo: 70,
    channel: "online",
    fulfillment: "entrega",
    status: "saiu_para_entrega",
    paymentMethod: "cartao",
    paid: false,
    customerName: "Cliente Exemplo F",
    customerPhone: "(00) 90000-0006",
    address: "Travessa Modelo, 42 — Vila Teste",
    lines: [
      { productId: "p-pao-natural", quantity: 1 },
      { productId: "p-bolo-cenoura", quantity: 2, notes: "Embalar separado" },
    ],
  },
  {
    daysAgo: 0,
    minutesAgo: 45,
    channel: "online",
    fulfillment: "retirada",
    status: "pronto",
    paymentMethod: "pix",
    paid: true,
    customerName: "Cliente Exemplo G",
    customerPhone: "(00) 90000-0007",
    lines: [
      { productId: "p-pao-frances", quantity: 6 },
      { productId: "p-coxinha", quantity: 2 },
    ],
  },
  {
    daysAgo: 0,
    minutesAgo: 25,
    channel: "balcao",
    fulfillment: "retirada",
    status: "em_preparacao",
    paymentMethod: "cartao",
    paid: false,
    lines: [
      { productId: "p-cafe", quantity: 1 },
      { productId: "p-bolo-fuba", quantity: 1, notes: "Aquecer" },
    ],
  },
  {
    daysAgo: 0,
    minutesAgo: 12,
    channel: "online",
    fulfillment: "entrega",
    status: "pendente",
    paymentMethod: "dinheiro",
    paid: false,
    customerName: "Cliente Exemplo H",
    customerPhone: "(00) 90000-0008",
    address: "Rua das Demonstrações, 7 — Jardim Exemplo",
    notes: "Troco para R$ 100 (exemplo)",
    lines: [
      { productId: "p-bolo-chocolate", quantity: 1 },
      { productId: "p-suco-laranja", quantity: 2 },
    ],
  },
  {
    daysAgo: 0,
    minutesAgo: 5,
    channel: "online",
    fulfillment: "retirada",
    status: "pendente",
    paymentMethod: "pix",
    paid: false,
    customerName: "Cliente Exemplo I",
    customerPhone: "(00) 90000-0009",
    lines: [
      { productId: "p-pao-queijo", quantity: 2, notes: "Bem quentinho" },
      { productId: "p-cappuccino", quantity: 1 },
    ],
  },
];

export function createSeedOrders(products: Product[], categories: Category[], now: Date): Order[] {
  // Para montar o snapshot no seed, consideramos todos os produtos vendáveis.
  const allSellable = products.map((p) => ({ ...p, available: true }));
  return SEED_ORDERS.map((spec, idx) => {
    const created = new Date(now);
    created.setDate(created.getDate() - spec.daysAgo);
    created.setTime(created.getTime() - spec.minutesAgo * 60_000);
    if (spec.daysAgo > 0) created.setHours(8 + (idx % 9), (idx * 7) % 60, 0, 0);
    const items = buildOrderItems(spec.lines, allSellable, categories);
    const flow = getStatusFlow(spec.fulfillment);
    const reached =
      spec.status === "cancelado"
        ? ["pendente" as OrderStatus, "cancelado" as OrderStatus]
        : flow.slice(0, flow.indexOf(spec.status) + 1);
    const history = reached.map((status, i) => ({
      status,
      at: new Date(created.getTime() + i * 4 * 60_000).toISOString(),
    }));
    return {
      id: `seed-${idx + 1}`,
      number: 1001 + idx,
      channel: spec.channel,
      fulfillment: spec.fulfillment,
      status: spec.status,
      paymentMethod: spec.paymentMethod,
      paymentStatus: spec.paid ? "pago" : "pendente",
      customerName: spec.customerName,
      customerPhone: spec.customerPhone,
      address: spec.address,
      notes: spec.notes,
      items,
      totalCents: calcTotalCents(items),
      createdAt: created.toISOString(),
      updatedAt: history.at(-1)?.at ?? created.toISOString(),
      history,
    } satisfies Order;
  });
}

export function createSeedStore(now: Date = new Date()): StoreData {
  const categories = createSeedCategories();
  const products = createSeedProducts();
  return {
    version: STORE_VERSION,
    categories,
    products,
    orders: createSeedOrders(products, categories, now),
  };
}
