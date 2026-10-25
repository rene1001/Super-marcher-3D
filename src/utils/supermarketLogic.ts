import { CartItem, Order, OrderStatus, Product, ProductCategory } from '../types/supermarket';

export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

export function calculateCartTotals(
  items: CartItem[],
  options?: { isDelivery?: boolean; discountPercentage?: number }
): CartTotals {
  const isDelivery = options?.isDelivery ?? false;
  const discountPct = options?.discountPercentage ?? 0;

  let rawSubtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    rawSubtotal += item.product.price * qty;
    itemCount += qty;
  }

  const discount = Number(((rawSubtotal * discountPct) / 100).toFixed(2));
  const subtotalAfterDiscount = Math.max(0, rawSubtotal - discount);

  // In French supermarkets: 5.5% on standard food products
  const tax = Number((subtotalAfterDiscount * 0.055).toFixed(2));
  const deliveryFee = isDelivery && itemCount > 0 ? (subtotalAfterDiscount > 50 ? 0 : 3.50) : 0;
  const total = Number((subtotalAfterDiscount + tax + deliveryFee).toFixed(2));

  return {
    subtotal: Number(rawSubtotal.toFixed(2)),
    discount,
    tax,
    deliveryFee,
    total,
    itemCount,
  };
}

export function applyStockReduction(
  products: Product[],
  cartItems: CartItem[]
): { updatedProducts: Product[]; success: boolean; error?: string } {
  const stockMap = new Map(products.map((p) => [p.id, p.stock]));

  for (const item of cartItems) {
    const currentStock = stockMap.get(item.product.id) ?? 0;
    if (currentStock < item.quantity) {
      return {
        updatedProducts: products,
        success: false,
        error: `Stock insuffisant pour ${item.product.name} (disponible: ${currentStock}, demandé: ${item.quantity})`,
      };
    }
  }

  const updatedProducts = products.map((p) => {
    const itemInCart = cartItems.find((ci) => ci.product.id === p.id);
    if (!itemInCart) return p;
    return {
      ...p,
      stock: Math.max(0, p.stock - itemInCart.quantity),
    };
  });

  return { updatedProducts, success: true };
}

export function createCustomerOrder(
  cartItems: CartItem[],
  customerInfo: {
    name: string;
    address: string;
    phone: string;
    type: 'store_pickup' | 'home_delivery';
  },
  destinationCoords?: { x: number; y: number }
): Order {
  const isDelivery = customerInfo.type === 'home_delivery';
  const totals = calculateCartTotals(cartItems, { isDelivery });
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `CMD-${randomSuffix}`;

  return {
    id,
    createdAt: 'À l’instant',
    customerName: customerInfo.name || 'Client Anonyme',
    customerAddress: customerInfo.address || 'Au supermarché',
    customerPhone: customerInfo.phone || '06 00 00 00 00',
    items: [...cartItems],
    subtotal: totals.subtotal,
    tax: totals.tax,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    type: customerInfo.type,
    status: isDelivery ? 'prep' : 'delivered',
    deliveryCoords: destinationCoords || {
      x: 20 + Math.floor(Math.random() * 60),
      y: 20 + Math.floor(Math.random() * 60),
    },
    etaMinutes: isDelivery ? 20 : 0,
  };
}

export function calculateDeliveryEta(
  vanCoords: { x: number; y: number },
  destinationCoords: { x: number; y: number },
  speedKmH: number
): { distanceKm: number; etaMinutes: number; status: OrderStatus } {
  const dx = destinationCoords.x - vanCoords.x;
  const dy = destinationCoords.y - vanCoords.y;
  // Scaled Euclidean distance on city grid (100 units = 10 km)
  const distanceUnits = Math.sqrt(dx * dx + dy * dy);
  const distanceKm = Number(((distanceUnits / 100) * 10).toFixed(1));

  if (distanceKm < 0.2) {
    return { distanceKm: 0, etaMinutes: 0, status: 'delivered' };
  }

  const effectiveSpeed = Math.max(speedKmH, 20); // Average 20-50 km/h in urban
  const hours = distanceKm / effectiveSpeed;
  const etaMinutes = Math.max(1, Math.round(hours * 60));

  return {
    distanceKm,
    etaMinutes,
    status: 'transit',
  };
}

export function filterProducts(
  products: Product[],
  searchQuery: string,
  categoryFilter: ProductCategory | 'all',
  inStockOnly: boolean = false
): Product[] {
  const query = searchQuery.trim().toLowerCase();

  return products.filter((prod) => {
    if (categoryFilter !== 'all' && prod.category !== categoryFilter) {
      return false;
    }
    if (inStockOnly && prod.stock <= 0) {
      return false;
    }
    if (query) {
      const matchName = prod.name.toLowerCase().includes(query);
      const matchDesc = prod.description.toLowerCase().includes(query);
      const matchOrigin = prod.origin.toLowerCase().includes(query);
      return matchName || matchDesc || matchOrigin;
    }
    return true;
  });
}

export function calculateSalesAnalytics(orders: Order[]) {
  let totalRevenue = 0;
  let totalDeliveredOrders = 0;
  const categorySales: Record<ProductCategory, number> = {
    bakery: 0,
    fruits_veg: 0,
    dairy: 0,
    meat_fish: 0,
    grocery: 0,
    frozen: 0,
  };

  const productUnitsSold: Record<string, { name: string; units: number; revenue: number }> = {};

  for (const order of orders) {
    if (order.status !== 'cancelled') {
      totalRevenue += order.total;
      totalDeliveredOrders += 1;

      for (const item of order.items) {
        const cat = item.product.category;
        const lineTotal = item.product.price * item.quantity;
        if (categorySales[cat] !== undefined) {
          categorySales[cat] += lineTotal;
        }

        if (!productUnitsSold[item.product.id]) {
          productUnitsSold[item.product.id] = {
            name: item.product.name,
            units: 0,
            revenue: 0,
          };
        }
        productUnitsSold[item.product.id].units += item.quantity;
        productUnitsSold[item.product.id].revenue += lineTotal;
      }
    }
  }

  const averageBasket = totalDeliveredOrders > 0 ? Number((totalRevenue / totalDeliveredOrders).toFixed(2)) : 0;

  const topProducts = Object.values(productUnitsSold)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrdersCount: orders.length,
    averageBasket,
    categorySales,
    topProducts,
  };
}
