/**
 * Tipos de domínio da Padaria Digital.
 * Espelham o futuro esquema PostgreSQL (ver README → Próximas etapas).
 */

export type ID = string;

export interface Category {
  id: ID;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
}

export interface Product {
  id: ID;
  name: string;
  description: string;
  /** Preço em centavos (inteiro) para evitar erros de ponto flutuante. */
  priceCents: number;
  categoryId: ID;
  imageUrl: string;
  available: boolean;
}

export type OrderChannel = "online" | "balcao";
export type FulfillmentType = "retirada" | "entrega";
export type PaymentMethod = "pix" | "dinheiro" | "cartao";
export type PaymentStatus = "pendente" | "pago";

export type OrderStatus =
  | "pendente"
  | "em_preparacao"
  | "pronto"
  | "saiu_para_entrega"
  | "concluido"
  | "cancelado";

/** Snapshot do produto no momento do pedido (nome e preço não mudam depois). */
export interface OrderItem {
  productId: ID;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  subtotalCents: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string; // ISO
}

export interface Order {
  id: ID;
  /** Número sequencial único exibido ao cliente/equipe. */
  number: number;
  channel: OrderChannel;
  fulfillment: FulfillmentType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  notes?: string;
  items: OrderItem[];
  totalCents: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  history: OrderStatusEvent[];
}

export interface CartLine {
  productId: ID;
  quantity: number;
  notes?: string;
}

export interface StoreData {
  version: number;
  categories: Category[];
  products: Product[];
  orders: Order[];
}
