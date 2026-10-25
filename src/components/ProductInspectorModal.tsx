import React, { useState } from 'react';
import { Product } from '../types/supermarket';
import { Check, Leaf, MapPin, Minus, Plus, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ProductInspectorModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductInspectorModal: React.FC<ProductInspectorModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const handleAdd = () => {
    sounds.playScannerBeep();
    onAddToCart(product, quantity);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 600);
  };

  const getNutriColor = (score: string) => {
    switch (score) {
      case 'A': return 'bg-emerald-600 text-white';
      case 'B': return 'bg-lime-600 text-white';
      case 'C': return 'bg-yellow-500 text-slate-900';
      case 'D': return 'bg-orange-500 text-white';
      case 'E': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-none">
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Close */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full">
              Rayon {product.category.replace('_', ' ')}
            </span>
            {product.isBio && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-600/40 px-2.5 py-1 rounded-full">
                <Leaf className="w-3 h-3 text-emerald-400" />
                Certifié BIO
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la fiche produit"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Visual & Details */}
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{product.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Origine : <strong className="text-slate-200 font-medium">{product.origin}</strong></span>
                <span>•</span>
                <span>{product.unit}</span>
              </div>
            </div>

            {/* Price badge */}
            <div className="text-right">
              <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                {product.price.toFixed(2)} €
              </div>
              {product.originalPrice && (
                <div className="text-xs text-slate-500 line-through tabular-nums">
                  {product.originalPrice.toFixed(2)} €
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            {product.description}
          </p>

          {/* Quality Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Nutri-Score
              </span>
              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black ${getNutriColor(product.nutriScore)}`}>
                {product.nutriScore}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Éco-Score
              </span>
              <span className="inline-block px-3 py-1 rounded-lg text-sm font-black bg-teal-600 text-white">
                {product.ecoScore}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Stock Rayon
              </span>
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                product.stock > 10 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                product.stock > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {product.stock > 0 ? `${product.stock} dispo` : 'Rupture'}
              </span>
            </div>
          </div>

          {/* Quantity Selector and Add to Cart */}
          <div className="pt-2 flex items-center gap-4">
            <div className="flex items-center bg-slate-800 rounded-2xl border border-slate-700 p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuer la quantité"
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl hover:bg-slate-700 text-slate-200 flex items-center justify-center disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-base text-white tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                aria-label="Augmenter la quantité"
                disabled={quantity >= product.stock}
                className="w-10 h-10 rounded-xl hover:bg-slate-700 text-slate-200 flex items-center justify-center disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                if (product.stock <= 0) {
                  onAddToCart(product, 0);
                  return;
                }
                handleAdd();
              }}
              className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 ${
                addedSuccess
                  ? 'bg-emerald-500 text-white'
                  : product.stock > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-300'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Ajouté au chariot !</span>
                </>
              ) : product.stock > 0 ? (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>
                    Ajouter au Chariot • {(product.price * quantity).toFixed(2)} €
                  </span>
                </>
              ) : (
                <>
                  <span>⚠️ Article en Rupture de Stock</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
