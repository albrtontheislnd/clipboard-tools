import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from '@mistralai/mistralai';
import OpenAI from "openai";
import { App } from "obsidian";
import { tUtils } from "./utils";

enum AIPromptsForceMode {
  Default = 0,
  Llama,
}

export class AIPrompts {
    /**
     * Generates a prompt string for converting image content to Markdown and LaTeX.
     * 
     * This prompt instructs an AI model to extract text and mathematical formulas 
     * from an image, convert the text into Markdown with appropriate syntax (e.g., 
     * headers, lists, emphasis), and convert mathematical expressions into LaTeX 
     * format. The conversion should preserve the logical flow and structure of the 
     * original content.
     * 
     * @returns A string containing the prompt for the AI model.
     */
    static getImageToMarkdown_Prompt(forceMode: AIPromptsForceMode = AIPromptsForceMode.Default): string {
        switch (forceMode) {
          case AIPromptsForceMode.Llama:
            return `Perform OCR on the screenshot and extract text and mathematical formulas. Convert the extracted text into Markdown syntax and mathematical formulas into LaTex syntax. Do not include any additional information, only the converted text and formulas.`;
        
          default:
            return `Extract all text and mathematical formulas from the provided image. Convert regular text to Markdown syntax, using appropriate formatting (e.g., headers, lists, emphasis) based on the context. For mathematical expressions, convert them to LaTeX format, encapsulating them in $...$ for inline math or $$...$$ for display math, as appropriate. Ensure the resulting output maintains the logical flow and structure of the original content.`;
        }
    }

    /**
     * Generates a prompt string for summarizing a given Markdown text.
     * 
     * This prompt instructs an AI model to extract key information from a Markdown text, 
     * condensing it into concise bullet points that capture the main ideas, key steps, 
     * or critical information. The AI model should aim for brevity while retaining the 
     * essential meaning of the text.
     * 
     * @returns A string containing the prompt for the AI model.
     */
    static getSummarizeText_Prompt(): string {
        const prompt = `Summarize the provided Markdown text into concise, key bullet points. Focus on capturing the main ideas, key steps, or critical information. Aim for brevity, while retaining the essential meaning.`;
        return prompt;
    }

