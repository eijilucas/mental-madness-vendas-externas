import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import type { Order, OrderAddress, OrderGroup, OrderItem, Profile, UserRole } from "@/types/database";
import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

export interface ManagedUser extends Profile {
  email: string | null;
}

// CRUD de operadores (admin-only, ver supabase/functions/manage-users) —
// nunca chama auth.admin.* direto do navegador, só através da function.
export function useUsersList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<ManagedUser[]> => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.users as ManagedUser[];
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; name: string; role: UserRole }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", ...input },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "create_failed");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; role?: UserRole; active?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "update", ...input },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "update_failed");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (input: { id: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "reset_password", ...input },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "reset_password_failed");
      return data;
    },
  });
}

// Pedidos com pelo menos uma integração pra mostrar na Central de
// Integrações — tem cupom informado (comissionamento) ou já tentou entrar
// na fila de envio (todo pedido criado tenta, então isso é quase sempre).
export function useIntegrationEvents() {
  return useQuery({
    queryKey: ["integration-events"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "created")
        .or("coupon_code.not.is.null,shipping_status.neq.pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

export function useRetryShipping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("send-to-shipping", {
        body: { order_id: orderId },
      });
      if (error || !data?.ok) throw error ?? new Error("send-to-shipping failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-events"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRetryCouponSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, couponCode }: { orderId: string; couponCode: string }) => {
      const { data, error } = await supabase.functions.invoke("register-coupon-sale", {
        body: { order_id: orderId, coupon_code: couponCode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-events"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export interface OrderSummary {
  order: Order;
  itemsSummary: string;
}

function buildItemsSummary(items: Pick<OrderItem, "product_name" | "size">[]): string {
  if (items.length === 0) return "Sem itens";
  if (items.length === 1) {
    return items[0].size ? `${items[0].product_name} · ${items[0].size}` : items[0].product_name;
  }
  return `${items.length} peças`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOrderSummaries(applyFilter?: (query: any) => any): Promise<OrderSummary[]> {
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (applyFilter) query = applyFilter(query);
  const { data: orders, error } = await query;
  if (error) throw error;

  const orderIds = ((orders ?? []) as unknown as Order[]).map((o) => o.id);
  const { data: items, error: itemsError } = orderIds.length
    ? await supabase.from("order_items").select("order_id, product_name, size").in("order_id", orderIds)
    : { data: [], error: null };
  if (itemsError) throw itemsError;

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return ((orders ?? []) as unknown as Order[]).map((order) => ({
    order,
    itemsSummary: buildItemsSummary(itemsByOrder.get(order.id) ?? []),
  }));
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrderSummaries(),
  });
}

// Pedidos de um grupo específico — usado na página de detalhe do grupo.
export function useOrdersByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["orders", "group", groupId],
    enabled: !!groupId,
    queryFn: () => fetchOrderSummaries((q) => q.eq("group_id", groupId)),
  });
}

// Pedidos que ainda não pertencem a nenhum grupo — usado no "Adicionar
// pedidos" dentro de um grupo.
export function useUngroupedOrders() {
  return useQuery({
    queryKey: ["orders", "ungrouped"],
    queryFn: () => fetchOrderSummaries((q) => q.is("group_id", null)),
  });
}

export function useOrderGroups() {
  return useQuery({
    queryKey: ["order-groups"],
    queryFn: async (): Promise<Array<{ group: OrderGroup; orderCount: number }>> => {
      const { data: groups, error } = await supabase
        .from("order_groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("group_id")
        .not("group_id", "is", null);
      if (ordersError) throw ordersError;

      const countByGroup = new Map<string, number>();
      for (const o of orders ?? []) {
        const key = (o as { group_id: string }).group_id;
        countByGroup.set(key, (countByGroup.get(key) ?? 0) + 1);
      }

      return ((groups ?? []) as unknown as OrderGroup[]).map((group) => ({
        group,
        orderCount: countByGroup.get(group.id) ?? 0,
      }));
    },
  });
}

export function useOrderGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["order-group", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<OrderGroup | null> => {
      const { data, error } = await supabase
        .from("order_groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrderGroup | null;
    },
  });
}

export function useCreateOrderGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("order_groups").insert({ name }).select().single();
      if (error) throw error;
      return data as unknown as OrderGroup;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-groups"] }),
  });
}

export function useRenameOrderGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const { error } = await supabase.from("order_groups").update({ name }).eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["order-groups"] });
      queryClient.invalidateQueries({ queryKey: ["order-group", groupId] });
    },
  });
}

export function useDeleteOrderGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("order_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-groups"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Associa (groupId) ou remove (groupId null) um pedido de um grupo.
export function useSetOrderGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, groupId }: { orderId: string; groupId: string | null }) => {
      const { error } = await supabase.rpc("set_order_group", {
        p_order_id: orderId,
        p_group_id: groupId,
      });
      if (error) throw error;

      // Pedido pode já ter sido mandado pro mm-etiquetas antes de entrar
      // (ou sair) desse drop — send-to-shipping só roda uma vez na criação,
      // então sem isso o agrupamento no painel de fila de aprovação nunca
      // se atualizaria. Best-effort de propósito, igual o NewOrderPage: o
      // pedido já foi agrupado/desagrupado com sucesso aqui, isso é só uma
      // tentativa de manter o mm-etiquetas em dia — se falhar, o pedido
      // fica temporariamente sem refletir o drop lá, mas nada se perde.
      await supabase.functions.invoke("send-to-shipping", { body: { order_id: orderId } }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-groups"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Passa pela Edge Function em vez da RPC direto — ela também
      // desfaz o pedido no mm-etiquetas e a comissão no mvp, quando
      // aplicável (contrato: docs/api-contracts/06-external-order-delete.md).
      const { error } = await supabase.functions.invoke("delete-order", { body: { order_id: orderId } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-groups"] });
    },
  });
}

export function useOrder(publicNumber: string | undefined) {
  return useQuery({
    queryKey: ["order", publicNumber],
    enabled: !!publicNumber,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("public_number", publicNumber)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;

      const [{ data: address }, { data: items }] = await Promise.all([
        supabase.from("order_addresses").select("*").eq("order_id", order.id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", order.id),
      ]);

      return {
        order: order as unknown as Order,
        address: (address ?? null) as unknown as OrderAddress | null,
        items: (items ?? []) as unknown as OrderItem[],
      };
    },
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: products, error: productsError }, { data: variants, error: variantsError }] =
        await Promise.all([
          supabase.from("catalog_products").select("*"),
          supabase.from("catalog_variants").select("*"),
        ]);
      if (productsError) throw productsError;
      if (variantsError) throw variantsError;

      const variantsByProduct = new Map<string, typeof variants>();
      for (const v of variants ?? []) {
        const list = variantsByProduct.get(v.product_id) ?? [];
        list.push(v);
        variantsByProduct.set(v.product_id, list);
      }

      const result: CatalogSnapshotProduct[] = (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        drop: p.drop_id ? { id: p.drop_id, name: p.drop_name, status: p.drop_status } : null,
        active: p.active,
        variants: (variantsByProduct.get(p.id) ?? []).map((v) => ({
          variantKey: v.variant_key,
          size: v.size,
          color: v.color,
          estoqueReal: v.estoque_real,
          price: v.price != null ? Number(v.price) : null,
        })),
      }));

      return result;
    },
  });
}
