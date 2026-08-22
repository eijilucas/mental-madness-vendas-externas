import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import type { Order, OrderAddress, OrderItem } from "@/types/database";
import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

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

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<OrderSummary[]> => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const orderIds = (orders ?? []).map((o) => o.id);
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

      return (orders ?? []).map((order) => ({
        order: order as unknown as Order,
        itemsSummary: buildItemsSummary(itemsByOrder.get(order.id) ?? []),
      }));
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
        })),
      }));

      return result;
    },
  });
}
