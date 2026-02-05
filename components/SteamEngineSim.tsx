import React, { useState, useEffect } from 'react';
import { explainMachinePart } from '../services/geminiService';

interface Props {
  onClose: () => void;
  onActivate: () => void;
  isActive: boolean;
}

const SteamEngineSim: React.FC<Props> = ({ onClose, onActivate, isActive }) => {
  const [heat, setHeat] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [explanation, setExplanation] = useState<string>(isActive ? "De machine draait al stabiel." : "Stook de ketel op tot boven de 30 PSI om de productie te starten!");
  const [isRunning, setIsRunning] = useState(false);

  // Simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (heat > 0) {
        setPressure(p => Math.min(100, p + (heat / 5)));
        setHeat(h => Math.max(0, h - 0.5));
      } else {
        setPressure(p => Math.max(0, p - 1));
      }

      if (pressure > 30) {
        setIsRunning(true);
        if (!isActive) {
            onActivate(); // Tell main app the engine started
        }
      } else {
        // If it was already active globally, we keep it visual 'running' for effect, 
        // or let it die down visually but keep economy running.
        // For this sim, let's stop visual movement if pressure drops.
        setIsRunning(false);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [heat, pressure, isActive, onActivate]);

  const handleStoke = () => {
    setHeat(h => Math.min(100, h + 15));
  };

  const handleExplain = async (part: string) => {
    setExplanation("Even in de handleiding kijken...");
    const text = await explainMachinePart(part);
    setExplanation(text);
  };

  const wheelSpeed = pressure > 0 ? `${1000 / Math.max(1, pressure)}s` : '0s';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-5xl p-6 relative flex flex-col md:flex-row gap-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-red-500 transition text-3xl font-bold leading-none">&times;</button>
        
        {/* Visual Simulation Area */}
        <div className="flex-1 bg-stone-100 rounded-lg border-4 border-stone-400 p-8 relative overflow-hidden min-h-[450px] shadow-inner select-none">
          <h2 className="absolute top-2 left-2 text-stone-500 font-bold uppercase tracking-widest text-xs">James Watt Model 1784</h2>

          {/* BACKGROUND PIPES */}
          <div className="absolute top-10 right-20 w-4 h-full bg-stone-300"></div>
          <div className="absolute top-40 left-0 w-full h-4 bg-stone-300"></div>

          {/* 1. BOILER (KETEL) */}
          <div 
            className="absolute bottom-10 left-10 w-40 h-48 bg-stone-800 rounded-t-full rounded-b-lg border-b-8 border-stone-900 cursor-pointer group hover:scale-105 transition-transform"
            onClick={() => handleExplain('Vuurhaard en Boiler')}
          >
            {/* Fire visualization */}
            <div className="absolute bottom-2 left-4 right-4 h-20 bg-black rounded-lg overflow-hidden">
                <div 
                    className="w-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-300 opacity-90 blur-sm transition-all duration-200"
                    style={{ height: `${Math.min(100, heat)}%` }}
                ></div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-400 font-serif font-bold text-center group-hover:text-white transition-colors">
                KETEL
                <div className="text-xs font-sans font-normal text-stone-500">{Math.round(heat)}°C</div>
            </div>
          </div>
          
          {/* Steam Pipe */}
          <div className="absolute bottom-56 left-28 w-6 h-32 bg-gradient-to-r from-stone-500 to-stone-400 border-x border-stone-600">
             {/* Rising Steam bubbles visual */}
             {pressure > 20 && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
          </div>
          <div className="absolute top-[164px] left-28 w-48 h-6 bg-gradient-to-b from-stone-500 to-stone-400 border-y border-stone-600"></div>

          {/* 2. PISTON (ZUIGER) */}
          <div 
            className="absolute top-32 left-64 w-32 h-56 bg-stone-200 border-4 border-stone-600 rounded-lg cursor-pointer overflow-hidden hover:border-blue-500 transition-colors"
            onClick={() => handleExplain('Zuiger en Cilinder')}
          >
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
             
             {/* Steam filling the chamber */}
             <div 
                className="absolute top-0 left-0 right-0 bg-gray-300 transition-all duration-300 ease-out"
                style={{ height: isRunning ? '100%' : `${pressure}%`, opacity: 0.5 }}
             ></div>

             {/* The Piston Head */}
             <div 
                className="absolute left-2 right-2 h-6 bg-stone-800 border-2 border-stone-600 shadow-sm transition-transform will-change-transform"
                style={{ 
                    top: '20px',
                    animation: isRunning ? `piston-bounce ${wheelSpeed} infinite ease-in-out` : 'none'
                }}
             >
                 {/* Connecting Rod */}
                 <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-64 bg-stone-500"></div>
             </div>
          </div>

          {/* 3. BEAM (BALANSARM) */}
          <div className="absolute top-16 left-64 w-[300px] h-6 bg-stone-800 rounded flex items-center justify-center origin-[20%_50%] z-10"
               style={{ 
                   animation: isRunning ? `beam-rock ${wheelSpeed} infinite ease-in-out` : 'none' 
               }}
          >
              <div className="w-4 h-4 bg-stone-400 rounded-full border-2 border-black"></div>
          </div>
          
          {/* Support for Beam */}
          <div className="absolute top-20 left-[320px] w-8 h-80 bg-stone-700"></div>

          {/* 4. FLYWHEEL (VLIEGWIEL) */}
          <div 
            className="absolute top-40 right-10 w-48 h-48 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleExplain('Vliegwiel')}
          >
             <div 
                className="w-full h-full border-[12px] border-stone-800 rounded-full flex items-center justify-center bg-transparent shadow-xl"
                style={{ animation: isRunning ? `spin ${wheelSpeed} infinite linear` : 'none' }}
             >
                <div className="w-full h-2 bg-stone-800 absolute"></div>
                <div className="h-full w-2 bg-stone-800 absolute"></div>
                <div className="w-2/3 h-2/3 border-4 border-stone-600 rounded-full"></div>
             </div>
             {/* Condensor/Governor (Decoration) */}
             <div className="absolute -left-10 top-1/2 w-10 h-2 bg-stone-500"></div>
          </div>

          {/* CONTROLS */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-3 bg-white/95 p-4 rounded-xl shadow-lg border border-stone-200 backdrop-blur-sm z-20">
             <div className="flex justify-between items-end mb-1">
                 <span className="text-xs font-bold text-stone-500 uppercase">Stoomdruk</span>
                 <span className="font-mono font-bold text-lg">{Math.round(pressure)} <span className="text-xs text-stone-400">PSI</span></span>
             </div>
             <div className="w-48 h-3 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
               <div className={`h-full transition-all duration-300 ${pressure > 80 ? 'bg-red-500' : (pressure > 30 ? 'bg-green-500' : 'bg-yellow-500')}`} style={{ width: `${pressure}%` }}></div>
             </div>
             <div className="h-px bg-stone-200 my-1"></div>
             <button 
                onClick={handleStoke}
                className="bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-3 px-4 rounded-lg font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2 group"
             >
               <span className="group-hover:animate-bounce">🔥</span> Kolen Scheppen
             </button>
             {isActive && <div className="text-xs text-center text-green-600 font-bold bg-green-50 py-1 rounded">PRODUCTIE ACTIEF</div>}
          </div>
        </div>

        {/* Explanation Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 text-stone-700 flex-1 flex flex-col shadow-sm">
             <h3 className="font-serif font-bold text-lg text-stone-800 border-b pb-2 mb-3">Instructeur</h3>
             <p className="leading-relaxed text-sm flex-1">{explanation}</p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes piston-bounce { 
            0% { transform: translateY(0); }
            50% { transform: translateY(120px); }
            100% { transform: translateY(0); }
        }
        @keyframes beam-rock {
            0% { transform: rotate(-10deg); }
            50% { transform: rotate(10deg); }
            100% { transform: rotate(-10deg); }
        }
      `}</style>
    </div>
  );
};

export default SteamEngineSim;