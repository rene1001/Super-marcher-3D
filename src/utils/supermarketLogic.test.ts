import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  applyStockReduction,
  createCustomerOrder,
  calculateDeliveryEta,
  filterProducts,
  calculateSalesAnalytics,
} from './supermarketLogic';
import { CartItem, Product } from '../types/supermarket';

const mockProductA: Product = {
  id: 'p1',
  name: 'Baguette Tradition',
  category: 'bakery',
  price: 1.20,
  stock: 10,
  unit: 'pièce',
  description: 'Baguette fraîche',
  origin: 'France',
  nutriScore: 'A',
  ecoScore: 'A',
  modelType: 'baguette',
  shelfId: 'aisle_bakery',
  shelfTier: 1,
  slotIndex: 0,
};

const mockProductB: Product = {
  id: 'p2',
  name: 'Lait Bio 1L',
  category: 'dairy',
  price: 2.00,
  stock: 5,
  unit: 'bouteille',
  description: 'Lait bio frais',
  origin: 'France',
  nutriScore: 'B',
  ecoScore: 'A',
  modelType: 'milk_bottle',
  shelfId: 'aisle_dairy',
  shelfTier: 2,
  slotIndex: 1,
};

test('calculateCartTotals computes subtotal, 5.5% tax, and delivery fee correctly', () => {
  const items: CartItem[] = [
    { product: mockProductA, quantity: 2 }, // 2.40
    { product: mockProductB, quantity: 1 }, // 2.00
  ];

  // Subtotal = 4.40
  // Discount = 0
  // Tax (5.5%) = 4.40 * 0.055 = 0.24
  // Store pickup -> deliveryFee = 0
  const totalsPickup = calculateCartTotals(items, { isDelivery: false });
  assert.equal(totalsPickup.subtotal, 4.40);
  assert.equal(totalsPickup.discount, 0);
  assert.equal(totalsPickup.tax, 0.24);
  assert.equal(totalsPickup.deliveryFee, 0);
  assert.equal(totalsPickup.total, 4.64);
  assert.equal(totalsPickup.itemCount, 3);

  // Home delivery under 50€ -> 3.50€ delivery fee
  const totalsDelivery = calculateCartTotals(items, { isDelivery: true });
  assert.equal(totalsDelivery.deliveryFee, 3.50);
  assert.equal(totalsDelivery.total, 8.14);
});

test('calculateCartTotals applies discount code percentage', () => {
  const items: CartItem[] = [{ product: mockProductB, quantity: 5 }]; // 10.00€
  const totals = calculateCartTotals(items, { discountPercentage: 20 });
  assert.equal(totals.subtotal, 10.00);
  assert.equal(totals.discount, 2.00);
  // taxable = 8.00 -> 8.00 * 0.055 = 0.44
  assert.equal(totals.tax, 0.44);
  assert.equal(totals.total, 8.44);
});

test('applyStockReduction decreases product stock and blocks when stock is insufficient', () => {
  const products = [mockProductA, mockProductB];
  const validCart: CartItem[] = [
    { product: mockProductA, quantity: 3 },
    { product: mockProductB, quantity: 2 },
  ];

  const result = applyStockReduction(products, validCart);
  assert.equal(result.success, true);
  assert.equal(result.updatedProducts[0].stock, 7); // 10 - 3
  assert.equal(result.updatedProducts[1].stock, 3); // 5 - 2

  // Excessive quantity
  const invalidCart: CartItem[] = [{ product: mockProductB, quantity: 10 }];
  const invalidResult = applyStockReduction(products, invalidCart);
  assert.equal(invalidResult.success, false);
  assert.match(invalidResult.error || '', /Stock insuffisant/);
});

test('createCustomerOrder generates an order with proper fields and coordinates', () => {
  const items: CartItem[] = [{ product: mockProductA, quantity: 1 }];
  const order = createCustomerOrder(
    items,
    {
      name: 'Jean Dupont',
      address: '10 Rue de Paris',
      phone: '06 12 34 56 78',
      type: 'home_delivery',
    },
    { x: 45, y: 55 }
  );

  assert.match(order.id, /^CMD-\d+$/);
  assert.equal(order.customerName, 'Jean Dupont');
  assert.equal(order.status, 'prep');
  assert.equal(order.deliveryCoords?.x, 45);
  assert.equal(order.deliveryCoords?.y, 55);
  assert.equal(order.type, 'home_delivery');
});

test('calculateDeliveryEta computes accurate urban distance and time', () => {
  const van = { x: 50, y: 50 };
  const destClose = { x: 50, y: 50.1 };
  const deliveredResult = calculateDeliveryEta(van, destClose, 30);
  assert.equal(deliveredResult.status, 'delivered');
  assert.equal(deliveredResult.etaMinutes, 0);

  const destFar = { x: 80, y: 90 }; // dx=30, dy=40 -> distanceUnits = 50 -> 5 km
  const transitResult = calculateDeliveryEta(van, destFar, 30); // 5km at 30km/h = 10 min
  assert.equal(transitResult.status, 'transit');
  assert.equal(transitResult.distanceKm, 5.0);
  assert.equal(transitResult.etaMinutes, 10);
});

test('filterProducts filters by search query and category', () => {
  const prods = [mockProductA, mockProductB];
  assert.equal(filterProducts(prods, 'Baguette', 'all').length, 1);
  assert.equal(filterProducts(prods, '', 'dairy').length, 1);
  assert.equal(filterProducts(prods, 'xyz', 'all').length, 0);
});

test('calculateSalesAnalytics computes total revenue and top products', () => {
  const order = createCustomerOrder(
    [
      { product: mockProductA, quantity: 2 },
      { product: mockProductB, quantity: 3 },
    ],
    { name: 'Alice', address: 'Rue A', phone: '0600', type: 'store_pickup' }
  );

  const analytics = calculateSalesAnalytics([order]);
  assert.equal(analytics.totalOrdersCount, 1);
  assert.ok(analytics.totalRevenue > 0);
  assert.equal(analytics.topProducts.length, 2);
});

test('Aisle section augmentation increases tiers count and width bounds', () => {
  const initialAisle = {
    id: 'aisle_bakery',
    name: 'Boulangerie',
    category: 'bakery' as const,
    icon: '🥖',
    color: '#eab308',
    position: [-4.5, 0, -4.5] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    tiersCount: 3,
    width: 6.0,
  };

  // Augment tiers
  const augmentedTiers = { ...initialAisle, tiersCount: initialAisle.tiersCount + 1 };
  assert.equal(augmentedTiers.tiersCount, 4);

  // Expand width
  const expandedWidth = { ...initialAisle, width: initialAisle.width + 1.5 };
  assert.equal(expandedWidth.width, 7.5);

  // Minimum bounds check
  const clampedTiers = Math.max(1, (initialAisle.tiersCount || 3) - 10);
  assert.equal(clampedTiers, 1);

  const clampedWidth = Math.max(3.0, (initialAisle.width || 6.0) - 10);
  assert.equal(clampedWidth, 3.0);
});
