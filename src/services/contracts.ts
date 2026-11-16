/**
 * Contratos de serviço da aplicação.
 *
 * Hoje a implementação é local (localStorage, ver ./local). Na próxima fase,
 * uma implementação Supabase/PostgreSQL deve satisfazer estes mesmos contratos,
 * com cálculo de preços/totais e transições de status validados no servidor
 * e políticas RLS protegendo cada tabela. A UI não precisa mudar.
 */
import type { CheckoutInput, CounterOrderInput } from "@/lib/orders";
import type { CartLine, Category, ID, Order, OrderItem, OrderStatus, Product } from "@/types";

export interface CategoryInput {
  name: string;
  description?: string;
  active: boolean;
}

export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  categoryId: ID;
  imageUrl: string;
  available: boolean;
}

export interface CatalogService {
  listCategories(): Promise<Category[]>;
  saveCategory(input: CategoryInput, id?: ID): Promise<Category>;
  setCategoryActive(id: ID, active: boolean): Promise<Category>;
  listProducts(): Promise<Product[]>;
  saveProduct(input: ProductInput, id?: ID): Promise<Product>;
  setProductAvailable(id: ID, available: boolean): Promise<Product>;
}

export interface OrderService {
  listOrders(): Promise<Order[]>;
  getOrderByNumber(number: number): Promise<Order | null>;
  /** Pedido online do cliente: preços recalculados a partir do catálogo. */
  createOnlineOrder(
    input: CheckoutInput,
    lines: CartLine[],
    expectedItems?: OrderItem[],
  ): Promise<Order>;
  /** Pedido presencial registrado no balcão. Entra na mesma fila. */
  createCounterOrder(input: CounterOrderInput): Promise<Order>;
  updateStatus(orderId: ID, to: OrderStatus): Promise<Order>;
  markPaid(orderId: ID): Promise<Order>;
}

export interface DemoService {
  /** Restaura os dados fictícios iniciais (apenas na demonstração). */
  resetDemoData(): Promise<void>;
}

export interface AppServices {
  catalog: CatalogService;
  orders: OrderService;
  demo: DemoService;
}