    /**
     * Converts an image blob to a markdown string using an Anthropic AI model.
     * 
     * This method leverages the `@anthropic-ai/sdk` to process the given image blob,
     * extracting text and mathematical formulas and converting them into Markdown format.
     * It leverages a specific AI model identified by the model ID and requires an API key
     * for authentication.
     *
     * @param app - The application instance, used for accessing utilities.
     * @param blob - The image blob to be converted.
     * @param model - The model ID of the Anthropic AI to use for conversion.
     * @param apiKey - The API key for authenticating with the Anthropic AI service.
     * @returns A promise that resolves to a string containing the converted markdown text.
     */
    static async convertImageToMarkdown_Anthropic(app: App, blob: Blob, model: string, apiKey: string): Promise<string> {
		const anthropic = new Anthropic({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true,
		});

        const image_media_type = 'image/webp';
        const image_data = await tUtils.getImageData(blob, {
            maxDimensions: 1000,
            maxPixels: 1000000,
            format: 'webp',
        }, 'Base64');

		const message = await anthropic.messages.create({
            model: model,
            max_tokens: 1000,
            messages: [
                {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_media_type,
                            "data": <string> image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": AIPrompts.getImageToMarkdown_Prompt()
                    }
                ]
                }
            ]
            });

        const mergedText = message.content
        .flat() // Flatten array if there are nested arrays
        .filter(item => item.type === "text") // Filter for items with type "text"
        .map(item => (item as Anthropic.TextBlock).text) // Map to extract "text" values
        .join(" "); // Join all "text" values into one string

        return mergedText;
	}

    /**
     * Summarizes the given Markdown text using an Anthropic AI model.
     * 
     * This method utilizes the `@anthropic-ai/sdk` to process the given Markdown text,
     * extracting key information and condensing it into concise bullet points that
     * capture the main ideas, key steps, or critical information. The AI model should
     * aim for brevity while retaining the essential meaning of the text.
     * 
     * @param originalText - The Markdown text to summarize.
     * @param model - The model ID of the Anthropic AI to use for summarization.
     * @param apiKey - The API key for authenticating with the Anthropic AI service.
     * @returns A promise that resolves to a string containing the summarized text.
     */
    static async summarizeText_Anthropic(originalText: string, model: string, apiKey: string): Promise<string> {
		const anthropic = new Anthropic({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true,
		});

		const message = await anthropic.messages.create({
            model: model,
            max_tokens: 1000,
            system: `You are an expert research assistant. Here is a Markdown document you will process (wrapped by tag <doc>): \n<doc>${originalText}</doc>`,
            messages: [
                {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": AIPrompts.getSummarizeText_Prompt()
                    }
                ]
                }
            ]
            });

        const mergedText = message.content
        .flat() // Flatten array if there are nested arrays
        .filter(item => item.type === "text") // Filter for items with type "text"
        .map(item => (item as Anthropic.TextBlock).text) // Map to extract "text" values
        .join(" "); // Join all "text" values into one string

        return mergedText;
	}

    /**
     * Converts an image blob to a markdown string using Google's generative AI model.
     * 
     * This method utilizes the Google generative AI to process the given image blob,
     * extracting text and mathematical formulas and converting them into Markdown format.
     * It leverages a specific AI model identified by the model ID and requires an API key
     * for authentication.
     *
     * @param app - The application instance, used for accessing utilities.
     * @param blob - The image blob to be converted.
     * @param model - The model ID of the Google generative AI to use for conversion.
     * @param apiKey - The API key for authenticating with the Google generative AI service.
     * @returns A promise that resolves to a string containing the converted markdown text.
     */
    static async convertImageToMarkdown_Google(app: App, blob: Blob, model: string, apiKey: string): Promise<string> {

        const image_media_type = 'image/webp';
        const image_data = await tUtils.getImageData(blob, {
            maxDimensions: 1000,
            maxPixels: 1000000,
            format: 'webp',
        }, 'Base64');

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model });

        const prompt = AIPrompts.getImageToMarkdown_Prompt();

        const result = await geminiModel.generateContent([
            prompt,
            {
                inlineData: {
                    data: <string> image_data,
                    mimeType: image_media_type,
              },
            },
          ]);

        return result.response.text();
	}

    /**
     * Calls the Google generative AI model to summarize the given Markdown text.
     * 
     * This method utilizes the Google generative AI to process the given Markdown text,
     * extracting key information and condensing it into concise bullet points that
     * capture the main ideas, key steps, or critical information. The AI model should
     * aim for brevity while retaining the essential meaning of the text.
     * 
     * @param originalText - The Markdown text to summarize.
     * @param model - The model ID of the Google generative AI to use for summarization.
     * @param apiKey - The API key for authenticating with the Google generative AI service.
     * @returns A promise that resolves to a string containing the summarized text.
     */
    static async summarizeText_Google(originalText: string, model: string, apiKey: string): Promise<string> {
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model });

        const prompt = `You are an expert research assistant. Here is a Markdown document you will process (wrapped by tag <doc>): \n<doc>${originalText}</doc> \n${AIPrompts.getSummarizeText_Prompt()}`;
        const result = await geminiModel.generateContent(prompt);
        
        return result.response.text();
	}


