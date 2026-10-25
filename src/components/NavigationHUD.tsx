import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MapPin,
  Maximize2,
  Navigation,
  Package,
  Search,
  ShoppingCart,
  Sliders,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AISLES } from '../data/supermarketData';
import { CameraViewMode } from '../3d/SupermarketWorld';
import { AisleInfo, Product } from '../types/supermarket';
import { sounds } from '../utils/audio';

interface NavigationHUDProps {
  viewMode: CameraViewMode;
  onViewModeChange: (mode: CameraViewMode) => void;
  onTeleportAisle: (aisleId: string) => void;
  onTeleportCheckout: () => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  activeAisle?: string;
  activeProducts?: Product[];
  allProducts?: Product[];
  aisles?: AisleInfo[];
  onSelectProduct?: (product: Product) => void;
  onNavigateToProduct?: (productId: string) => void;
  onVirtualMove?: (dx: number, dy: number) => void;
  onVirtualTurn?: (deltaYaw: number) => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  viewMode,
  onViewModeChange,
  onTeleportAisle,
  onTeleportCheckout,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenAdmin,
  activeAisle,
  activeProducts = [],
  allProducts = [],
  aisles = AISLES,
  onSelectProduct,
  onNavigateToProduct,
  onVirtualMove,
  onVirtualTurn,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    sounds.setMuted(next);
    setIsMuted(next);
  };

  const matchingProducts = searchQuery.trim()
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.origin.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      {/* Top Header Bar (Zero occlusion of 3D center) */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Brand badge */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-none">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg shadow-md">
            🛒
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Supermarché 3D
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Direct Terroir
              </span>
            </h1>
            <p className="text-[11px] text-slate-300">Rayons alimentaires &amp; Chariot virtuel</p>
          </div>
        </div>

        {/* Client Product Finder & Direct Navigation ("se déplacer vers le produit désiré") */}
        <div className="pointer-events-auto relative hidden md:block w-72 lg:w-96">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Aller vers un produit (ex: Baguette, Saumon)..."
              className="w-full bg-slate-900/95 text-xs text-white pl-9.5 pr-8 py-2.5 rounded-2xl border border-slate-700/80 focus:outline-none focus:border-emerald-500 shadow-xl placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isSearchOpen && matchingProducts.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin z-50">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>🧭 Se déplacer directement vers :</span>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-slate-400 hover:text-white text-[10px]"
                >
                  Fermer
                </button>
              </div>
              {matchingProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onNavigateToProduct?.(p.id);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800 text-left transition-colors border-b border-slate-800/60 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📍</span>
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        Rayon {p.category.replace('_', ' ')} • {p.origin}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-white tabular-nums bg-slate-800 px-2 py-1 rounded-lg">
                    {p.price.toFixed(2)} €
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Cluster */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Mobile search toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Rechercher un produit"
            className="md:hidden w-10 h-10 rounded-2xl bg-slate-900/90 text-slate-200 border border-slate-700/60 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg"
          >
            <Search className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="w-10 h-10 rounded-2xl bg-slate-900/90 text-slate-200 border border-slate-700/60 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Guide Controls */}
          <button
            onClick={() => setShowControlsGuide(!showControlsGuide)}
            aria-label="Aide commandes de navigation"
            className="w-10 h-10 rounded-2xl bg-slate-900/90 text-slate-200 border border-slate-700/60 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Shopping Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label={`Ouvrir le chariot (${cartCount} articles, ${cartTotal.toFixed(2)} €)`}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-950/40 transition-all border border-emerald-400/30 active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Mon Chariot</span>
            <span className="bg-white text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px] tabular-nums">
              {cartCount}
            </span>
            <span className="text-emerald-100 font-semibold text-xs tabular-nums hidden sm:inline">
              {cartTotal.toFixed(2)} €
            </span>
          </button>

          {/* Admin Switcher */}
          <button
            onClick={onOpenAdmin}
            aria-label="Ouvrir l'espace d'administration et suivi GPS"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-indigo-300 hover:text-white font-medium text-xs border border-indigo-500/40 shadow-xl transition-all"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Gestion &amp; GPS</span>
          </button>
        </div>
      </header>

      {/* Controls Help Overlay Modal */}
      {showControlsGuide && (
        <div className="absolute top-20 right-4 z-30 max-w-sm w-full bg-slate-900 text-slate-200 p-4 rounded-2xl shadow-2xl border border-slate-700 text-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 font-semibold text-white">
            <span>Navigation dans le supermarché</span>
            <button
              onClick={() => setShowControlsGuide(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between py-1 bg-slate-800/60 px-2.5 rounded-lg">
              <span className="font-mono text-emerald-400">Z / W / ↑</span>
              <span>Pousser le chariot en avant</span>
            </div>
            <div className="flex items-center justify-between py-1 bg-slate-800/60 px-2.5 rounded-lg">
              <span className="font-mono text-emerald-400">S / ↓</span>
              <span>Reculer</span>
            </div>
            <div className="flex items-center justify-between py-1 bg-slate-800/60 px-2.5 rounded-lg">
              <span className="font-mono text-emerald-400">Q / A / D / ← / →</span>
              <span>Déplacement latéral gauche/droite</span>
            </div>
            <div className="flex items-center justify-between py-1 bg-slate-800/60 px-2.5 rounded-lg">
              <span className="font-mono text-indigo-400">Clic &amp; Glisser souris</span>
              <span>Orienter la vue / pivoter</span>
            </div>
            <div className="flex items-center justify-between py-1 bg-slate-800/60 px-2.5 rounded-lg">
              <span className="font-mono text-amber-400">Clic sur un article</span>
              <span>Inspecter le produit &amp; Ajouter</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch Navigation Pad (Visible on mobile or small devices) */}
      <div className="sm:hidden absolute bottom-28 left-4 z-20 flex flex-col items-center gap-1 bg-slate-900/80 p-2 rounded-2xl border border-slate-700 pointer-events-auto">
        <button
          onClick={() => onVirtualMove?.(0, 1)}
          className="w-10 h-10 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center text-sm"
        >
          ▲
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onVirtualTurn?.(0.3)}
            className="w-10 h-10 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center text-sm"
          >
            ◀
          </button>
          <button
            onClick={() => onVirtualMove?.(0, -1)}
            className="w-10 h-10 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center text-sm"
          >
            ▼
          </button>
          <button
            onClick={() => onVirtualTurn?.(-0.3)}
            className="w-10 h-10 rounded-xl bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center text-sm"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Unified Bottom Control Dock (Strictly following Three.js guidelines: max 15% footprint, collapsible, no side clutter) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl pointer-events-auto transition-transform duration-300">
        {/* Active Aisle Quick Products Bar */}
        {activeProducts.length > 0 && !isDockCollapsed && (
          <div className="flex items-center justify-center gap-2 mb-2 overflow-x-auto py-1 scrollbar-thin">
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
              {activeAisle ? `Rayon ${activeAisle} :` : 'Articles disponibles :'}
            </span>
            {activeProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProduct?.(p)}
                aria-label={`Inspecter ${p.name}`}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 hover:bg-emerald-950 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/80 hover:border-emerald-600 shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                <span>{p.name.split(' ')[0]}</span>
                <span className="text-emerald-400 font-bold tabular-nums">{p.price.toFixed(2)} €</span>
              </button>
            ))}
          </div>
        )}

        {/* Toggle Collapse Pill */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-[11px] font-medium rounded-t-xl border-t border-x border-slate-700 shadow-md transition-colors"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Afficher la barre des rayons</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Masquer les contrôles</span>
              </>
            )}
          </button>
        </div>

        {!isDockCollapsed && (
          <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* View Mode Switches */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => onViewModeChange('cart')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'cart'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Mode Chariot</span>
              </button>
              <button
                onClick={() => onViewModeChange('free')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'free'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Vue 3D</span>
              </button>
              <button
                onClick={() => onViewModeChange('topdown')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'topdown'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Plan Magasin</span>
              </button>
            </div>

            {/* Aisle Teleportation Quick-Jumps */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-thin">
              <span className="text-[11px] uppercase font-bold text-slate-400 whitespace-nowrap hidden lg:inline mr-1">
                Accès direct :
              </span>
              {aisles.map((aisle) => (
                <button
                  key={aisle.id}
                  onClick={() => onTeleportAisle(aisle.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap transition-colors"
                >
                  <span>{aisle.icon}</span>
                  <span className="text-[11px]">{aisle.name.split(':')[1]?.trim() || aisle.name}</span>
                </button>
              ))}
              <button
                onClick={onTeleportCheckout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/50 text-xs font-medium text-white whitespace-nowrap transition-colors"
              >
                <span>💳</span>
                <span className="text-[11px]">Caisses</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
