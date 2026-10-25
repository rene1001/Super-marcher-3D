import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Clock,
  Compass,
  Edit2,
  Layers,
  MapPin,
  Maximize2,
  Package,
  PackagePlus,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { AisleInfo, DeliveryVan, Order, OrderStatus, Product, ProductCategory } from '../types/supermarket';
import { AISLES } from '../data/supermarketData';
import { calculateSalesAnalytics, filterProducts } from '../utils/supermarketLogic';
import { sounds } from '../utils/audio';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  vans: DeliveryVan[];
  aisles?: AisleInfo[];
  onBackToStore: () => void;
  onUpdateProductStock: (productId: string, newStock: number) => void;
  onUpdateProductPrice: (productId: string, newPrice: number) => void;
  onAddNewProduct: (product: Product) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateVanLocation: (vanId: string, newCoords: { x: number; y: number }, progress: number) => void;
  onAddAisleSection?: (newAisle: AisleInfo) => void;
  onAugmentAisleSection?: (aisleId: string, newTiers: number) => void;
  onExpandAisleWidth?: (aisleId: string, newWidth: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  vans,
  aisles = AISLES,
  onBackToStore,
  onUpdateProductStock,
  onUpdateProductPrice,
  onAddNewProduct,
  onUpdateOrderStatus,
  onUpdateVanLocation,
  onAddAisleSection,
  onAugmentAisleSection,
  onExpandAisleWidth,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'stock' | 'shelves' | 'deliveries' | 'orders'>('analytics');
  const [selectedVanId, setSelectedVanId] = useState<string>(vans[0]?.id || '');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddAisleModal, setShowAddAisleModal] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(true);

  // New section form state
  const [newAisleName, setNewAisleName] = useState(`Rayon ${aisles.length + 1} : Produits Terroir & Bio`);
  const [newAisleDesc, setNewAisleDesc] = useState('Sélection d’articles de producteurs et saveurs locales');
  const [newAisleCat, setNewAisleCat] = useState<ProductCategory>('grocery');
  const [newAisleIcon, setNewAisleIcon] = useState('🌿');
  const [newAisleColor, setNewAisleColor] = useState('#059669');
  const [newAisleTiers, setNewAisleTiers] = useState(3);
  const [newAisleWidth, setNewAisleWidth] = useState(6.0);

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('bakery');
  const [newProdPrice, setNewProdPrice] = useState(2.5);
  const [newProdStock, setNewProdStock] = useState(25);
  const [newProdUnit, setNewProdUnit] = useState('pièce');
  const [newProdOrigin, setNewProdOrigin] = useState('France');
  const [newProdNutri, setNewProdNutri] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [newProdDesc, setNewProdDesc] = useState('');

  const analytics = calculateSalesAnalytics(orders);
  const filteredStockProducts = filterProducts(products, stockSearchQuery, stockCategoryFilter);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;
  const activeDeliveriesCount = orders.filter((o) => o.status === 'transit' || o.status === 'prep').length;

  // Real-time GPS movement simulation tick
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      vans.forEach((van) => {
        if (van.status === 'delivering' && van.activeOrderId) {
          const newProgress = Math.min(1.0, van.routeProgress + 0.05);

          // Interpolate current coordinates from center (50, 50) towards target
          const nx = 50 + (van.targetCoords.x - 50) * newProgress;
          const ny = 50 + (van.targetCoords.y - 50) * newProgress;

          onUpdateVanLocation(van.id, { x: nx, y: ny }, newProgress);

          if (newProgress >= 1.0) {
            // Reached customer destination
            onUpdateOrderStatus(van.activeOrderId, 'delivered');
          }
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulatingGps, vans, onUpdateVanLocation, onUpdateOrderStatus]);

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const aisle = AISLES.find((a) => a.category === newProdCategory) || AISLES[0];

    const modelMap: Record<ProductCategory, Product['modelType']> = {
      bakery: 'baguette',
      fruits_veg: 'apple_crate',
      dairy: 'cheese_wheel',
      meat_fish: 'steak_tray',
      grocery: 'pasta_box',
      frozen: 'frozen_pizza',
    };

    const newProduct: Product = {
      id: `prod_custom_${Date.now()}`,
      name: newProdName.trim(),
      category: newProdCategory,
      price: Number(Number(newProdPrice).toFixed(2)),
      stock: Number(newProdStock),
      unit: newProdUnit.trim() || 'pièce',
      description: newProdDesc.trim() || 'Produit de qualité supérieure fraîchement approvisionné.',
      origin: newProdOrigin.trim() || 'France',
      nutriScore: newProdNutri,
      ecoScore: 'A',
      modelType: modelMap[newProdCategory] || 'pasta_box',
      shelfId: aisle.id,
      shelfTier: Math.floor(Math.random() * 3),
      slotIndex: Math.floor(Math.random() * 3),
    };

    onAddNewProduct(newProduct);
    sounds.playPick();
    setShowAddProductModal(false);
    setNewProdName('');
    setNewProdDesc('');
  };

  const handleCreateAisleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAisleName.trim()) return;

    const count = aisles.length;
    const posX = (count % 2 === 0 ? 1 : -1) * (3.8 + Math.floor(count / 2) * 4.0);
    const posZ = -4.5 + (count % 3) * 3.5;

    const newAisle: AisleInfo = {
      id: `aisle_custom_${Date.now()}`,
      name: newAisleName.trim(),
      description: newAisleDesc.trim() || 'Rayon spécialisé',
      category: newAisleCat,
      icon: newAisleIcon || '🌿',
      color: newAisleColor || '#059669',
      position: [posX, 0, posZ],
      rotation: [0, 0, 0],
      tiersCount: Number(newAisleTiers) || 3,
      width: Number(newAisleWidth) || 6.0,
    };

    onAddAisleSection?.(newAisle);
    sounds.playPick();
    setShowAddAisleModal(false);
    setNewAisleName(`Rayon ${aisles.length + 2} : Saveurs Gourmandes`);
  };

  const selectedVan = vans.find((v) => v.id === selectedVanId) || vans[0];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStore}
            aria-label="Retourner dans le magasin 3D"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Magasin 3D</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Espace Administrateur &amp; Logistique
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Temps Réel
              </span>
            </h1>
            <p className="text-xs text-slate-400">Supervision des stocks, analytics et flotte de livraison GPS</p>
          </div>
        </div>

        {/* Global Key Stats Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
            <span className="text-slate-400">Chiffre d’Affaires :</span>
            <span className="font-bold text-emerald-400 tabular-nums">{analytics.totalRevenue.toFixed(2)} €</span>
          </div>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
            <span className="text-slate-400">Livraisons en cours :</span>
            <span className="font-bold text-indigo-400 tabular-nums">{activeDeliveriesCount}</span>
          </div>

          {lowStockCount > 0 && (
            <div className="bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-600/40 text-amber-300 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockCount} alertes stock</span>
            </div>
          )}
        </div>
      </header>

      {/* Tabs navigation */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-6 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tableaux de Bord Analytiques</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Gestion des Stocks &amp; Produits ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shelves')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'shelves'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rayons &amp; Étagères ({aisles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'deliveries'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Suivi GPS &amp; Livraisons en Direct</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Historique des Commandes ({orders.length})</span>
        </button>
      </nav>

      {/* Main Tab View Body */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* 1. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Chiffre d’Affaires</span>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">
                  {analytics.totalRevenue.toFixed(2)} €
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">+14.2% vs semaine passée</span>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Commandes Enregistrées</span>
                <div className="text-2xl font-black text-white tabular-nums">
                  {analytics.totalOrdersCount}
                </div>
                <span className="text-[11px] text-indigo-400 mt-1 block">100% traitées ou en cours</span>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Panier Moyen Client</span>
                <div className="text-2xl font-black text-white tabular-nums">
                  {analytics.averageBasket.toFixed(2)} €
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Tendance haussière</span>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Articles en Alerte Stock</span>
                <div className={`text-2xl font-black tabular-nums ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {lowStockCount}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Seuil critique : &lt; 5 unités</span>
              </div>
            </div>

            {/* Sales breakdown by food category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Répartition des Ventes par Rayon Alimentaire
                </h3>
                <div className="space-y-4">
                  {AISLES.map((aisle) => {
                    const sales = analytics.categorySales[aisle.category] || 0;
                    const maxSale = Math.max(...Object.values(analytics.categorySales), 1);
                    const percentage = Math.round((sales / maxSale) * 100);

                    return (
                      <div key={aisle.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="flex items-center gap-1.5 text-slate-200">
                            <span>{aisle.icon}</span>
                            <span>{aisle.name.split(':')[1]?.trim() || aisle.name}</span>
                          </span>
                          <span className="text-emerald-400 font-bold tabular-nums">
                            {sales.toFixed(2)} €
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%`, backgroundColor: aisle.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  Top 5 des Produits les Plus Achetés
                </h3>
                {analytics.topProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Aucune vente enregistrée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topProducts.map((p, idx) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-white">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 block tabular-nums">
                            {p.units} unités
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {p.revenue.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. STOCK & PRODUCTS TAB */}
        {activeTab === 'stock' && (
          <div className="space-y-5 max-w-7xl mx-auto">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search input */}
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-xs w-full max-w-xs">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, origine..."
                    className="bg-transparent w-full text-white outline-none"
                  />
                </div>

                {/* Category selector */}
                <select
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value as ProductCategory | 'all')}
                  className="bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 outline-none"
                >
                  <option value="all">Tous les rayons</option>
                  <option value="bakery">Boulangerie</option>
                  <option value="fruits_veg">Fruits &amp; Légumes</option>
                  <option value="dairy">Laiterie</option>
                  <option value="meat_fish">Boucherie &amp; Poisson</option>
                  <option value="grocery">Épicerie &amp; Boissons</option>
                  <option value="frozen">Surgelés</option>
                </select>
              </div>

              {/* Add product button */}
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Ajouter un Nouveau Produit</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">Produit</th>
                      <th className="py-3 px-4">Rayon</th>
                      <th className="py-3 px-4">Prix</th>
                      <th className="py-3 px-4">Stock Restant</th>
                      <th className="py-3 px-4">Nutri-Score</th>
                      <th className="py-3 px-4 text-right">Actions Réapprovisionnement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredStockProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.origin} • {p.unit}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-300">
                            {p.category.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-400 tabular-nums">
                            {p.price.toFixed(2)} €
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.stock > 10 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            p.stock > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {p.stock} unités
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-black px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                            {p.nutriScore}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => onUpdateProductStock(p.id, p.stock + 10)}
                            aria-label={`Ajouter 10 unités de ${p.name}`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-[11px] transition-colors"
                          >
                            +10 en rayon
                          </button>
                          <button
                            onClick={() => onUpdateProductStock(p.id, p.stock + 25)}
                            aria-label={`Ajouter 25 unités de ${p.name}`}
                            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            +25 en rayon
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2.5 SHELVES & AISLES MANAGEMENT TAB */}
        {activeTab === 'shelves' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Aménagement des Rayons &amp; Étagères 3D
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {aisles.length} sections actives
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Augmentez la capacité des étagères (+ étages ou + largeur) ou ajoutez de nouvelles sections au supermarché.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddAisleModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une Section de Rayon</span>
              </button>
            </div>

            {/* Shelf Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {aisles.map((aisle) => {
                const aisleProducts = products.filter((p) => p.shelfId === aisle.id);
                const currentTiers = aisle.tiersCount || 3;
                const currentWidth = aisle.width || 6.0;

                return (
                  <div
                    key={aisle.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-slate-800 rounded-xl border border-slate-700/60 leading-none">
                            {aisle.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight">
                              {aisle.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 capitalize">
                              Catégorie : {aisle.category.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 mt-1"
                          style={{ backgroundColor: aisle.color }}
                          title={`Couleur d'enseigne : ${aisle.color}`}
                        />
                      </div>

                      <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                        {aisle.description}
                      </p>

                      {/* Dimensions & Stats Badges */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-4 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Étages</span>
                          <span className="text-sm font-extrabold text-indigo-400 tabular-nums">
                            {currentTiers} niveaux
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Longueur</span>
                          <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                            {currentWidth.toFixed(1)} m
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Articles</span>
                          <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                            {aisleProducts.length}
                          </span>
                        </div>
                      </div>

                      {/* Visual Shelf Wireframe Representation */}
                      <div className="space-y-1 mb-4 p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 flex justify-between">
                          <span>Aperçu structurel ({currentTiers} étages) :</span>
                          <span className="text-slate-400 font-mono">{currentWidth.toFixed(1)}m</span>
                        </div>
                        {Array.from({ length: currentTiers }).map((_, tierIdx) => (
                          <div
                            key={tierIdx}
                            className="h-2 rounded bg-gradient-to-r from-amber-900/60 via-amber-700/50 to-amber-900/60 border border-amber-600/30 flex items-center justify-center text-[8px] text-amber-300 font-mono"
                          >
                            Étage {currentTiers - tierIdx}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shelf Augmentation / Modification Controls */}
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                        <span>Augmenter ou Réduire la Section :</span>
                      </div>

                      {/* Tiers controls */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-300">Hauteur d'étagères :</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onAugmentAisleSection?.(aisle.id, Math.max(1, currentTiers - 1))}
                            disabled={currentTiers <= 1}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
                            title="Diminuer d'un étage"
                          >
                            -1
                          </button>
                          <span className="text-xs font-bold text-white px-2 py-0.5 bg-slate-800 rounded-md tabular-nums min-w-[28px] text-center">
                            {currentTiers}
                          </span>
                          <button
                            onClick={() => onAugmentAisleSection?.(aisle.id, currentTiers + 1)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
                            title="Augmenter d'un étage"
                          >
                            +1 Étage
                          </button>
                        </div>
                      </div>

                      {/* Width controls */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-300">Longueur du meuble :</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onExpandAisleWidth?.(aisle.id, Math.max(3.0, currentWidth - 1.5))}
                            disabled={currentWidth <= 3.0}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
                            title="Rétrécir de 1.5m"
                          >
                            -1.5m
                          </button>
                          <span className="text-xs font-bold text-white px-1.5 py-0.5 bg-slate-800 rounded-md tabular-nums min-w-[44px] text-center">
                            {currentWidth.toFixed(1)}m
                          </span>
                          <button
                            onClick={() => onExpandAisleWidth?.(aisle.id, currentWidth + 1.5)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
                            title="Élargir de 1.5m"
                          >
                            +1.5m
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. DELIVERIES & GPS REAL-TIME FLEET TRACKER TAB */}
        {activeTab === 'deliveries' && (
          <div className="space-y-5 max-w-7xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Radar GPS de la Flotte de Livraison</h3>
                  <p className="text-xs text-slate-400">Positionnement satellite temps réel et trajets optimisés</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSimulatingGps(!isSimulatingGps)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSimulatingGps
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSimulatingGps ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span>{isSimulatingGps ? 'Simulation GPS Active' : 'Simulation Pause'}</span>
                </button>
              </div>
            </div>

            {/* GPS Map & Fleet Inspector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Vector GPS Map */}
              <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-5 relative overflow-hidden flex flex-col">
                <div className="flex justify-between items-center text-xs mb-3 text-slate-400">
                  <span className="font-mono uppercase tracking-wider text-[11px] text-emerald-400">
                    CARTE SATELLITE URBAINE • SECTEUR PARIS NORD-EST
                  </span>
                  <span>Échelle 1:10 000</span>
                </div>

                {/* SVG City Map with Roads, Depot, and Real-Time Moving Delivery Vans */}
                <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* City Grid Road Network */}
                    <defs>
                      <pattern id="gridRoads" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="#0B132B" />
                    <rect width="100" height="100" fill="url(#gridRoads)" />

                    {/* Main Boulevard Arteries */}
                    <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2.5" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="#334155" strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="18" fill="none" stroke="#1E293B" strokeWidth="1.5" strokeDasharray="2,2" />

                    {/* Central Supermarket Depot */}
                    <g transform="translate(50, 50)">
                      <circle r="4.5" fill="#16A34A" />
                      <circle r="7" fill="none" stroke="#16A34A" strokeWidth="0.5" opacity="0.6" />
                      <text x="0" y="8.5" fill="#4ADE80" fontSize="3" fontWeight="bold" textAnchor="middle">
                        HYPERMARCHÉ
                      </text>
                    </g>

                    {/* Customer Destination Pins */}
                    {orders.map((o) => {
                      if (!o.deliveryCoords) return null;
                      const isDelivered = o.status === 'delivered';
                      return (
                        <g key={o.id} transform={`translate(${o.deliveryCoords.x}, ${o.deliveryCoords.y})`}>
                          <circle
                            r="2.8"
                            fill={isDelivered ? '#64748B' : '#EF4444'}
                            stroke="#FFFFFF"
                            strokeWidth="0.5"
                          />
                          <text x="0" y="5.5" fill="#FFFFFF" fontSize="2.4" textAnchor="middle">
                            {o.customerName.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Animated Delivery Vans on GPS Map */}
                    {vans.map((van) => {
                      const isSelected = van.id === selectedVanId;
                      return (
                        <g
                          key={van.id}
                          transform={`translate(${van.currentCoords.x}, ${van.currentCoords.y})`}
                          className="cursor-pointer"
                          onClick={() => setSelectedVanId(van.id)}
                        >
                          {/* Pulsing signal halo */}
                          <circle
                            r={isSelected ? 6 : 4.5}
                            fill="none"
                            stroke={van.status === 'delivering' ? '#38BDF8' : '#94A3B8'}
                            strokeWidth="0.8"
                            opacity="0.8"
                          />
                          {/* Van marker */}
                          <circle
                            r="3.2"
                            fill={isSelected ? '#38BDF8' : '#0284C7'}
                            stroke="#FFFFFF"
                            strokeWidth="0.7"
                          />
                          <text x="0" y="1" fill="#FFFFFF" fontSize="2.8" fontWeight="bold" textAnchor="middle">
                            🚚
                          </text>
                          <text x="0" y="-4.2" fill="#E2E8F0" fontSize="2.2" fontWeight="bold" textAnchor="middle">
                            {van.name.replace('Camionnette ', '#')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Live Vehicle Telemetry & Driver Details */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="font-bold text-white text-sm">Télémesure Camionnette</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedVan.status === 'delivering'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedVan.status === 'delivering' ? 'En livraison' : 'Au dépôt'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Véhicule &amp; Chauffeur :</span>
                    <strong className="text-white text-sm block">{selectedVan.name}</strong>
                    <span className="text-slate-300">{selectedVan.driver} • {selectedVan.vehiclePlate}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-slate-400 text-[10px] block">Vitesse GPS</span>
                      <strong className="text-white text-sm tabular-nums">{selectedVan.speedKmH} km/h</strong>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-slate-400 text-[10px] block">Batterie Électrique</span>
                      <strong className="text-emerald-400 text-sm tabular-nums">{selectedVan.batteryPercent} %</strong>
                    </div>
                  </div>

                  {selectedVan.activeOrderId && (
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Commande en cours :</span>
                        <span className="font-mono font-bold text-emerald-400">{selectedVan.activeOrderId}</span>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span>Progression trajet :</span>
                          <span className="font-bold text-white tabular-nums">
                            {Math.round(selectedVan.routeProgress * 100)} %
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full rounded-full transition-all"
                            style={{ width: `${selectedVan.routeProgress * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick driver action */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        sounds.playDispatchSound();
                        if (selectedVan.activeOrderId) {
                          onUpdateOrderStatus(selectedVan.activeOrderId, 'delivered');
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      Confirmer la livraison au client
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ORDERS HISTORY TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">Réf. Commande</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Articles</th>
                      <th className="py-3 px-4">Montant TTC</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Mettre à jour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{o.id}</td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{o.customerName}</div>
                          <div className="text-[11px] text-slate-400">{o.customerAddress}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            o.type === 'home_delivery'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {o.type === 'home_delivery' ? '🚚 Livraison GPS' : '🏬 Retrait caisse'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-300">
                            {o.items.reduce((acc, i) => acc + i.quantity, 0)} articles
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-white tabular-nums">
                          {o.total.toFixed(2)} €
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            o.status === 'delivered'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : o.status === 'transit'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {o.status === 'delivered' ? 'Livré' :
                             o.status === 'transit' ? 'En route' : 'En préparation'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5">
                          {o.status !== 'delivered' && (
                            <button
                              onClick={() => {
                                sounds.playCashRegister();
                                onUpdateOrderStatus(o.id, 'delivered');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-[11px]"
                            >
                              Marquer Livré
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add New Product into Supermarket (Directly updates 3D store!) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none">
          <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                Ajouter un Produit dans les Rayons 3D
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nom du produit :</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ex: Fromage de Brebis des Pyrénées"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Rayon d’affectation :</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                  >
                    <option value="bakery">Boulangerie &amp; Pâtisserie</option>
                    <option value="fruits_veg">Fruits &amp; Légumes</option>
                    <option value="dairy">Produits Frais &amp; Laiterie</option>
                    <option value="meat_fish">Boucherie &amp; Poissonnerie</option>
                    <option value="grocery">Épicerie &amp; Boissons</option>
                    <option value="frozen">Surgelés &amp; Glaces</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Prix unitaire (€) :</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Stock initial :</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(parseInt(e.target.value))}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Unité :</label>
                  <input
                    type="text"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    placeholder="pièce, 500g..."
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nutri-Score :</label>
                  <select
                    value={newProdNutri}
                    onChange={(e) => setNewProdNutri(e.target.value as 'A' | 'B' | 'C' | 'D' | 'E')}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none font-bold"
                  >
                    <option value="A">A (Vert)</option>
                    <option value="B">B (Vert clair)</option>
                    <option value="C">C (Jaune)</option>
                    <option value="D">D (Orange)</option>
                    <option value="E">E (Rouge)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description produit :</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Informations sur la provenance, ingrédients..."
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Ajouter au Magasin 3D
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajouter une Nouvelle Section de Rayon */}
      {showAddAisleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setShowAddAisleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Créer une Nouvelle Section de Rayon</span>
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Installez une nouvelle gondole de rayonnage dans l'espace supermarché 3D.
            </p>

            <form onSubmit={handleCreateAisleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-400 mb-1">Nom du rayon :</label>
                <input
                  type="text"
                  required
                  value={newAisleName}
                  onChange={(e) => setNewAisleName(e.target.value)}
                  placeholder="Ex: Rayon 7 : Produits Terroir &amp; Vins"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description &amp; Enseigne :</label>
                <input
                  type="text"
                  value={newAisleDesc}
                  onChange={(e) => setNewAisleDesc(e.target.value)}
                  placeholder="Ex: Spécialités régionales et vins fins de récoltants"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Catégorie associée :</label>
                  <select
                    value={newAisleCat}
                    onChange={(e) => setNewAisleCat(e.target.value as ProductCategory)}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                  >
                    <option value="grocery">Épicerie &amp; Boissons</option>
                    <option value="bakery">Boulangerie &amp; Pâtisserie</option>
                    <option value="fruits_veg">Fruits &amp; Légumes</option>
                    <option value="dairy">Produits Frais &amp; Laiterie</option>
                    <option value="meat_fish">Boucherie &amp; Poissonnerie</option>
                    <option value="frozen">Surgelés &amp; Glaces</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Icône :</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newAisleIcon}
                      onChange={(e) => setNewAisleIcon(e.target.value)}
                      className="w-full bg-slate-800 text-white text-center text-lg px-2 py-1.5 rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Couleur :</label>
                    <input
                      type="color"
                      value={newAisleColor}
                      onChange={(e) => setNewAisleColor(e.target.value)}
                      className="w-full h-9 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer p-0.5"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre d'étages (hauteur) :</label>
                  <select
                    value={newAisleTiers}
                    onChange={(e) => setNewAisleTiers(parseInt(e.target.value))}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none font-bold"
                  >
                    <option value={2}>2 niveaux (Bas)</option>
                    <option value={3}>3 niveaux (Standard)</option>
                    <option value={4}>4 niveaux (Grand)</option>
                    <option value={5}>5 niveaux (Maxi-gondole)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Longueur du meuble :</label>
                  <select
                    value={newAisleWidth}
                    onChange={(e) => setNewAisleWidth(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none font-bold"
                  >
                    <option value={4.5}>4.5 mètres (Compact)</option>
                    <option value={6.0}>6.0 mètres (Standard)</option>
                    <option value={7.5}>7.5 mètres (Élargi)</option>
                    <option value={9.0}>9.0 mètres (Double section)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAisleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Créer et Implanter le Rayon 3D
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