/**
 * Converts an image blob to a markdown string using the Mistral AI model.
 * 
 * This method utilizes the Mistral AI to process the given image blob,
 * extracting text and mathematical formulas and converting them into Markdown format.
 * It leverages a specific AI model identified by the model ID and requires an API key
 * for authentication.
 *
 * @param app - The application instance, used for accessing utilities.
 * @param blob - The image blob to be converted.
 * @param model - The model ID of the Mistral AI to use for conversion.
 * @param apiKey - The API key for authenticating with the Mistral AI service.
 * @returns A promise that resolves to a string containing the converted markdown text.
 */
    static async convertImageToMarkdown_Mistral(app: App, blob: Blob, model: string, apiKey: string): Promise<string> {

        const client = new Mistral({apiKey: apiKey});

        const image_media_type = 'image/webp';
        const image_data = await tUtils.getImageData(blob, {
            maxDimensions: 1000,
            maxPixels: 1000000,
            format: 'webp',
        }, 'DataURL');

        const chatResponse = await client.chat.complete({
            model: model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: AIPrompts.getImageToMarkdown_Prompt() },
                  {
                    type: "image_url",
                    imageUrl: <string> image_data,
                  },
                ],
              },
            ],
          });

        if ('choices' in chatResponse && chatResponse.choices) {
            return String(chatResponse.choices[0]?.message?.content);
        } else {
            // handle the case where chatResponse.choices is undefined
            return '';
        }
	}

    /**
     * Calls the Mistral AI model to summarize the given Markdown text.
     * @param originalText - The Markdown text to summarize.
     * @param model - The model ID of the Mistral AI to use for summarization.
     * @param apiKey - The API key for the Mistral AI service.
     * @returns A promise that resolves to a Markdown string containing the summarized text.
     */
    static async summarizeText_Mistral(originalText: string, model: string, apiKey: string): Promise<string> {
        const client = new Mistral({apiKey: apiKey});

        const prompt = `You are an expert research assistant. Here is a Markdown document you will process (wrapped by tag <doc>): \n<doc>${originalText}</doc> \n${AIPrompts.getSummarizeText_Prompt()}`;

        const chatResponse = await client.chat.complete({
            model: model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                ],
              },
            ],
          });

        if ('choices' in chatResponse && chatResponse.choices) {
            return String(chatResponse.choices[0]?.message?.content);
        } else {
            // handle the case where chatResponse.choices is undefined
            return '';
        }
	}

    static async convertImageToMarkdown_TogetherAI(app: App, blob: Blob, model: string, apiKey: string): Promise<string> {
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.together.xyz/v1",
            dangerouslyAllowBrowser: true,
          });

        // const image_media_type = 'image/webp';
        const image_data = await tUtils.getImageData(blob, {
            maxDimensions: 1000,
            maxPixels: 1000000,
            format: 'webp',
        }, 'DataURL');

        let prompt: string;

        if(model.toLowerCase().includes('llama')) {
          prompt = AIPrompts.getImageToMarkdown_Prompt(AIPromptsForceMode.Llama);
        } else {
          prompt = AIPrompts.getImageToMarkdown_Prompt();
        }

        console.log(prompt);

        const response = await client.chat.completions.create({
            model: model,
            // temperature: 0.2,
            stream: false,
            messages: [
              { role: 'user', content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: <string> image_data } }
              ] },
            ],
          });

        if ('choices' in response && response.choices) {
            return String(response.choices[0]?.message?.content);
        } else {
            // handle the case where chatResponse.choices is undefined
            return '';
        }
	}

    /**
     * Calls the Mistral AI model to summarize the given Markdown text.
     * @param originalText - The Markdown text to summarize.
     * @param model - The model ID of the Mistral AI to use for summarization.
     * @param apiKey - The API key for the Mistral AI service.
     * @returns A promise that resolves to a Markdown string containing the summarized text.
     */
    static async summarizeText_TogetherAI(originalText: string, model: string, apiKey: string): Promise<string> {
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.together.xyz/v1",
            dangerouslyAllowBrowser: true,
          });

        const prompt = `You are an expert research assistant. Here is a Markdown document you will process (wrapped by tag <doc>): \n<doc>${originalText}</doc> \n${AIPrompts.getSummarizeText_Prompt()}`;

        const response = await client.chat.completions.create({
            model: model,
            messages: [
              { role: 'user', content: [
                { type: 'text', text: prompt },
              ] },
            ],
          });

        if ('choices' in response && response.choices) {
            return String(response.choices[0]?.message?.content);
        } else {
            // handle the case where chatResponse.choices is undefined
            return '';
        }
	}

}