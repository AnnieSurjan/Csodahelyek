/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Search,
  Star,
  Navigation,
  User,
  Info,
  ChevronRight,
  Map as MapIcon,
  Compass,
  Loader2,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  X,
  Heart,
  Menu,
  ChevronLeft,
  LocateFixed,
  Route,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  className: 'hue-rotate-[140deg]'
});

// --- Types ---
interface Place {
  id: number;
  title: string;
  description: string;
  lat: number;
  lng: number;
  url: string;
  category: string;
  image_url: string;
  region: string;
}

interface UserProfile {
  email: string;
  name?: string;
  is_pro: boolean;
  verified: boolean;
}

type AuthView = 'login' | 'register' | 'verify';

const CATEGORIES = ['Mind', 'Természet', 'Történelem', 'Városnézés'] as const;
const REGIONS = ['Mind', 'Közép-Magyarország', 'Dunántúl', 'Észak-Magyarország', 'Alföld'] as const;

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Auth Screen ---
const AuthScreen = ({ onAuth }: { onAuth: (user: UserProfile) => void }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCode, setDemoCode] = useState('');

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDemoCode(data.demo_code || '');
      setView('verify');
    } catch { setError('Hálózati hiba.'); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.status === 403 && data.needs_verification) {
        setDemoCode(data.demo_code || '');
        setError('');
        setView('verify');
        return;
      }
      if (!res.ok) { setError(data.error); return; }
      onAuth(data.user);
    } catch { setError('Hálózati hiba.'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onAuth(data.user);
    } catch { setError('Hálózati hiba.'); }
    finally { setLoading(false); }
  };

  const handleResendCode = async () => {
    try {
      const res = await fetch('/api/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setDemoCode(data.demo_code || '');
        setError('');
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-emerald-50/60 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-3xl md:rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-zinc-100"
      >
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 p-8 md:p-10 text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Compass size={28} className="text-white" />
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-white tracking-tight">Csodahelyek</h1>
          <p className="text-emerald-200 text-[10px] md:text-xs uppercase tracking-[0.25em] mt-2 font-bold">Magyarország kincsei</p>
        </div>

        <div className="p-6 md:p-8">
          {view === 'login' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-1">Bejelentkezés</h2>
              <p className="text-zinc-500 text-sm mb-5">Üdvözöljük újra! Jelentkezzen be fiókjába.</p>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="password" placeholder="Jelszó" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <button onClick={handleLogin} disabled={loading}
                className="w-full mt-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                Bejelentkezés
              </button>

              <div className="mt-5 text-center">
                <p className="text-sm text-zinc-500">Még nincs fiókja?{' '}
                  <button onClick={() => { setView('register'); setError(''); }} className="text-emerald-700 font-semibold hover:underline">
                    Regisztráció
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button onClick={() => { setView('login'); setError(''); }} className="text-zinc-400 hover:text-zinc-600 mb-3 flex items-center gap-1 text-sm">
                <ArrowLeft size={16} /> Vissza
              </button>
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-1">Regisztráció</h2>
              <p className="text-zinc-500 text-sm mb-5">Hozza létre fiókját a felfedezéshez.</p>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="text" placeholder="Teljes név" value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="email" placeholder="E-mail cím" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="password" placeholder="Jelszó (min. 6 karakter)" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <button onClick={handleRegister} disabled={loading}
                className="w-full mt-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                Regisztráció
              </button>
            </motion.div>
          )}

          {view === 'verify' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-1">E-mail megerősítés</h2>
                <p className="text-zinc-500 text-sm">Írja be a(z) <strong>{email}</strong> címre küldött 6 jegyű kódot.</p>
              </div>

              {demoCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">Demo mód – A kód:</p>
                  <p className="text-2xl font-mono font-bold text-amber-800 tracking-[0.3em]">{demoCode}</p>
                </div>
              )}

              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input type="text" placeholder="6 jegyű kód" value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>

              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

              <button onClick={handleVerify} disabled={loading}
                className="w-full mt-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                Megerősítés
              </button>

              <button onClick={handleResendCode} className="w-full mt-3 py-2 text-zinc-400 text-sm hover:text-emerald-600 transition-colors">
                Új kód küldése
              </button>

              <button onClick={() => { setView('login'); setError(''); setDemoCode(''); }} className="w-full mt-1 py-2 text-zinc-400 text-sm hover:text-zinc-600 transition-colors flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Vissza a bejelentkezéshez
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const Navbar = ({ user, onSubscribe, onInstall, showInstallBtn, onLogout, onToggleSidebar, sidebarOpen }: {
  user: UserProfile | null,
  onSubscribe: () => void,
  onInstall: () => void,
  showInstallBtn: boolean,
  onLogout: () => void,
  onToggleSidebar: () => void,
  sidebarOpen: boolean
}) => (
  <nav className="fixed top-0 left-0 right-0 h-14 md:h-20 glass z-[1000] flex items-center justify-between px-3 md:px-8">
    <div className="flex items-center gap-2 md:gap-3">
      <button onClick={onToggleSidebar} className="md:hidden w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-accent">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className="w-8 h-8 md:w-10 md:h-10 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/20">
        <Compass size={18} className="md:hidden" />
        <Compass size={22} className="hidden md:block" />
      </div>
      <div>
        <h1 className="font-serif text-lg md:text-2xl font-semibold tracking-tight leading-none">Csodahelyek</h1>
        <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-accent font-bold mt-0.5">Magyarország kincsei</p>
      </div>
    </div>

    <div className="flex items-center gap-2 md:gap-6">
      {showInstallBtn && (
        <button
          onClick={onInstall}
          className="hidden lg:block text-xs uppercase tracking-widest font-bold hover:text-accent transition-colors"
        >
          App Telepítése
        </button>
      )}
      {!user?.is_pro && (
        <button
          onClick={onSubscribe}
          className="bg-accent text-white px-3 md:px-6 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs uppercase tracking-widest font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
        >
          Pro
        </button>
      )}
      {user && (
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-sm text-zinc-600 hidden lg:block">{user.name || user.email}</span>
          <button
            onClick={onLogout}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-paper border border-zinc-200 flex items-center justify-center text-zinc-600 shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            title="Kijelentkezés"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

const CategoryChips = ({ selected, onSelect }: { selected: string, onSelect: (c: string) => void }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
    {CATEGORIES.map(cat => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
          selected === cat
            ? 'bg-accent text-white shadow-md shadow-accent/20'
            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

const PlaceCard: React.FC<{
  place: Place,
  isSelected: boolean,
  isFavorite: boolean,
  onSelect: () => void,
  onToggleFavorite: (e: React.MouseEvent) => void,
  distance?: number | null,
}> = ({ place, isSelected, isFavorite, onSelect, onToggleFavorite, distance }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onSelect}
    className={`group relative overflow-hidden rounded-2xl md:rounded-[32px] cursor-pointer transition-all duration-500 ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-paper scale-[1.02]' : 'hover:scale-[1.01]'}`}
  >
    <div className="aspect-[16/10] md:aspect-[4/3] overflow-hidden">
      <img
        src={place.image_url}
        alt={place.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.dataset.fallback) {
            target.dataset.fallback = '1';
            target.src = `https://picsum.photos/seed/${place.id}/600/450`;
          }
        }}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
    </div>

    <button
      onClick={onToggleFavorite}
      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
        isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/40'
      }`}
    >
      <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>

    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold text-accent bg-white/90 px-2 py-0.5 md:py-1 rounded-sm inline-block">
          {place.category}
        </span>
        {distance != null && (
          <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold text-white/90 bg-black/30 backdrop-blur-sm px-2 py-0.5 md:py-1 rounded-sm inline-block">
            {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
          </span>
        )}
      </div>
      <h3 className="font-serif text-lg md:text-2xl leading-tight group-hover:translate-x-1 transition-transform">{place.title}</h3>
    </div>
  </motion.div>
);

const RegionSelector = ({ selected, onSelect }: { selected: string, onSelect: (r: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-zinc-100 rounded-2xl text-sm shadow-sm hover:border-accent/30 transition-all"
      >
        <span className="flex items-center gap-2">
          <MapPin size={14} className="text-accent" />
          <span className="text-zinc-700">{selected === 'Mind' ? 'Összes régió' : selected}</span>
        </span>
        <ChevronDown size={16} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-100 rounded-2xl shadow-xl z-10 overflow-hidden">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => { onSelect(r); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selected === r ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-zinc-50 text-zinc-700'}`}
            >
              {r === 'Mind' ? 'Összes régió' : r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({
  places,
  selectedPlace,
  onSelectPlace,
  searchQuery,
  onSearchChange,
  isLoading,
  error,
  isOpen,
  selectedCategory,
  onCategoryChange,
  selectedRegion,
  onRegionChange,
  favorites,
  onToggleFavorite,
  userLocation,
  onLocateMe,
  locating,
  sortByDistance,
  onToggleSortByDistance,
}: {
  places: Place[],
  selectedPlace: Place | null,
  onSelectPlace: (p: Place) => void,
  searchQuery: string,
  onSearchChange: (q: string) => void,
  isLoading: boolean,
  error: string | null,
  isOpen: boolean,
  selectedCategory: string,
  onCategoryChange: (c: string) => void,
  selectedRegion: string,
  onRegionChange: (r: string) => void,
  favorites: Set<number>,
  onToggleFavorite: (placeId: number) => void,
  userLocation: [number, number] | null,
  onLocateMe: () => void,
  locating: boolean,
  sortByDistance: boolean,
  onToggleSortByDistance: () => void,
}) => (
  <div className={`
    fixed md:relative inset-0 md:inset-auto top-14 md:top-0
    w-full md:w-[420px] h-[calc(100vh-3.5rem)] md:h-full
    bg-paper border-r border-zinc-100 flex flex-col md:pt-20 z-[900] shadow-2xl
    transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'}
  `}>
    <div className="p-4 md:p-8 pb-3 md:pb-4">
      <h2 className="font-serif text-2xl md:text-4xl mb-1 md:mb-2 italic">Felfedezés</h2>
      <p className="text-zinc-500 text-xs md:text-sm mb-3 md:mb-4">Válogatott helyszínek a természet kedvelőinek.</p>

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Helyszín keresése..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-white border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm"
        />
      </div>

      <RegionSelector selected={selectedRegion} onSelect={onRegionChange} />
      <CategoryChips selected={selectedCategory} onSelect={onCategoryChange} />

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onLocateMe}
          disabled={locating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            userLocation ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          }`}
        >
          {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
          Közelben
        </button>
        {userLocation && (
          <button
            onClick={onToggleSortByDistance}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              sortByDistance ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            <Navigation size={12} />
            Távolság
          </button>
        )}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 space-y-4 md:space-y-6 custom-scrollbar">
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={48} className="mx-auto mb-4 opacity-30 animate-spin" />
          <p className="font-serif italic text-lg text-zinc-400">Helyszínek betöltése...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <Info size={48} className="mx-auto mb-4 opacity-20 text-red-400" />
          <p className="font-serif italic text-lg text-red-400">{error}</p>
        </div>
      ) : places.length === 0 ? (
        <div className="py-20 text-center">
          <MapIcon size={48} className="mx-auto mb-4 opacity-10" />
          <p className="font-serif italic text-lg text-zinc-400">
            {searchQuery ? 'Nincs találat a keresésre.' : 'Nincsenek még helyszínek...'}
          </p>
        </div>
      ) : (
        places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            isSelected={selectedPlace?.id === place.id}
            isFavorite={favorites.has(place.id)}
            onSelect={() => onSelectPlace(place)}
            onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(place.id); }}
            distance={userLocation ? getDistanceKm(userLocation[0], userLocation[1], place.lat, place.lng) : null}
          />
        ))
      )}
    </div>
  </div>
);

const PlaceDetail = ({ place, onClose, isFavorite, onToggleFavorite, isPro, isInRoute, onToggleRoute, distance }: {
  place: Place,
  onClose: () => void,
  isFavorite: boolean,
  onToggleFavorite: () => void,
  isPro: boolean,
  isInRoute: boolean,
  onToggleRoute: () => void,
  distance?: number | null,
}) => (
  <motion.div
    initial={{ x: '100%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: '100%', opacity: 0 }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    className="fixed md:absolute inset-0 md:inset-auto md:top-4 md:right-4 md:bottom-4 md:w-[480px] bg-white md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col border-0 md:border md:border-zinc-100 z-[1100]"
  >
    <div className="h-56 md:h-72 shrink-0 relative">
      <img
        src={place.image_url}
        alt={place.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.dataset.fallback) {
            target.dataset.fallback = '1';
            target.src = `https://picsum.photos/seed/${place.id}/800/600`;
          }
        }}
        referrerPolicy="no-referrer"
      />
      <button
        onClick={onClose}
        className="absolute top-4 left-4 md:top-6 md:left-auto md:right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
      >
        <ChevronLeft size={24} className="md:hidden" />
        <ChevronRight size={24} className="hidden md:block" />
      </button>
      <button
        onClick={onToggleFavorite}
        className={`absolute top-4 right-4 md:top-6 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'
        }`}
      >
        <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <div className="absolute bottom-4 left-6 md:bottom-6 md:left-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-accent px-3 py-1.5 rounded-full shadow-lg">
          {place.category}
        </span>
      </div>
    </div>

    <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
      <h2 className="font-serif text-3xl md:text-5xl font-medium text-zinc-900 leading-[1.1] mb-4 md:mb-6">{place.title}</h2>
      <div className="w-12 h-1 bg-accent/20 mb-6 md:mb-8" />
      <p className="text-zinc-500 leading-relaxed text-base md:text-lg font-light mb-8 md:mb-10">
        {place.description || 'Nincs leírás ehhez a helyszínhez.'}
      </p>

      {distance != null && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
          <Navigation size={14} />
          <span>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} tőled</span>
        </div>
      )}

      <div className="mt-auto pt-6 md:pt-8 space-y-3">
        {isPro && (
          <button
            onClick={onToggleRoute}
            className={`w-full py-3.5 md:py-4 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-3 transition-all ${
              isInRoute
                ? 'bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100'
                : 'bg-blue-50 text-blue-600 border-2 border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isInRoute ? <><Trash2 size={18} /> Eltávolítás az útvonalból</> : <><Route size={18} /> Hozzáadás az útvonalhoz</>}
          </button>
        )}
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-accent text-white py-3.5 md:py-4 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-3 hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
        >
          <Info size={18} />
          Weboldal megnyitása
        </a>
      </div>
    </div>
  </motion.div>
);

const SubscriptionModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (email: string) => void }) => {
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Star size={28} fill="currentColor" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 mb-2">Csodahelyek Pro</h2>
          <p className="text-zinc-500 text-sm mb-6 md:mb-8">Férj hozzá az összes rejtett kincshez, mentsd el kedvenceidet és tervezz útvonalakat korlátok nélkül.</p>

          <div className="space-y-3 mb-6 md:mb-8">
            <div className="flex items-center gap-3 text-left p-3 bg-zinc-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <Navigation size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Korlátlan útvonaltervezés</p>
                <p className="text-xs text-zinc-500">Tervezz komplex túrákat egy kattintással.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left p-3 bg-zinc-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Exkluzív helyszínek</p>
                <p className="text-xs text-zinc-500">Csak előfizetőknek elérhető titkos tippek.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="E-mail címed"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={() => onConfirm(email)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Előfizetés indítása - 1.990 Ft / hó
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
            >
              Mégse
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('csodahelyek_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Mind');
  const [selectedRegion, setSelectedRegion] = useState('Mind');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);

  const [mapCenter, setMapCenter] = useState<[number, number]>([47.1625, 19.5033]);
  const [mapZoom, setMapZoom] = useState(7);

  const handleAuth = useCallback((userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('csodahelyek_user', JSON.stringify(userData));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('csodahelyek_user');
  }, []);

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const fetchPlaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/places');
      if (!res.ok) throw new Error(`Szerverhiba: ${res.status}`);
      const data = await res.json();
      setPlaces(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nem sikerült betölteni a helyszíneket.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/favorites/${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const ids: number[] = await res.json();
        setFavorites(new Set(ids));
      }
    } catch { /* ignore */ }
  }, [user?.email]);

  useEffect(() => {
    fetchPlaces();
    fetchFavorites();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [fetchPlaces, fetchFavorites]);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleToggleFavorite = useCallback(async (placeId: number) => {
    if (!user?.email) return;
    const isFav = favorites.has(placeId);
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(placeId);
      else next.add(placeId);
      return next;
    });

    try {
      await fetch('/api/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, place_id: placeId })
      });
    } catch {
      // Revert on failure
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) next.add(placeId);
        else next.delete(placeId);
        return next;
      });
    }
  }, [user?.email, favorites]);

  const handleLocateMe = useCallback(() => {
    if (userLocation) {
      setUserLocation(null);
      setSortByDistance(false);
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setSortByDistance(true);
        setMapCenter(loc);
        setMapZoom(10);
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [userLocation]);

  const handleToggleRoute = useCallback((place: Place) => {
    setRoutePlaces(prev => {
      const exists = prev.find(p => p.id === place.id);
      if (exists) return prev.filter(p => p.id !== place.id);
      return [...prev, place];
    });
  }, []);

  const handleSelectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
    setSidebarOpen(false);
    setMapCenter([place.lat, place.lng]);
    setMapZoom(13);
  }, []);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (selectedRegion !== 'Mind') {
      result = result.filter(p => p.region === selectedRegion);
    }
    if (selectedCategory !== 'Mind') {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (sortByDistance && userLocation) {
      result = [...result].sort((a, b) =>
        getDistanceKm(userLocation[0], userLocation[1], a.lat, a.lng) -
        getDistanceKm(userLocation[0], userLocation[1], b.lat, b.lng)
      );
    }
    return result;
  }, [places, searchQuery, selectedCategory, selectedRegion, sortByDistance, userLocation]);

  const handleSubscribe = useCallback(async (subEmail: string) => {
    const emailToUse = subEmail.trim() || user?.email;
    if (!emailToUse) return;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse })
      });
      if (!res.ok) throw new Error('Feliratkozás sikertelen.');
      await res.json();
      const updated = { ...user!, is_pro: true };
      setUser(updated);
      localStorage.setItem('csodahelyek_user', JSON.stringify(updated));
      setIsSubModalOpen(false);
    } catch {
      alert('Hiba történt a feliratkozás során. Kérjük, próbáld újra.');
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-zinc-100 font-sans text-zinc-900 overflow-hidden">
      <Navbar
        user={user}
        onSubscribe={() => setIsSubModalOpen(true)}
        onInstall={handleInstallClick}
        showInstallBtn={showInstallBtn}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Desktop sidebar - always visible on md+ */}
      <div className="hidden md:block">
        <Sidebar
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          onSelectPlace={handleSelectPlace}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          error={error}
          isOpen={true}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          userLocation={userLocation}
          onLocateMe={handleLocateMe}
          locating={locating}
          sortByDistance={sortByDistance}
          onToggleSortByDistance={() => setSortByDistance(!sortByDistance)}
        />
      </div>

      {/* Mobile sidebar - toggle */}
      <div className="md:hidden">
        <Sidebar
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          onSelectPlace={handleSelectPlace}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          error={error}
          isOpen={sidebarOpen}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          userLocation={userLocation}
          onLocateMe={handleLocateMe}
          locating={locating}
          sortByDistance={sortByDistance}
          onToggleSortByDistance={() => setSortByDistance(!sortByDistance)}
        />
      </div>

      <main className="flex-1 relative pt-14 md:pt-20">
        <div className="absolute inset-0 z-0 grayscale-[0.2] sepia-[0.1] brightness-[1.05]">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {places.map(place => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={selectedPlace?.id === place.id ? selectedIcon : customIcon}
                eventHandlers={{
                  click: () => handleSelectPlace(place),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[160px]">
                    <p className="text-[9px] uppercase tracking-widest text-accent font-bold mb-1">{place.category}</p>
                    <h3 className="font-serif text-base md:text-lg leading-tight text-zinc-900">{place.title}</h3>
                    <button
                      onClick={() => handleSelectPlace(place)}
                      className="mt-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-accent transition-colors"
                    >
                      Részletek
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route polyline */}
            {routePlaces.length >= 2 && (
              <Polyline
                positions={routePlaces.map(p => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: '#059669', weight: 4, dashArray: '10 6', opacity: 0.8 }}
              />
            )}

            {/* User location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={new L.DivIcon({
                  className: '',
                  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5)"></div>',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                })}
              />
            )}
          </MapContainer>
        </div>

        {/* Route Panel (Pro only) */}
        {user?.is_pro && routePlaces.length > 0 && (
          <div className="absolute top-2 left-2 md:top-6 md:left-6 z-[1000] bg-white rounded-2xl shadow-xl border border-zinc-100 p-4 max-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Route size={16} className="text-accent" /> Útvonalterv</h3>
              <button onClick={() => setRoutePlaces([])} className="text-zinc-400 hover:text-red-500 transition-colors" title="Törlés">
                <Trash2 size={14} />
              </button>
            </div>
            <ol className="space-y-1.5">
              {routePlaces.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                  <span className="text-zinc-700 truncate">{p.title}</span>
                  <button onClick={() => handleToggleRoute(p)} className="ml-auto text-zinc-300 hover:text-red-500 shrink-0"><X size={12} /></button>
                </li>
              ))}
            </ol>
            {routePlaces.length >= 2 && (
              <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
                Összesen: {routePlaces.reduce((sum, p, i) => {
                  if (i === 0) return 0;
                  return sum + getDistanceKm(routePlaces[i - 1].lat, routePlaces[i - 1].lng, p.lat, p.lng);
                }, 0).toFixed(1)} km (légvonalban)
              </div>
            )}
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute bottom-6 right-4 md:bottom-10 md:right-10 flex flex-col gap-3 z-[1000]">
          <button
            onClick={() => { setMapCenter([47.4979, 19.0402]); setMapZoom(7); }}
            className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-zinc-600 hover:text-accent transition-all hover:scale-110 active:scale-95 border border-zinc-100"
            title="Vissza a központba"
          >
            <Compass size={22} />
          </button>
        </div>

        {/* Place Detail Overlay */}
        <AnimatePresence>
          {selectedPlace && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-[1050] cursor-pointer"
                onClick={() => setSelectedPlace(null)}
              />
              <PlaceDetail
                place={selectedPlace}
                onClose={() => setSelectedPlace(null)}
                isFavorite={favorites.has(selectedPlace.id)}
                onToggleFavorite={() => handleToggleFavorite(selectedPlace.id)}
                isPro={!!user?.is_pro}
                isInRoute={routePlaces.some(p => p.id === selectedPlace.id)}
                onToggleRoute={() => handleToggleRoute(selectedPlace)}
                distance={userLocation ? getDistanceKm(userLocation[0], userLocation[1], selectedPlace.lat, selectedPlace.lng) : null}
              />
            </>
          )}
        </AnimatePresence>
      </main>

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onConfirm={handleSubscribe}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
        .leaflet-container {
          background: #f4f4f5;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
