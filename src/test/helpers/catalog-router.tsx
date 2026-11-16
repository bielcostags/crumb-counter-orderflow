import { render } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { AdminSessionProvider } from "@/contexts/AdminSessionContext";
import { Route as Counter } from "@/routes/admin.balcao";
import { Route as Orders } from "@/routes/admin.pedidos";
import { Route as Track } from "@/routes/acompanhar";
import { Route as Admin } from "@/routes/admin";
import { Route as Access } from "@/routes/admin.acesso";
import { Route as Dashboard } from "@/routes/admin.index";
import { Route as Products } from "@/routes/admin.produtos";
import { Route as Categories } from "@/routes/admin.categorias";
import { Route as Menu } from "@/routes/index";
import { Route as Cart } from "@/routes/carrinho";
import { Route as Checkout } from "@/routes/checkout";

export async function openCatalog(path = "/admin/produtos") {
  const root = createRootRoute({
    component: () => (
      <StoreProvider>
        <CartProvider>
          <AdminSessionProvider>
            <Outlet />
          </AdminSessionProvider>
        </CartProvider>
      </StoreProvider>
    ),
  });
  const admin = createRoute({
    getParentRoute: () => root,
    path: "/admin",
    component: Admin.options.component!,
  });
  const routes = [
    createRoute({
      getParentRoute: () => root,
      path: "/acompanhar",
      component: Track.options.component!,
      validateSearch: Track.options.validateSearch!,
    }),
    createRoute({ getParentRoute: () => root, path: "/", component: Menu.options.component! }),
    createRoute({
      getParentRoute: () => root,
      path: "/carrinho",
      component: Cart.options.component!,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/checkout",
      component: Checkout.options.component!,
    }),
    admin.addChildren([
      createRoute({
        getParentRoute: () => admin,
        path: "/balcao",
        component: Counter.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/pedidos",
        component: Orders.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/",
        component: Dashboard.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/acesso",
        component: Access.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/produtos",
        component: Products.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/categorias",
        component: Categories.options.component!,
      }),
    ]),
  ];
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMinMs: 0,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
