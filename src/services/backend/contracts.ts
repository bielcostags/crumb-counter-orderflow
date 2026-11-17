/** Proposed remote boundary; intentionally not wired to the local application. */
import type { CatalogService } from "@/services/contracts";
import type { CheckoutInput, CounterOrderInput, OrderQuoteItem } from "@/lib/orders";
import type {
  CartLine,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  FulfillmentType,
} from "@/types";

export type StaffRole = "admin" | "atendente";
export interface RemoteAttempt {
  /** Client-generated UUID, reused after timeout; different payload requires a new key. */
  idempotencyKey: string;
  expectedItems: OrderQuoteItem[];
}
/** Explicit allowlist: never return an Order to the public tracking endpoint. */
export interface PublicOrderTracking {
  number: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: string;
  items: {
    name: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
  }[];
  history: { status: OrderStatus; at: string }[];
}
export interface RemoteCreationResult {
  order: PublicOrderTracking;
  trackingToken: string;
}
export interface PublicOrderService {
  createOnlineOrder(
    input: CheckoutInput,
    lines: CartLine[],
    attempt: RemoteAttempt,
  ): Promise<RemoteCreationResult>;
  getOrderByToken(token: string): Promise<PublicOrderTracking | null>;
}
export interface StaffOrderService {
  /** Pagination is mandatory in the future implementation; never load all orders publicly. */
  listOrders(query: {
    limit: number;
    cursor?: string;
  }): Promise<{ orders: Order[]; nextCursor: string | null }>;
  createCounterOrder(input: CounterOrderInput, attempt: RemoteAttempt): Promise<Order>;
  updateStatus(
    orderId: string,
    to: OrderStatus,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<Order>;
  markPaid(orderId: string, expectedVersion: number, idempotencyKey: string): Promise<Order>;
}
/** No resetDemoData operation exists on the remote boundary. */
export interface RemoteServices {
  catalog: CatalogService;
  publicOrders: PublicOrderService;
  staffOrders: StaffOrderService;
}
export type RemoteErrorCode =
  | "CATALOG_CHANGED"
  | "UNAVAILABLE_PRODUCT"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "NETWORK_ERROR";
