import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const askHistorian = async (question: string, context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Je bent een deskundige, vriendelijke geschiedenisleraar voor de onderbouw van de middelbare school (2 TL/Havo).
        De leerling speelt een spel over de Industriële Revolutie.
        Huidige spelstatus/context: ${context}
        
        De leerling vraagt: "${question}"
        
        Geef een kort, duidelijk antwoord (maximaal 3 zinnen) dat past bij hun niveau. Leg uit waarom dingen gebeuren (oorzaak-gevolg).
      `,
    });
    return response.text || "De historicus is even koffie drinken. Probeer het later nog eens.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Er ging iets mis bij het raadplegen van de boeken. Controleer de API sleutel.";
  }
};

export const explainMachinePart = async (part: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Leg in Jip-en-Janneketaal uit wat de functie is van de "${part}" in een stoommachine uit de Industriële Revolutie. Maximaal 2 zinnen.`,
    });
    return response.text || "Geen uitleg beschikbaar.";
  } catch (error) {
    return "Kan geen uitleg laden.";
  }
};
