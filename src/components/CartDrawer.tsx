import React from 'react';
import { CartItem } from '../types/supermarket';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { calculateCartTotals } from '../utils/supermarketLogic';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const totals = calculateCartTotals(items);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 text-slate-100 h-full flex flex-col shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold">
              🛒
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mon Chariot Virtuel</h2>
              <p className="text-xs text-slate-400">{totals.itemCount} articles sélectionnés</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le chariot"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-800/60">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
                🛒
              </div>
              <h3 className="font-semibold text-white">Votre chariot est vide</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Explorez les rayons 3D du supermarché et cliquez sur les produits pour les déposer dans votre panier.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Continuer mes courses en 3D
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{item.product.name}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="text-emerald-400 font-bold">{item.product.price.toFixed(2)} €</span>
                    <span>• {item.product.unit}</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        onUpdateQuantity(item.product.id, item.quantity - 1);
                      } else {
                        onRemoveItem(item.product.id);
                      }
                    }}
                    aria-label={`Diminuer la quantité de ${item.product.name}`}
                    className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-white tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    aria-label={`Augmenter la quantité de ${item.product.name}`}
                    className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[60px]">
                  <span className="text-sm font-bold text-white tabular-nums">
                    {(item.product.price * item.quantity).toFixed(2)} €
                  </span>
                </div>

                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  aria-label={`Supprimer ${item.product.name}`}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Totals and Checkout CTA */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-800 bg-slate-900/90 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Sous-total articles :</span>
                <span className="font-medium text-white tabular-nums">{totals.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>TVA (5.5% alimentation) :</span>
                <span className="font-medium text-white tabular-nums">{totals.tax.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Total TTC :</span>
                <span className="text-emerald-400 tabular-nums">{totals.total.toFixed(2)} €</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Passer en Caisse / Livraison</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
