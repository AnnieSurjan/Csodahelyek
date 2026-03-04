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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  className: 'hue-rotate-[140deg]' // Emerald-ish
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
}

interface UserProfile {
  email: string;
  is_pro: boolean;
}

// --- Components ---

const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const Navbar = ({ user, onSubscribe, onInstall, showInstallBtn }: { 
  user: UserProfile | null, 
  onSubscribe: () => void,
  onInstall: () => void,
  showInstallBtn: boolean
}) => (
  <nav className="fixed top-0 left-0 right-0 h-20 glass z-[1000] flex items-center justify-between px-8">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/20">
        <Compass size={22} />
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight leading-none">Csodahelyek</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mt-1">Magyarország kincsei</p>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      {showInstallBtn && (
        <button 
          onClick={onInstall}
          className="hidden md:block text-xs uppercase tracking-widest font-bold hover:text-accent transition-colors"
        >
          App Telepítése
        </button>
      )}
      {!user?.is_pro && (
        <button 
          onClick={onSubscribe}
          className="bg-accent text-white px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
        >
          Pro tagság
        </button>
      )}
      <div className="w-10 h-10 rounded-full bg-paper border border-zinc-200 flex items-center justify-center text-zinc-600 shadow-sm">
        <User size={20} />
      </div>
    </div>
  </nav>
);

const Sidebar = ({
  places,
  selectedPlace,
  onSelectPlace,
  searchQuery,
  onSearchChange,
  isLoading,
  error
}: {
  places: Place[],
  selectedPlace: Place | null,
  onSelectPlace: (p: Place) => void,
  searchQuery: string,
  onSearchChange: (q: string) => void,
  isLoading: boolean,
  error: string | null
}) => (
  <div className="w-[420px] h-full bg-paper border-r border-zinc-100 flex flex-col pt-20 z-[900] shadow-2xl">
    <div className="p-8 pb-4">
      <h2 className="font-serif text-4xl mb-2 italic">Felfedezés</h2>
      <p className="text-zinc-500 text-sm mb-6">Válogatott helyszínek a természet kedvelőinek.</p>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Helyszín keresése..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
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
        places.map((place, idx) => (
          <motion.div
            key={place.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectPlace(place)}
            className={`group relative overflow-hidden rounded-[32px] cursor-pointer transition-all duration-500 ${selectedPlace?.id === place.id ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper scale-[1.02]' : 'hover:scale-[1.01]'}`}
          >
            <div className="aspect-[4/3] overflow-hidden">
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

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-accent bg-white/90 px-2 py-1 rounded-sm mb-2 inline-block">
                {place.category}
              </span>
              <h3 className="font-serif text-2xl leading-tight group-hover:translate-x-1 transition-transform">{place.title}</h3>
            </div>
          </motion.div>
        ))
      )}
    </div>
  </div>
);

const SubscriptionModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Star size={32} fill="currentColor" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Csodahelyek Pro</h2>
          <p className="text-zinc-500 mb-8">Férj hozzá az összes rejtett kincshez, mentsd el kedvenceidet és tervezz útvonalakat korlátok nélkül.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-left p-3 bg-zinc-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                <Navigation size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Korlátlan útvonaltervezés</p>
                <p className="text-xs text-zinc-500">Tervezz komplex túrákat egy kattintással.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left p-3 bg-zinc-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm">
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([47.4979, 19.0402]);
  const [mapZoom, setMapZoom] = useState(9);

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

  useEffect(() => {
    fetchPlaces();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [fetchPlaces]);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  useEffect(() => {
    if (selectedPlace) {
      setMapCenter([selectedPlace.lat, selectedPlace.lng]);
      setMapZoom(13);
    }
  }, [selectedPlace]);

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return places;
    const q = searchQuery.toLowerCase();
    return places.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [places, searchQuery]);

  const handleSubscribe = useCallback(async (email: string) => {
    if (!email.trim()) return;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Feliratkozás sikertelen.');
      await res.json();
      setUser({ email, is_pro: true });
      setIsSubModalOpen(false);
    } catch {
      alert('Hiba történt a feliratkozás során. Kérjük, próbáld újra.');
    }
  }, []);

  return (
    <div className="flex h-screen bg-zinc-100 font-sans text-zinc-900 overflow-hidden">
      <Navbar 
        user={user} 
        onSubscribe={() => setIsSubModalOpen(true)} 
        onInstall={handleInstallClick}
        showInstallBtn={showInstallBtn}
      />
      
      <Sidebar
        places={filteredPlaces}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
        error={error}
      />

      <main className="flex-1 relative pt-20">
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
                  click: () => setSelectedPlace(place),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[180px]">
                    <p className="text-[9px] uppercase tracking-widest text-accent font-bold mb-1">{place.category}</p>
                    <h3 className="font-serif text-lg leading-tight text-zinc-900">{place.title}</h3>
                    <button 
                      onClick={() => setSelectedPlace(place)}
                      className="mt-3 text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-accent transition-colors"
                    >
                      Részletek
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Map Controls */}
        <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[1000]">
          <button 
            onClick={() => { setMapCenter([47.4979, 19.0402]); setMapZoom(9); }}
            className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-zinc-600 hover:text-accent transition-all hover:scale-110 active:scale-95 border border-zinc-100"
            title="Vissza a központba"
          >
            <Compass size={24} />
          </button>
        </div>

        {/* Place Detail Overlay */}
        <AnimatePresence>
          {selectedPlace && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="absolute top-10 right-10 bottom-10 w-[480px] bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-zinc-100 z-[1000]"
            >
              <div className="h-72 shrink-0 relative">
                <img
                  src={selectedPlace.image_url}
                  alt={selectedPlace.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = `https://picsum.photos/seed/${selectedPlace.id}/800/600`;
                    }
                  }}
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-6 left-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-accent px-3 py-1.5 rounded-full shadow-lg">
                    {selectedPlace.category}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 p-10 flex flex-col overflow-y-auto custom-scrollbar">
                <h2 className="font-serif text-5xl font-medium text-zinc-900 leading-[1.1] mb-6">{selectedPlace.title}</h2>
                <div className="w-12 h-1 bg-accent/20 mb-8" />
                <p className="text-zinc-500 leading-relaxed text-lg font-light mb-10">
                  {selectedPlace.description || 'Nincs leírás ehhez a helyszínhez.'}
                </p>
                
                <div className="mt-auto pt-8 flex gap-4">
                  <a 
                    href={selectedPlace.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-accent text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-3 hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
                  >
                    <Info size={18} />
                    Weboldal megnyitása
                  </a>
                  <button className="w-14 h-14 bg-paper text-accent rounded-full hover:bg-zinc-50 transition-all flex items-center justify-center border border-zinc-100 shadow-sm">
                    <Star size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
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
      `}</style>
    </div>
  );
}
