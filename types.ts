export interface GameState {
  money: number;
  cloth: number;
  population: number; // General population/market size
  workers: number; // Specific factory/house workers
  year: number;
  pollution: number; // 0 to 100
  productionRate: number;
  clickPower: number;
  isWeaving: boolean;
  weaveProgress: number; // in milliseconds
  steamEngineActive: boolean; // Has the player started the engine in the sim?
  
  // Maintenance mechanics for Waterframe+
  needsYarn: boolean;
  needsMaintenance: boolean;
  yarnTimer: number;
  maintenanceTimer: number;

  // New features
  wageTimer: number;
  gameWon: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  consequence: string; // Educational text about consequences
  imageUrl: string;
  cost: number;
  purchased: boolean;
  triggerEvent?: string;
  effect: (state: GameState) => Partial<GameState>;
  type: 'invention' | 'building' | 'policy';
  yearRequirement: number;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  message: string;
  year: number;
  triggered: boolean;
}

export type Screen = 'game' | 'steam-engine' | 'ai-tutor';