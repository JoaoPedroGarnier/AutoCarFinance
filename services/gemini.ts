
import { GoogleGenAI } from "@google/genai";
import { Vehicle } from "../types";

// Avoid TypeScript errors with process.env in some environments
declare const process: any;

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateVehicleDescription = async (vehicle: Partial<Vehicle>): Promise<string> => {
  const client = getClient();
  if (!client) return "Chave de API indisponível. Verifique a configuração.";

  try {
    const prompt = `
      Crie uma descrição atraente, profissional e orientada para vendas para um anúncio de loja de carros.
      Detalhes do Veículo:
      - Marca: ${vehicle.make}
      - Modelo: ${vehicle.model}
      - Ano: ${vehicle.year}
      - Versão: ${vehicle.version}
      - Quilometragem: ${vehicle.mileage} km
      - Cor: ${vehicle.color}
      - Combustível: ${vehicle.fuel}
      
      O tom deve ser convidativo e confiável. Destaque a baixa quilometragem se aplicável.
      Mantenha o texto abaixo de 150 palavras. Responda APENAS em Português do Brasil. Não use markdown.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Erro ao gerar descrição com IA. Tente novamente.";
  }
};
