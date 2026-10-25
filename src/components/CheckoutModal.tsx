import React, { useState } from 'react';
import { CartItem, Order } from '../types/supermarket';
import { calculateCartTotals, createCustomerOrder } from '../utils/supermarketLogic';
import { sounds } from '../utils/audio';
import { Check, CreditCard, MapPin, Phone, Truck, User, X } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderCompleted,
}) => {
  const [deliveryType, setDeliveryType] = useState<'store_pickup' | 'home_delivery'>('home_delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('24 Rue de la Paix, 75002 Paris');
  const [customerPhone, setCustomerPhone] = useState('06 12 34 56 78');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'scan' | 'payment' | 'confirmed'>('scan');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const totals = calculateCartTotals(cartItems, { isDelivery: deliveryType === 'home_delivery' });

  const handleStartPayment = () => {
    sounds.playScannerBeep();
    setStep('payment');
  };

  const handleFinalizeOrder = () => {
    setIsProcessing(true);
    sounds.playCashRegister();

    setTimeout(() => {
      const newOrder = createCustomerOrder(
        cartItems,
        {
          name: customerName.trim() || 'Client Fidèle',
          address: deliveryType === 'home_delivery' ? customerAddress : 'Retrait en magasin',
          phone: customerPhone || '06 00 00 00 00',
          type: deliveryType,
        }
      );

      setCompletedOrder(newOrder);
      setIsProcessing(false);
      setStep('confirmed');
      onOrderCompleted(newOrder);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-none">
      <div className="relative w-full max-w-xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💳</span>
            <div>
              <h2 className="text-base font-bold text-white">Caisse &amp; Règlement</h2>
              <p className="text-xs text-slate-400">
                {step === 'scan' ? 'Vérification du tapis de caisse' :
                 step === 'payment' ? 'Mode de retrait &amp; Paiement' :
                 'Commande Confirmée !'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la caisse"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on step */}
        <div className="p-6">
          {step === 'scan' && (
            <div className="space-y-5">
              {/* Conveyor Belt Visualizer */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                  <span>TAPIS ROULANT AUTOMATIQUE</span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                    SCANNER ACTIF
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
                  {cartItems.map((item, idx) => (
                    <div
                      key={item.product.id}
                      className="flex-shrink-0 bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-center min-w-[110px]"
                    >
                      <div className="text-2xl mb-1">
                        {item.product.category === 'bakery' ? '🥖' :
                         item.product.category === 'fruits_veg' ? '🍏' :
                         item.product.category === 'dairy' ? '🧀' :
                         item.product.category === 'meat_fish' ? '🥩' :
                         item.product.category === 'grocery' ? '🥫' : '❄️'}
                      </div>
                      <p className="text-[11px] font-semibold text-white truncate max-w-[100px]">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold">
                        x{item.quantity} • {(item.product.price * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order summary table */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Articles ({totals.itemCount}) :</span>
                  <span className="font-semibold text-white">{totals.subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>TVA alimentaire (5.5%) :</span>
                  <span className="font-semibold text-white">{totals.tax.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                  <span>Total à payer :</span>
                  <span className="text-emerald-400 text-base">{totals.total.toFixed(2)} €</span>
                </div>
              </div>

              <button
                onClick={handleStartPayment}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 text-sm"
              >
                <span>Confirmer et Choisir le mode de réception</span>
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-5">
              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType('home_delivery')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                    deliveryType === 'home_delivery'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                    <Truck className="w-4 h-4" />
                    <span>Livraison à Domicile</span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    Suivi GPS en temps réel par camionnette
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold mt-1">
                    {totals.subtotal > 50 ? 'Frais offerts !' : '+3.50 € de livraison'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('store_pickup')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                    deliveryType === 'store_pickup'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                    <CreditCard className="w-4 h-4" />
                    <span>Règlement en Caisse</span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    Paiement direct sans contact ou espèces
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">
                    Gratuit immédiat
                  </span>
                </button>
              </div>

              {/* Delivery Details Form (if home delivery) */}
              {deliveryType === 'home_delivery' ? (
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
                  <h3 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    Coordonnées de livraison GPS
                  </h3>

                  <div>
                    <label className="block text-slate-400 mb-1">Votre Nom &amp; Prénom :</label>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex: Camille Dubois"
                        className="bg-transparent w-full text-white outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Adresse de livraison :</label>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Ex: 12 Rue de Rivoli, Paris"
                        className="bg-transparent w-full text-white outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Téléphone de contact :</label>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="06 XX XX XX XX"
                        className="bg-transparent w-full text-white outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs space-y-2 text-slate-300">
                  <p>
                    Veuillez présenter votre carte bancaire ou smartphone sur le terminal de caisse n°1.
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    ✓ Carte Bleue, Visa, Mastercard, Apple Pay acceptés
                  </p>
                </div>
              )}

              {/* Total Summary */}
              <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">Total TTC débité :</span>
                  <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
                    {totals.total.toFixed(2)} €
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleFinalizeOrder}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl transition-all disabled:opacity-50 text-xs flex items-center gap-2"
                >
                  {isProcessing ? 'Validation...' : 'Valider la commande'}
                </button>
              </div>
            </div>
          )}

          {step === 'confirmed' && completedOrder && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Merci pour votre commande !</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Référence : <strong className="text-emerald-400 font-mono text-sm">{completedOrder.id}</strong>
              </p>

              {completedOrder.type === 'home_delivery' ? (
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300 space-y-1.5 max-w-md mx-auto text-left">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Truck className="w-4 h-4" />
                    <span>Suivi GPS enclenché</span>
                  </div>
                  <p>
                    Votre commande est envoyée au centre de préparation et sera prise en charge par la flotte de camionnettes électriques.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Livraison prévue : ~{completedOrder.etaMinutes} minutes à l’adresse : {completedOrder.customerAddress}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300 max-w-md mx-auto">
                  Votre ticket de caisse a été édité avec succès. Vous pouvez retirer vos achats.
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Retourner dans le Supermarché 3D
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
