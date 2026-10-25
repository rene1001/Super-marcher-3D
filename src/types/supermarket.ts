export type ProductCategory = 
  | 'bakery'
  | 'fruits_veg'
  | 'dairy'
  | 'meat_fish'
  | 'grocery'
  | 'frozen';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  unit: string;
  description: string;
  origin: string;
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  ecoScore: 'A' | 'B' | 'C' | 'D';
  isBio?: boolean;
  modelType: 
    | 'baguette' 
    | 'croissant' 
    | 'brioche'
    | 'apple_crate' 
    | 'orange_crate' 
    | 'banana_crate' 
    | 'carrot_crate'
    | 'milk_bottle' 
    | 'cheese_wheel' 
    | 'yogurt_pack'
    | 'steak_tray' 
    | 'salmon_fillet' 
    | 'chicken_pack'
    | 'cereal_box' 
    | 'pasta_box' 
    | 'olive_oil' 
    | 'juice_bottle'
    | 'frozen_pizza' 
    | 'ice_cream_tub';
  // Position in the 3D supermarket (aisle shelf slot)
  shelfId: string;
  shelfTier: number; // 0 (bottom) to 2 (top)
  slotIndex: number; // 0, 1, 2 on that tier
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'prep' | 'transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  type: 'store_pickup' | 'home_delivery';
  status: OrderStatus;
  assignedVanId?: string;
  deliveryCoords?: { x: number; y: number }; // Relative city map coordinates
  etaMinutes?: number;
}

export interface DeliveryVan {
  id: string;
  name: string;
  driver: string;
  vehiclePlate: string;
  phone: string;
  speedKmH: number;
  batteryPercent: number;
  currentCoords: { x: number; y: number };
  targetCoords: { x: number; y: number };
  activeOrderId?: string;
  status: 'idle' | 'delivering' | 'returning';
  routeProgress: number; // 0 to 1
}

export interface AisleInfo {
  id: string;
  name: string;
  category: ProductCategory;
  icon: string;
  description: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  shelfBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  tiersCount?: number; // default: 3 tiers, expandable to 4, 5
  width?: number; // default: 6.0m, expandable to 7.5m, 9.0m
}
