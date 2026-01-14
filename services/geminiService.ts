import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedJobDetails } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts company profile and job description from a URL using Gemini with Search Grounding.
 */
export const extractJobDetails = async (url: string): Promise<ExtractedJobDetails> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Please analyze the job posting at this URL: ${url}. 
      
      If you cannot access the page content directly, use Google Search to find the job listing details for this specific URL or the implied job.
      
      Extract the following information:
      1. Company Profile: A summary of the company, its mission, and culture.
      2. Job Description: The key responsibilities, requirements, and skills needed.
      3. detailed Insights:
         - Estimated salary budget for this profile (Return "NA" if not available).
         - Name of the HR or Recruiter who likely posted this.
         - Contact email address for inquiries.
         - Who previously held this position or currently holds a similar role? (Try to find names/LinkedIn profiles).
         - Who would be the possible manager? (Try to find names/LinkedIn profiles).
         - Who are possible team mates? (Try to find names/LinkedIn profiles).

      Return the result in JSON format.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyProfile: {
              type: Type.STRING,
              description: "The extracted company profile summary.",
            },
            jobDescription: {
              type: Type.STRING,
              description: "The extracted job description, requirements, and responsibilities.",
            },
            salaryBudget: {
              type: Type.STRING,
              description: "Estimated salary range or NA.",
            },
            hrContact: {
              type: Type.STRING,
              description: "Name of HR/Recruiter.",
            },
            contactEmail: {
              type: Type.STRING,
              description: "Contact email or NA.",
            },
            previousHolder: {
              type: Type.STRING,
              description: "Name/Profile of previous or current holder.",
            },
            possibleManager: {
              type: Type.STRING,
              description: "Name/Profile of possible manager.",
            },
            teamMates: {
              type: Type.STRING,
              description: "Names/Profiles of possible team mates.",
            },
          },
          required: [
            "companyProfile", 
            "jobDescription", 
            "salaryBudget", 
            "hrContact", 
            "contactEmail", 
            "previousHolder", 
            "possibleManager", 
            "teamMates"
          ],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ExtractedJobDetails;
  } catch (error) {
    console.error("Extraction error:", error);
    throw new Error("Failed to extract job details. Please ensure the URL is valid or try pasting the details manually.");
  }
};

/**
 * Parses text from an uploaded resume file (PDF or Image).
 */
export const parseResumeFromMedia = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Please extract all the text from this resume document. Format it cleanly as Markdown, preserving the structure, headers, and bullet points as much as possible. Do not summarize; provide the full content.",
          },
        ],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error) {
    console.error("Resume parsing error:", error);
    throw new Error("Failed to read the resume file. Please try converting to a simpler PDF or Image, or copy-paste the text.");
  }
};

/**
 * Parses resume content from raw text (e.g. copied from Google Doc).
 */
export const parseResumeFromText = async (rawText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        The following text was copied from a Resume/CV (e.g., from a Google Doc).
        Please reconstruct it into a clean, well-formatted Markdown CV.
        Preserve all content, headers, and bullet points. Fix any copy-paste formatting errors or weird spacing.
        
        RAW TEXT INPUT:
        ---
        ${rawText}
        ---
      `,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error) {
    console.error("Text parsing error:", error);
    throw new Error("Failed to parse text content. Please try again.");
  }
};

/**
 * Optimizes a CV based on the company profile and job description.
 */
export const optimizeCV = async (
  currentCv: string, 
  companyProfile: string, 
  jobDescription: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are an expert Resume Writer and Career Coach.
        
        Task: Rewrite and optimize the candidate's CV to perfectly align with the provided target Job Description and Company Profile.
        
        Input Data:
        ---
        TARGET COMPANY PROFILE:
        ${companyProfile}
        ---
        TARGET JOB DESCRIPTION:
        ${jobDescription}
        ---
        CANDIDATE'S CURRENT CV:
        ${currentCv}
        ---
        
        Guidelines:
        1. Analyze the JD for keywords and key skills.
        2. Rewrite the Professional Summary to target this specific role.
        3. Rephrase bullet points in the Experience section to highlight achievements relevant to the JD.
        4. Ensure the tone matches the company culture (e.g., innovative vs. corporate).
        5. Keep the CV structure clean and professional. 
        6. Do not invent false experiences, but emphasize relevant existing ones.
        7. Return the full, formatted CV text in Markdown. Use H1 for Name, H2 for Sections, etc.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }, // Enable some thinking for better optimization
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;

  } catch (error) {
    console.error("Optimization error:", error);
    throw new Error("Failed to optimize CV. Please try again.");
  }
};

/**
 * Generates a Cover Letter based on the CV, Company Profile, and Job Description.
 */
export const generateCoverLetter = async (
  currentCv: string,
  companyProfile: string,
  jobDescription: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are an expert Career Coach.
        
        Task: Write a compelling, professional cover letter for the candidate based on their CV, applying for the specific role described.
        
        Input Data:
        ---
        COMPANY PROFILE:
        ${companyProfile}
        ---
        JOB DESCRIPTION:
        ${jobDescription}
        ---
        CANDIDATE'S CV:
        ${currentCv}
        ---
        
        Guidelines:
        1. Use a standard business letter format.
        2. Hook the reader in the opening paragraph by showing enthusiasm for the company/role.
        3. Use specific examples from the CV to demonstrate why the candidate is a perfect fit for the requirements in the JD.
        4. Match the tone of the company (e.g., formal for finance, creative for startups).
        5. Keep it concise (max 400 words).
        6. Return the result in Markdown format.
      `,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error) {
    console.error("Cover Letter generation error:", error);
    throw new Error("Failed to generate Cover Letter.");
  }
};