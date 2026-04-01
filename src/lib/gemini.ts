import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ScanResult {
  diseaseName: string;
  description: string;
  spreadMethod: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedMedicines: string[];
  nearbyDoctorSpecialty: string;
}

export async function analyzeSkinImage(base64Image: string, mimeType: string): Promise<ScanResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this image of a skin condition. Provide the following in JSON format: diseaseName, description, spreadMethod, severity (Low, Medium, High, Critical), recommendedMedicines (array of strings), nearbyDoctorSpecialty (string). If it does not look like a skin condition, return diseaseName as 'Unknown' and describe why.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diseaseName: { type: Type.STRING },
          description: { type: Type.STRING },
          spreadMethod: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
          recommendedMedicines: { type: Type.ARRAY, items: { type: Type.STRING } },
          nearbyDoctorSpecialty: { type: Type.STRING },
        },
        required: ["diseaseName", "description", "spreadMethod", "severity", "recommendedMedicines", "nearbyDoctorSpecialty"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text) as ScanResult;
}
