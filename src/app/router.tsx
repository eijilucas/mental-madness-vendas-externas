import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { NewOrderPage } from "@/features/order-intake/NewOrderPage";
import { EditOrderPage } from "@/features/order-intake/EditOrderPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { SettingsPage } from "@/features/users/SettingsPage";
import { GroupsPage } from "@/features/groups/GroupsPage";
import { GroupDetailPage } from "@/features/groups/GroupDetailPage";

function withShell(children: React.ReactNode) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: withShell(<DashboardPage />) },
  { path: "/novo-pedido", element: withShell(<NewOrderPage />) },
  { path: "/pedidos", element: withShell(<OrdersPage />) },
  { path: "/pedidos/:orderNumber", element: withShell(<OrderDetailPage />) },
  { path: "/pedidos/:orderNumber/editar", element: withShell(<EditOrderPage />) },
  { path: "/drops", element: withShell(<GroupsPage />) },
  { path: "/drops/:groupId", element: withShell(<GroupDetailPage />) },
  { path: "/integracoes", element: withShell(<IntegrationsPage />) },
  { path: "/catalogo", element: withShell(<CatalogPage />) },
  { path: "/configuracoes", element: withShell(<SettingsPage />) },
]);
