import React, { useState, useEffect, useRef } from 'react';
import { GameState, Upgrade, HistoricalEvent, Screen } from './types';
import { INITIAL_STATE, UPGRADES, EVENTS } from './constants';
import SteamEngineSim from './components/SteamEngineSim';
import { askHistorian } from './services/geminiService';
import { Hammer, Factory, ArrowUpCircle, BookOpen, MessageCircle, CloudFog, Clock, Loader2, Info, Waves, Users, AlertTriangle, PenTool, Flame, Trophy, ShieldCheck, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES);
  const [events, setEvents] = useState<HistoricalEvent[]>(EVENTS);
  const [currentEvent, setCurrentEvent] = useState<HistoricalEvent | null>(EVENTS[0]); 
  const [currentTechInfo, setCurrentTechInfo] = useState<Upgrade | null>(null); // For tech modals
  const [screen, setScreen] = useState<Screen>('game');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [teacherMode, setTeacherMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Check tech state
  const hasFlyingShuttle = upgrades.find(u => u.id === 'flying-shuttle')?.purchased;
  const hasSpinningJenny = upgrades.find(u => u.id === 'spinning-jenny')?.purchased;
  const hasWaterFrame = upgrades.find(u => u.id === 'water-frame')?.purchased;
  const hasSteamEngine = upgrades.find(u => u.id === 'steam-engine')?.purchased;
  const isIndustrial = upgrades.find(u => u.id === 'factory-system')?.purchased;

  // Determine Context Text based on progress
  const getCurrentContextText = () => {
      if (isIndustrial) return "Het fabriekssysteem domineert. De steden zitten overvol door de urbanisatie. De lucht is vervuild door steenkoolrook, maar Engeland is nu de 'Werkplaats van de Wereld'.";
      if (hasSteamEngine) return "De stoommachine van Watt verandert alles. We zijn niet meer afhankelijk van wind of water. Fabrieken verhuizen naar de steden.";
      if (hasWaterFrame) return "Het Waterframe van Arkwright dwingt ons naar de rivieren. De huisnijverheid verdwijnt; arbeiders moeten nu naar de fabriek komen om te werken.";
      if (hasSpinningJenny) return "Door de Spinning Jenny is er garen in overvloed. De huisnijverheid werkt op volle toeren, maar de eerste tekenen van massaproductie zijn zichtbaar.";
      if (hasFlyingShuttle) return "De schietspoel zorgt voor een 'garenhonger'. De wevers gaan te snel voor de spinsters. Er is dringend behoefte aan een betere manier van spinnen.";
      return "Je bevindt je in de tijd van de huisnijverheid (Domestic System). Boerenfamilies werken thuis aan het spinnewiel en weefgetouw om wat bij te verdienen.";
  };

  // Game Loop
  useEffect(() => {
    const tickRate = 100; // ms
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.gameWon) return prev; // Stop processing if won

        let currentRate = prev.productionRate;
        
        // Handle Maintenance Timers for Waterframe/Steam
        let newYarnTimer = prev.yarnTimer;
        let newMaintenanceTimer = prev.maintenanceTimer;
        let newNeedsYarn = prev.needsYarn;
        let newNeedsMaintenance = prev.needsMaintenance;
        let newWageTimer = prev.wageTimer;
        let newMoney = prev.money;

        // Wage Logic (Every 60s)
        newWageTimer += tickRate;
        if (newWageTimer >= 60000) {
            newMoney -= (prev.workers * 1); // 1 dollar per worker
            newWageTimer = 0;
        }

        if (hasWaterFrame) {
            if (!newNeedsYarn) newYarnTimer += tickRate;
            if (!newNeedsMaintenance) newMaintenanceTimer += tickRate;

            // Thresholds differ based on steam engine
            const yarnThreshold = hasSteamEngine ? 25000 : 10000;
            const maintThreshold = hasSteamEngine ? 40000 : 20000;

            if (newYarnTimer >= yarnThreshold) {
                newNeedsYarn = true;
            }
            if (newMaintenanceTimer >= maintThreshold) {
                newNeedsMaintenance = true;
            }
        }

        // If maintenance needed, stop production
        if (hasWaterFrame && (newNeedsYarn || newNeedsMaintenance)) {
            currentRate = 0;
        } 
        
        // Calculate production per tick
        const production = currentRate / (1000 / tickRate); 
        
        // Year progression: 1 year per 30 seconds
        const yearIncrement = 1 / 300;

        // Handle Weaving Cooldown
        let newIsWeaving = prev.isWeaving;
        let newWeaveProgress = prev.weaveProgress;
        let producedCloth = 0;

        if (prev.isWeaving) {
            // Determine required time: 2000ms if Shuttle, 4000ms base (Reverted values).
            const requiredTime = hasFlyingShuttle ? 2000 : 4000;
            newWeaveProgress += tickRate;

            if (newWeaveProgress >= requiredTime) {
                newIsWeaving = false;
                newWeaveProgress = 0;
                producedCloth = prev.clickPower;
            }
        }

        // Win Condition
        let won = prev.gameWon;
        if (newMoney >= 10000 && !won) {
            won = true;
        }

        return {
          ...prev,
          money: newMoney,
          cloth: prev.cloth + production + producedCloth,
          year: prev.year + yearIncrement,
          isWeaving: newIsWeaving,
          weaveProgress: newWeaveProgress,
          yarnTimer: newYarnTimer,
          maintenanceTimer: newMaintenanceTimer,
          needsYarn: newNeedsYarn,
          needsMaintenance: newNeedsMaintenance,
          wageTimer: newWageTimer,
          gameWon: won
        };
      });
    }, tickRate);

    return () => clearInterval(timer);
  }, [hasFlyingShuttle, hasSteamEngine, hasWaterFrame]);

  // Event Triggers
  useEffect(() => {
    upgrades.forEach(u => {
      if (u.purchased && u.triggerEvent) {
        const event = events.find(e => e.id === u.triggerEvent);
        if (event && !event.triggered) {
          triggerEvent(event);
        }
      }
    });
  }, [upgrades]);

  const triggerEvent = (event: HistoricalEvent) => {
    // Only show event if we aren't showing a tech info modal
    if (!currentTechInfo) {
        setCurrentEvent(event);
    }
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, triggered: true } : e));
  };

  const handleClick = () => {
    if (hasWaterFrame) return; // Automatic

    if (hasSpinningJenny) {
        setGameState(prev => ({
            ...prev,
            cloth: prev.cloth + prev.clickPower,
        }));
    } else {
        if (!gameState.isWeaving) {
            setGameState(prev => ({ ...prev, isWeaving: true, weaveProgress: 0 }));
        }
    }
  };

  const fixYarn = (e: React.MouseEvent) => {
      e.stopPropagation();
      setGameState(prev => ({ ...prev, needsYarn: false, yarnTimer: 0 }));
  };

  const fixMaintenance = (e: React.MouseEvent) => {
      e.stopPropagation();
      setGameState(prev => ({ ...prev, needsMaintenance: false, maintenanceTimer: 0 }));
  };

  const sellCloth = (amount: number) => {
    if (gameState.cloth >= amount) {
      setGameState(prev => ({
        ...prev,
        cloth: prev.cloth - amount,
        money: prev.money + amount // 1:1 ratio
      }));
    }
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const canAfford = teacherMode || gameState.money >= upgrade.cost;
    const isAvailable = teacherMode || gameState.year >= upgrade.yearRequirement;

    if (canAfford && isAvailable) {
      setGameState(prev => {
        const cost = teacherMode ? 0 : upgrade.cost;
        const newState = { ...prev, money: prev.money - cost };
        return { ...newState, ...upgrade.effect(newState) };
      });
      setUpgrades(prev => prev.map(u => u.id === upgrade.id ? { ...u, purchased: true } : u));
      
      setCurrentTechInfo(upgrade);
      setCurrentEvent(null);
    }
  };

  const activateSteamEngine = () => {
      setGameState(prev => ({ ...prev, steamEngineActive: true }));
  };

  const handlePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPasswordInput(val);
      if (val.toLowerCase() === 'proberen') {
          setTeacherMode(true);
      }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    const context = `Jaar: ${Math.floor(gameState.year)}. Stoommachine actief: ${gameState.steamEngineActive}. Huidige fase: ${getCurrentContextText()}. Werknemers: ${gameState.workers}`;
    const response = await askHistorian(userMsg, context);

    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    setChatLoading(false);
  };

  const weaveTotalTime = hasFlyingShuttle ? 2000 : 4000;
  const weavePercentage = Math.min(100, (gameState.weaveProgress / weaveTotalTime) * 100);

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${isIndustrial ? 'bg-stone-800 text-stone-100' : 'bg-amber-50 text-stone-900'}`}>
      
      {/* HEADER Stats */}
      <header className="fixed top-0 w-full bg-black/90 text-white p-3 z-40 flex justify-between items-center shadow-lg backdrop-blur-sm border-b border-stone-700">
        <div className="flex gap-4 md:gap-8 text-xs md:text-base font-mono items-center flex-wrap">
          <div className="flex flex-col md:flex-row md:items-center gap-1">
             <span className="text-stone-400 text-xs uppercase">Geld</span>
             <span className="text-yellow-400 font-bold text-lg">£ {Math.floor(gameState.money)}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1">
             <span className="text-stone-400 text-xs uppercase">Voorraad</span>
             <span className="text-blue-300 font-bold text-lg">{Math.floor(gameState.cloth)} <span className="text-xs font-normal">Stof</span></span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1">
             <span className="text-stone-400 text-xs uppercase">Datum</span>
             <span className="text-green-400 font-bold text-lg">{Math.floor(gameState.year)}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1">
             <span className="text-stone-400 text-xs uppercase">Werknemers</span>
             <span className="text-purple-400 font-bold text-lg flex items-center gap-1"><Users size={16} /> {gameState.workers}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
             {!teacherMode ? (
                 <div className="relative">
                     <Lock size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
                     <input 
                        type="password" 
                        placeholder="Wachtwoord" 
                        value={passwordInput}
                        onChange={handlePasswordInput}
                        className="pl-7 pr-2 py-1 bg-stone-800 border border-stone-600 rounded-full text-xs text-white placeholder-stone-500 focus:outline-none focus:border-blue-500 w-32 transition-all"
                     />
                 </div>
             ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-900/50 border border-green-500 rounded-full text-green-400 text-xs font-bold animate-pulse">
                    <ShieldCheck size={14} />
                    <span>Docent Modus</span>
                </div>
             )}
            <button onClick={() => setChatOpen(!chatOpen)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors">
                <MessageCircle size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-10 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Action Area */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className={`relative h-64 rounded-xl shadow-2xl overflow-hidden border-4 group ${isIndustrial ? 'border-stone-600' : 'border-amber-200'}`}>
            {/* Dynamic Background Image */}
            <img 
                src={isIndustrial 
                    ? "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop" // Factory
                    : "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Flh3.googleusercontent.com%2FBJ0TOkQ1COU_gnL9A7K4KSRF4u41hwdOdUTeOjuG54Zp-PP-VegdZCmr-Z00ifM0yxNgybiGp6FoZy8rDRFS93mnKg%3Ds1024&f=1&nofb=1&ipt=74425864a00462a6254dbbd694201a85e3aa73f945df793089dac5b1c30714f8" // HISTORICAL WEAVER IMAGE
                } 
                alt="Omgeving" 
                className={`w-full h-full object-cover transition-opacity duration-1000 transform group-hover:scale-105 duration-700 ${isIndustrial ? 'grayscale contrast-125' : 'sepia'}`}
            />
            {isIndustrial && <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>}
            
            <div className="absolute bottom-4 left-4 right-4 text-center">
              
              {/* MAINTENANCE OVERLAYS FOR WATERFRAME */}
              {hasWaterFrame && gameState.needsYarn ? (
                   <button 
                      onClick={fixYarn}
                      className="w-full font-bold py-4 px-6 rounded-lg shadow-xl bg-red-600 hover:bg-red-500 text-white animate-bounce flex items-center justify-center gap-2"
                   >
                       <AlertTriangle /> Garen Op! Aanvullen
                   </button>
              ) : hasWaterFrame && gameState.needsMaintenance ? (
                    <button 
                      onClick={fixMaintenance}
                      className="w-full font-bold py-4 px-6 rounded-lg shadow-xl bg-orange-600 hover:bg-orange-500 text-white animate-bounce flex items-center justify-center gap-2"
                   >
                       <PenTool /> Onderhoud Nodig!
                   </button>
              ) : (
                  /* NORMAL BUTTON */
                  <button 
                    onClick={handleClick}
                    disabled={(gameState.isWeaving && !hasSpinningJenny) || hasWaterFrame}
                    className={`w-full font-bold py-4 px-6 rounded-lg shadow-xl transform active:scale-95 transition flex items-center justify-center gap-2 overflow-hidden relative border-2 border-white/20
                        ${hasWaterFrame 
                            ? 'bg-emerald-700 text-emerald-100 cursor-not-allowed opacity-90'
                            : (gameState.isWeaving 
                                ? 'bg-stone-600 cursor-wait text-stone-300' 
                                : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white'
                              )
                        }
                    `}
                  >
                    {/* Progress Bar Background */}
                    {gameState.isWeaving && !hasSpinningJenny && !hasWaterFrame && (
                        <div 
                            className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-100 ease-linear opacity-50"
                            style={{ width: `${weavePercentage}%` }}
                        ></div>
                    )}
                    
                    {/* Button Content */}
                    <div className="relative z-10 flex items-center gap-2 text-lg">
                        {hasWaterFrame ? (
                            <>
                                {hasSteamEngine ? <Flame className="animate-pulse text-orange-400" /> : <Waves className="animate-pulse" />}
                                {hasSteamEngine ? "Automatisch (Stoomkracht)" : "Automatisch (Waterkracht)"}
                            </>
                        ) : (
                            hasSpinningJenny ? (
                                isIndustrial ? <Factory /> : <Hammer />
                            ) : (
                                gameState.isWeaving ? <Loader2 className="animate-spin" /> : <Clock />
                            )
                        )}
                        
                        {!hasWaterFrame && (
                            hasSpinningJenny 
                                ? (isIndustrial ? "Productie Draaien" : "Spinning Jenny (Snel!)")
                                : (gameState.isWeaving 
                                    ? "Aan het weven..." 
                                    : "Weef Stof"
                                  )
                        )}
                    </div>
                  </button>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-lg">
             <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
                 <ArrowUpCircle /> Markt
             </h2>
             <div className="space-y-3">
                 <button 
                    onClick={() => sellCloth(10)}
                    disabled={gameState.cloth < 10}
                    className={`w-full py-3 px-4 rounded font-bold transition flex justify-between items-center ${gameState.cloth >= 10 ? 'bg-green-600 hover:bg-green-500 text-white shadow-md' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}
                 >
                     <span>Verkoop 10 Stof</span>
                     <span>+£10</span>
                 </button>

                 {hasWaterFrame && (
                     <button 
                        onClick={() => sellCloth(100)}
                        disabled={gameState.cloth < 100}
                        className={`w-full py-3 px-4 rounded font-bold transition flex justify-between items-center ${gameState.cloth >= 100 ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md border-2 border-yellow-400/30' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}
                     >
                         <span>Verkoop 100 Stof</span>
                         <span>+£100</span>
                     </button>
                 )}
             </div>
             
             <div className="mt-6 pt-4 border-t border-stone-300/30 text-sm opacity-70">
                 <div className="flex justify-between mb-1">
                    <span>Passieve Productie:</span>
                    <span className="font-mono">
                        {hasWaterFrame && (gameState.needsYarn || gameState.needsMaintenance) 
                            ? <span className="text-red-500 font-bold">GESTOPT</span> 
                            : `${(gameState.productionRate) * 10}/sec`
                        }
                    </span>
                 </div>
                 {!hasSpinningJenny && !hasWaterFrame && (
                     <div className="mt-2 text-xs text-orange-800 bg-orange-100/80 p-2 rounded">
                         <strong>Let op:</strong> Handwerk levert alleen stof op. Verkoop het om geld te krijgen!
                     </div>
                 )}
             </div>
          </div>
        </section>

        {/* Center/Right: Upgrades & History */}
        <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Upgrades */}
            <div className="bg-white/90 text-stone-900 rounded-xl p-6 shadow-xl h-fit max-h-[600px] overflow-y-auto">
                <h2 className="text-2xl font-serif font-bold mb-6 border-b pb-2 border-stone-300 sticky top-0 bg-white/95 backdrop-blur z-10">Uitvindingen</h2>
                <div className="space-y-4">
                    {upgrades.map(upgrade => (
                        <div key={upgrade.id} className={`p-4 rounded border transition relative overflow-hidden group ${upgrade.purchased ? 'bg-green-50 border-green-200 opacity-80 order-last' : 'bg-stone-50 border-stone-200 hover:border-blue-400'}`}>
                            
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-stone-200 rounded flex-shrink-0 overflow-hidden">
                                    <img src={upgrade.imageUrl} alt={upgrade.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-lg">{upgrade.name}</h3>
                                        {upgrade.purchased ? (
                                            <button onClick={() => setCurrentTechInfo(upgrade)} className="text-blue-600 hover:text-blue-800"><Info size={20}/></button>
                                        ) : (
                                            <span className="font-mono font-bold text-blue-800">{teacherMode ? 'GRATIS' : `£${upgrade.cost}`}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">{upgrade.description}</p>
                                    {!upgrade.purchased && (
                                        <button 
                                            onClick={() => buyUpgrade(upgrade)}
                                            disabled={!teacherMode && (gameState.money < upgrade.cost || gameState.year < upgrade.yearRequirement)}
                                            className={`w-full py-2 rounded text-sm font-bold shadow-sm transition-all ${teacherMode || (gameState.money >= upgrade.cost && gameState.year >= upgrade.yearRequirement) ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            {(!teacherMode && gameState.year < upgrade.yearRequirement) ? `Beschikbaar in ${Math.floor(upgrade.yearRequirement)}` : 'Kopen & Ontwikkelen'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Context / History */}
            <div className="bg-amber-100 text-amber-900 rounded-xl p-6 shadow-xl border border-amber-200 h-fit">
                 <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                    <BookOpen /> Context
                 </h2>
                 {isIndustrial && (
                     <div className="mb-4 bg-gray-800 text-gray-200 p-4 rounded flex items-center gap-4 animate-pulse">
                         <CloudFog size={32} />
                         <p className="text-sm">De luchtvervuiling neemt toe. Arbeiders klagen over hun gezondheid in de overvolle steden.</p>
                     </div>
                 )}
                 <div className="space-y-4">
                    <p className="italic text-sm font-serif">Huidig Jaar: {Math.floor(gameState.year)}</p>
                    <div className="prose prose-sm prose-amber">
                        <p>{getCurrentContextText()}</p>
                    </div>
                 </div>
            </div>

        </section>
      </main>

      {/* MODALS */}

      {/* WIN MODAL */}
      {gameState.gameWon && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 max-w-lg w-full p-8 rounded-xl shadow-2xl border-4 border-yellow-500 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 animate-pulse"></div>
                <Trophy className="mx-auto text-yellow-500 w-24 h-24 mb-6 drop-shadow-lg" />
                <h2 className="text-4xl font-serif font-bold text-stone-900 mb-4">Gefeliciteerd!</h2>
                <p className="text-xl text-stone-700 mb-8 font-serif">Je hebt het spel uitgespeeld!</p>
                <div className="bg-white/50 p-4 rounded mb-8">
                    <p className="text-stone-600">Je hebt de Industriële Revolutie doorlopen van huisnijverheid tot massaproductie en een fortuin vergaard.</p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105"
                >
                    Opnieuw Spelen
                </button>
            </div>
        </div>
      )}
      
      {/* 1. Historical Event Popup (Narrative) */}
      {currentEvent && !currentTechInfo && !gameState.gameWon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-sepia-100 bg-amber-50 max-w-lg w-full p-8 rounded-lg shadow-2xl border-4 border-amber-800 relative animate-in zoom-in-95 duration-200">
                <h2 className="text-3xl font-serif font-bold text-amber-900 mb-4">{currentEvent.title}</h2>
                <div className="w-full h-1 bg-amber-800 mb-4"></div>
                <p className="text-lg text-amber-900 mb-8 leading-relaxed font-serif">
                    {currentEvent.message}
                </p>
                <button 
                    onClick={() => setCurrentEvent(null)}
                    className="w-full bg-amber-800 text-amber-50 py-3 rounded font-bold hover:bg-amber-900 transition"
                >
                    Begrepen
                </button>
            </div>
        </div>
      )}

      {/* 2. Tech Unlock Modal (Educational) */}
      {currentTechInfo && !gameState.gameWon && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in duration-300">
                <div className="md:w-1/2 bg-stone-200 h-64 md:h-auto relative">
                    <img src={currentTechInfo.imageUrl} alt={currentTechInfo.name} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="md:w-1/2 p-8 flex flex-col">
                    <div className="mb-auto">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Nieuwe Uitvinding!</h3>
                        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">{currentTechInfo.name}</h2>
                        <div className="h-1 w-12 bg-blue-600 mb-6"></div>
                        <p className="text-stone-700 text-lg leading-relaxed italic">
                            "{currentTechInfo.consequence}"
                        </p>
                    </div>
                    <button 
                        onClick={() => setCurrentTechInfo(null)}
                        className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                    >
                        Verder Spelen
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 3. Steam Engine Simulation */}
      {screen === 'steam-engine' && !gameState.gameWon && (
        <SteamEngineSim 
            onClose={() => setScreen('game')} 
            onActivate={activateSteamEngine}
            isActive={gameState.steamEngineActive}
        />
      )}

      {/* AI Tutor Chat */}
      {chatOpen && !gameState.gameWon && (
          <div className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-white rounded-xl shadow-2xl z-50 flex flex-col border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2"><BookOpen size={18}/> Vraag de Historicus</h3>
                  <button onClick={() => setChatOpen(false)}>&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {chatHistory.length === 0 && (
                      <p className="text-gray-500 text-sm text-center italic">Stel een vraag over de stoommachine, fabrieken of het leven in 1750!</p>
                  )}
                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-lg text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 ml-auto' : 'bg-white border border-gray-200 mr-auto shadow-sm'}`}>
                          {msg.text}
                      </div>
                  ))}
                  {chatLoading && <div className="text-gray-400 text-xs animate-pulse">Historicus is aan het schrijven...</div>}
              </div>
              <form onSubmit={handleChatSubmit} className="p-3 border-t bg-white flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Waarom was steenkool nodig?"
                    className="flex-1 text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
                      &rarr;
                  </button>
              </form>
          </div>
      )}

    </div>
  );
};

export default App;