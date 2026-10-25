/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AISLES, INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_VANS } from './data/supermarketData';
import { CameraViewMode, SupermarketWorld } from './3d/SupermarketWorld';
import { AisleInfo, CartItem, DeliveryVan, Order, OrderStatus, Product } from './types/supermarket';
import { NavigationHUD } from './components/NavigationHUD';
import { ProductInspectorModal } from './components/ProductInspectorModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { applyStockReduction, calculateCartTotals } from './utils/supermarketLogic';
import { sounds } from './utils/audio';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SupermarketWorld | null>(null);

  // Toast notifications
  const { toasts, showToast, dismissToast } = useToast();

  // App mode
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Supermarket state
  const [aisles, setAisles] = useState<AisleInfo[]>(AISLES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [vans, setVans] = useState<DeliveryVan[]>(INITIAL_VANS);

  // 3D View mode
  const [viewMode, setViewMode] = useState<CameraViewMode>('cart');

  // Modals
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Hover state on 3D products
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize Three.js Supermarket World once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const world = new SupermarketWorld(canvasMountRef.current, products, {
      onHoverProduct: (prod, pos) => {
        setHoveredProduct(prod);
        setHoverScreenPos(pos);
      },
      onClickProduct: (prod) => {
        setInspectedProduct(prod);
      },
      onCartMove: () => {},
    });

    worldRef.current = world;
    (window as unknown as { __supermarketWorld?: SupermarketWorld }).__supermarketWorld = world;

    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, []); // Mount once

  // Calculate cart summary
  const cartTotals = calculateCartTotals(cartItems);

  // Handle Add to Cart from 3D inspection or shelf
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    // 1. Stock check: Complete rupture
    if (product.stock <= 0) {
      showToast({
        type: 'error',
        title: 'Rupture de stock !',
        message: `Le produit "${product.name}" est actuellement en rupture de stock.`,
      });
      return;
    }

    const existing = cartItems.find((item) => item.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    // 2. Stock check: Requested quantity exceeds available stock
    if (currentQtyInCart + quantity > product.stock) {
      showToast({
        type: 'warning',
        title: 'Stock limité en rayon',
        message: `Seulement ${product.stock} unité(s) disponible(s) pour "${product.name}".`,
      });
      return;
    }

    // Add 3D representation in the physical cart model
    if (worldRef.current) {
      worldRef.current.addProductTo3DCart(product);
    }

    setCartItems((prev) => {
      const found = prev.find((item) => item.product.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    // 3. Success toast
    showToast({
      type: 'success',
      title: 'Ajouté au chariot !',
      message: `${quantity}x "${product.name}" déposé(s) dans le panier • ${(product.price * quantity).toFixed(2)} €`,
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Order completion from Checkout
  const handleOrderCompleted = (newOrder: Order) => {
    // 1. Deduct product stocks
    const stockResult = applyStockReduction(products, cartItems);
    if (stockResult.success) {
      setProducts(stockResult.updatedProducts);
      if (worldRef.current) {
        worldRef.current.updateProducts(stockResult.updatedProducts);
      }
    }

    // 2. Add to orders list
    setOrders((prev) => [newOrder, ...prev]);

    // 3. If delivery order, assign to an idle van
    if (newOrder.type === 'home_delivery') {
      sounds.playDispatchSound();
      setVans((prevVans) => {
        const idleVanIndex = prevVans.findIndex((v) => v.status === 'idle');
        if (idleVanIndex !== -1) {
          const updated = [...prevVans];
          updated[idleVanIndex] = {
            ...updated[idleVanIndex],
            status: 'delivering',
            activeOrderId: newOrder.id,
            targetCoords: newOrder.deliveryCoords || { x: 75, y: 75 },
            routeProgress: 0.1,
            speedKmH: 38,
          };
          return updated;
        }
        return prevVans;
      });

      showToast({
        type: 'success',
        title: 'Commande validée avec livraison GPS !',
        message: `Réf. ${newOrder.id} (${newOrder.total.toFixed(2)} €) transmise aux chauffeurs. Suivi en temps réel activé.`,
        duration: 5000,
      });
    } else {
      showToast({
        type: 'success',
        title: 'Règlement en caisse effectué !',
        message: `Commande ${newOrder.id} validée (${newOrder.total.toFixed(2)} €). Vos achats sont prêts !`,
        duration: 5000,
      });
    }

    // 4. Reset shopping cart
    setCartItems([]);
  };

  // Admin handlers
  const handleUpdateProductStock = (productId: string, newStock: number) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
      );
      if (worldRef.current) {
        worldRef.current.updateProducts(updated);
      }
      return updated;
    });

    if (newStock === 0) {
      showToast({
        type: 'error',
        title: 'Rupture de stock !',
        message: `"${target?.name || 'Produit'}" est maintenant en rupture totale.`,
      });
    } else if (newStock <= 5) {
      showToast({
        type: 'warning',
        title: 'Alerte stock faible',
        message: `"${target?.name || 'Produit'}" n'a plus que ${newStock} unités disponibles.`,
      });
    } else {
      showToast({
        type: 'info',
        title: 'Stock mis à jour',
        message: `"${target?.name || 'Produit'}" : stock ajusté à ${newStock} unités.`,
      });
    }
  };

  const handleUpdateProductPrice = (productId: string, newPrice: number) => {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId ? { ...p, price: Math.max(0.1, newPrice) } : p
      );
      if (worldRef.current) {
        worldRef.current.updateProducts(updated);
      }
      return updated;
    });
  };

  const handleAddNewProduct = (newProd: Product) => {
    setProducts((prev) => {
      const updated = [...prev, newProd];
      if (worldRef.current) {
        worldRef.current.updateProducts(updated);
      }
      return updated;
    });

    showToast({
      type: 'success',
      title: 'Nouveau produit en rayon !',
      message: `"${newProd.name}" (${newProd.price.toFixed(2)} €) est désormais disponible en rayon 3D.`,
      duration: 4500,
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    // If marked delivered, free up assigned van
    if (status === 'delivered') {
      setVans((prev) =>
        prev.map((v) =>
          v.activeOrderId === orderId
            ? { ...v, status: 'idle', activeOrderId: undefined, routeProgress: 0, speedKmH: 0 }
            : v
        )
      );
    }
  };

  const handleUpdateVanLocation = (
    vanId: string,
    newCoords: { x: number; y: number },
    progress: number
  ) => {
    setVans((prev) =>
      prev.map((v) =>
        v.id === vanId ? { ...v, currentCoords: newCoords, routeProgress: progress } : v
      )
    );
  };

  // Shelves and Aisle Section handlers for Admin
  const handleAddAisleSection = (newAisle: AisleInfo) => {
    setAisles((prev) => {
      const updated = [...prev, newAisle];
      if (worldRef.current) {
        worldRef.current.updateAisleSections(updated, products);
      }
      return updated;
    });
    showToast({
      type: 'success',
      title: 'Nouveau rayon implanté !',
      message: `${newAisle.icon} "${newAisle.name}" (${newAisle.tiersCount || 3} étages, ${(newAisle.width || 6.0).toFixed(1)}m) ajouté au supermarché.`,
      duration: 5000,
    });
  };

  const handleAugmentAisleSection = (aisleId: string, newTiers: number) => {
    const target = aisles.find((a) => a.id === aisleId);
    setAisles((prev) => {
      const updated = prev.map((a) =>
        a.id === aisleId ? { ...a, tiersCount: newTiers } : a
      );
      if (worldRef.current) {
        worldRef.current.updateAisleSections(updated, products);
      }
      return updated;
    });
    showToast({
      type: 'info',
      title: 'Étagères augmentées',
      message: `${target?.name || 'Rayon'} : capacité portée à ${newTiers} niveaux d'étages.`,
    });
  };

  const handleExpandAisleWidth = (aisleId: string, newWidth: number) => {
    const target = aisles.find((a) => a.id === aisleId);
    setAisles((prev) => {
      const updated = prev.map((a) =>
        a.id === aisleId ? { ...a, width: newWidth } : a
      );
      if (worldRef.current) {
        worldRef.current.updateAisleSections(updated, products);
      }
      return updated;
    });
    showToast({
      type: 'info',
      title: 'Longueur de rayon ajustée',
      message: `${target?.name || 'Rayon'} : longueur ajustée à ${newWidth.toFixed(1)} mètres.`,
    });
  };

  // Direct client navigation towards desired product
  const handleNavigateToProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const success = worldRef.current?.navigateToProduct(productId);
    if (success) {
      showToast({
        type: 'info',
        title: 'Déplacement automatique',
        message: `Vous êtes devant : "${prod.name}" (${prod.price.toFixed(2)} €).`,
        duration: 3500,
      });
    }
  };

  const [currentAisleId, setCurrentAisleId] = useState<string>('aisle_bakery');

  // Camera teleports
  const handleTeleportAisle = (aisleId: string) => {
    setCurrentAisleId(aisleId);
    worldRef.current?.teleportToAisle(aisleId);
  };

  const handleTeleportCheckout = () => {
    setCurrentAisleId('');
    worldRef.current?.teleportToCheckout();
  };

  const handleViewModeChange = (mode: CameraViewMode) => {
    setViewMode(mode);
    worldRef.current?.setViewMode(mode);
  };

  const currentAisleProducts = currentAisleId
    ? products.filter((p) => p.shelfId === currentAisleId)
    : [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D Canvas Mount Container (Zero occlusion, ref container outside React re-render loops) */}
      <div
        ref={canvasMountRef}
        data-testid="supermarket-canvas"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Tooltip when hovering over a product */}
      {hoveredProduct && hoverScreenPos && !inspectedProduct && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverScreenPos.x}px`,
            top: `${hoverScreenPos.y - 70}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="pointer-events-auto z-30 bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 min-w-[210px] text-center"
        >
          <div className="text-xs font-bold truncate">{hoveredProduct.name}</div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-emerald-400 font-extrabold text-sm tabular-nums">
              {hoveredProduct.price.toFixed(2)} €
            </span>
            <span className="text-[10px] text-slate-400">({hoveredProduct.unit})</span>
          </div>
          <button
            onClick={() => setInspectedProduct(hoveredProduct)}
            aria-label={`Inspecter ${hoveredProduct.name}`}
            className="mt-2 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[11px] font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>Inspecter &amp; Ajouter</span>
          </button>
        </div>
      )}

      {/* Client 3D Navigation HUD */}
      {!isAdminMode && (
        <NavigationHUD
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onTeleportAisle={handleTeleportAisle}
          onTeleportCheckout={handleTeleportCheckout}
          cartCount={cartTotals.itemCount}
          cartTotal={cartTotals.total}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAdmin={() => setIsAdminMode(true)}
          activeAisle={currentAisleId ? currentAisleId.replace('aisle_', '') : undefined}
          activeProducts={currentAisleProducts}
          allProducts={products}
          aisles={aisles}
          onSelectProduct={(p) => setInspectedProduct(p)}
          onNavigateToProduct={handleNavigateToProduct}
          onVirtualMove={(dx, dy) => worldRef.current?.handleVirtualMove(dx, dy)}
          onVirtualTurn={(dyaw) => worldRef.current?.handleVirtualTurn(dyaw)}
        />
      )}

      {/* Product Inspector Modal */}
      <ProductInspectorModal
        product={inspectedProduct}
        onClose={() => setInspectedProduct(null)}
        onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Conveyor Belt & GPS Delivery Dispatch */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Admin Dashboard */}
      {isAdminMode && (
        <AdminDashboard
          products={products}
          orders={orders}
          vans={vans}
          aisles={aisles}
          onBackToStore={() => setIsAdminMode(false)}
          onUpdateProductStock={handleUpdateProductStock}
          onUpdateProductPrice={handleUpdateProductPrice}
          onAddNewProduct={handleAddNewProduct}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateVanLocation={handleUpdateVanLocation}
          onAddAisleSection={handleAddAisleSection}
          onAugmentAisleSection={handleAugmentAisleSection}
          onExpandAisleWidth={handleExpandAisleWidth}
        />
      )}

      {/* Toast Notifications System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
