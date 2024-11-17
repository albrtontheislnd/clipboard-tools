import Anthropic from "@anthropic-ai/sdk";
import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from '@mistralai/mistralai';
import OpenAI from "openai";
import { App, TFile } from "obsidian";
import { tUtils } from "./utils";
import { AIModel } from "./interfaces";
import { ChatCompletionContentPartImage } from "openai/resources/chat/completions";
import { ImageBlockParam } from "@anthropic-ai/sdk/resources";
import { ContentChunk } from "@mistralai/mistralai/models/components";

type imageSpecs = {
  maxDimensions: number
  maxPixels: number
  format: 'webp' | 'png'
  mimeType: 'image/webp' | 'image/png'
  outputType: 'Blob' | 'ArrayBuffer' | 'Uint8Array' | 'TFile' | 'DataURL' | 'Base64'
}

enum AIPromptsForceMode {
  Default = 0,
  Llama,
}

enum modelRoles {
  system = 'system',
  user = 'user',
  assistant = 'assistant',
}

interface modelParameters {
  temperature: number
  top_p: number
}

const modelParams: Record<string, modelParameters> = {
  'ocr': {
    temperature: 0.1,
    top_p: 0.9,
  },
  'summarize': {
    temperature: 0.3,
    top_p: 0.9
  }
}

const modelScripts = {
  'ocr': {
    'user': [
      `Convert the image to Markdown, including all content with appropriate formatting: e.g., headers, footers, lists, emphasis, tables. For mathematical expressions, must convert them to LaTeX format, encapsulating them in $...$ for inline math or $$...$$ for display math, as appropriate. Preserve the content's logical flow and structure. The output must be pure Markdown, no explanations or code fences. Must include all content from the image.`,
    ],
    'system': [
    ],
    'assistant': [
    ],
  },
  'summarize': {
    'user': [
      'Summarize the provided Markdown text into concise, key bullet points. Focus on capturing the main ideas, key steps, or critical information. Aim for brevity, while retaining the essential meaning.',
    ],
    'system': [
      'Summarize the provided Markdown text into concise, key bullet points. Focus on capturing the main ideas, key steps, or critical information. Aim for brevity, while retaining the essential meaning.'
    ],
    'assistant': [
      'Summarize the provided Markdown text into concise, key bullet points. Focus on capturing the main ideas, key steps, or critical information. Aim for brevity, while retaining the essential meaning.'
    ],
  },
}

export function createModelInstance(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined): Mmllm_OpenAI | Mmllm_GoogleGenerativeAI | Mmllm_TogetherAI | Mmllm_Anthropic | Mmllm_Mistral {
  
  const classMap: { [key: string]: new (mmllmService: AIModel, apiKey: string, app: App | undefined) => any } = {
    'Mmllm_GoogleGenerativeAI': Mmllm_GoogleGenerativeAI,
    'Mmllm_Anthropic': Mmllm_Anthropic,
    'Mmllm_Mistral': Mmllm_Mistral,
    'Mmllm_TogetherAI': Mmllm_TogetherAI,
    'Mmllm_OpenAI': Mmllm_OpenAI,
    'Mmllm_AlibabaCloud': Mmllm_AlibabaCloud,
  };

  const ClassConstructor = classMap[mmllmService.interface];

  if (ClassConstructor) {
    return new ClassConstructor(mmllmService, apiKey, app);
  } else {
    throw new Error(`Class ${mmllmService.interface} not found.`);
  }
}

export class Mmllm {
  app: App | undefined;
  service: AIModel;
  apiKey: string;

  // model-related
  model?: GenerativeModel | OpenAI | Anthropic | Mistral;

  // messages-related
  imageSpecs?: imageSpecs;
  images: Array<string | Blob | TFile | null> = [];


  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    this.app = app;
    this.apiKey = apiKey;
    this.service = mmllmService;
  }
  async addImage(blob: Blob): Promise<void> {
    if (blob instanceof Blob) {
      const imageData = await tUtils.getImageData(blob, {
        // @ts-ignore
          maxDimensions: this.imageSpecs.maxDimensions,
          // @ts-ignore
          maxPixels: this.imageSpecs.maxPixels,
          // @ts-ignore
          format: this.imageSpecs.format,
          // @ts-ignore
      }, this.imageSpecs.outputType);

      this.images.push(imageData);
    } else {
      throw new Error("Invalid arguments");
    }
  }

  getOCRPrompt(role: modelRoles = modelRoles.user, forceMode: AIPromptsForceMode = AIPromptsForceMode.Default): string {
    // get OCR prompts
    const task = 'ocr';
    let prompt: string;

    try {
      prompt = modelScripts[task][role][forceMode];
    } catch (error) {
      prompt = modelScripts[task][modelRoles.user][AIPromptsForceMode.Default];
      
    }
    
    return prompt;
  }

  getSummarizePrompt(originalText: string, role: modelRoles = modelRoles.user, forceMode: AIPromptsForceMode = AIPromptsForceMode.Default): string {
    const task = 'summarize';
    const prompt = modelScripts[task][role]?.[forceMode] ?? modelScripts[task][modelRoles.user][AIPromptsForceMode.Default];
    return role === modelRoles.user ? `Here is a Markdown document you will process (wrapped by tag <doc>): \n<doc>${originalText}</doc> \n${prompt}` : prompt;
  }
}

export interface IMmllm {
  imageSpecs: imageSpecs
  init(): void
  taskOCR(): Promise<string>
  taskSummarize(originalText: string): Promise<string>
}

export class Mmllm_GoogleGenerativeAI extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'Base64'
  };
  private genAI?: GoogleGenerativeAI;

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.service.model_id });
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt();

    const imageParts = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => ({
        inlineData: { 
          data: image, 
          mimeType: this.imageSpecs.mimeType 
        }
      }));
      
    if (this.model instanceof GenerativeModel) {

      this.model.generationConfig = {
        temperature: modelParams['ocr'].temperature,
        topP: modelParams['ocr'].top_p,
      };      

      const generatedContent = await this.model.generateContent([user_prompt, ...imageParts]);
      return generatedContent.response.text();
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
  }

  async taskSummarize(originalText: string): Promise<string> {
    const prompt = this.getSummarizePrompt(originalText, modelRoles.user);

    if (this.model instanceof GenerativeModel) {

      this.model.generationConfig = {
        temperature: modelParams['summarize'].temperature,
        topP: modelParams['summarize'].top_p,
      };

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
  }
}

export class Mmllm_TogetherAI extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'DataURL'
  };

  private endpoint = 'https://api.together.xyz/v1';

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.model = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.endpoint,
      dangerouslyAllowBrowser: true,
    });
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt(modelRoles.user)
    //const system_prompt = this.getOCRPrompt(modelRoles.system);

    const imageParts: ChatCompletionContentPartImage[] = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => (
        { 
          type: 'image_url', 
          image_url: { 'url': image }
        }
      ));

      if (this.model instanceof OpenAI) {
        const response = await this.model.chat.completions.create({
          model: this.service.model_id,
          stream: false,
          temperature: modelParams['ocr'].temperature,
          top_p: modelParams['ocr'].top_p,
          messages: [
/*             {
              role: 'system',
              content: system_prompt,
            }, */
            { 
              role: 'user', 
              content: [{ type: 'text', text: user_prompt }, ...imageParts], 
            },
          ],
        });

        return response.choices?.[0]?.message?.content ?? '';
      }
      else {
        throw new Error(`Model is not an instance of ${this.service.interface}`);
      }
  }

  async taskSummarize(originalText: string): Promise<string> {
    const system_prompt = this.getSummarizePrompt(originalText, modelRoles.system);

    if (this.model instanceof OpenAI) {
      const response = await this.model.chat.completions.create({
        model: this.service.model_id,
        temperature: modelParams['summarize'].temperature,
        top_p: modelParams['summarize'].top_p,
        messages: [
          {
            role: 'system',
            content: system_prompt,
          },
          { role: 'user', 
            content: [{ type: 'text', text: originalText }],
          },
        ],
      });
    
      return response.choices?.[0]?.message?.content ?? '';
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
    

  }
}

export class Mmllm_OpenAI extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'DataURL'
  };

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.model = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt(modelRoles.user)
    //const system_prompt = this.getOCRPrompt(modelRoles.system);

    const imageParts: ChatCompletionContentPartImage[] = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => (
        { 
          type: 'image_url', 
          image_url: { 'url': image }
        }
      ));

      if (this.model instanceof OpenAI) {
        const response = await this.model.chat.completions.create({
          model: this.service.model_id,
          stream: false,
          temperature: modelParams['ocr'].temperature,
          top_p: modelParams['ocr'].top_p,
          messages: [
/*             {
              "role": "system",
              "content": system_prompt,
            }, */
            { 
              role: 'user', 
              content: [{ type: 'text', text: user_prompt }, ...imageParts], 
            },
          ],
        });

        return response.choices?.[0]?.message?.content ?? '';
      }
      else {
        throw new Error(`Model is not an instance of ${this.service.interface}`);
      }
  }

  async taskSummarize(originalText: string): Promise<string> {
    const system_prompt = this.getSummarizePrompt(originalText, modelRoles.system);

    if (this.model instanceof OpenAI) {
      const response = await this.model.chat.completions.create({
        model: this.service.model_id,
        temperature: modelParams['summarize'].temperature,
        top_p: modelParams['summarize'].top_p,
        messages: [
          {
            role: 'system',
            content: system_prompt,
          },
          { role: 'user', 
            content: [{ type: 'text', text: originalText }],
          },
        ],
      });
    
      return response.choices?.[0]?.message?.content ?? '';
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
    

  }
}

export class Mmllm_Anthropic extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'Base64'
  };

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.model = new Anthropic({
			apiKey: this.apiKey,
			dangerouslyAllowBrowser: true,
		});
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt(modelRoles.user);
    // const system_prompt = this.getOCRPrompt(modelRoles.system);

    // images
    const imageParts: ImageBlockParam[] = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => (
        { 
          'type': 'image', 
          'source': {
            'type': 'base64',
            'media_type': this.imageSpecs.mimeType,
            'data': <string> image
          }
        }
      ));
    
    if (this.model instanceof Anthropic) {
      const response = await this.model.messages.create({
        model: this.service.model_id,
        max_tokens: 1000,
        // system: system_prompt,
        temperature: modelParams['ocr'].temperature,
        top_p: modelParams['ocr'].top_p,
        messages: [
            {
            "role": "user",
            "content": [
                ...imageParts,
                { "type": "text", "text": user_prompt }
            ]
            }
        ]
        });
      
        return response.content
        .reduce((acc: string[], item) => {
          if (item.type === "text") acc.push((item as Anthropic.TextBlock).text);
          return acc;
        }, [])
        .join(" ");
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }

  }

  async taskSummarize(originalText: string): Promise<string> {
    const user_prompt = this.getSummarizePrompt(originalText, modelRoles.user);
    const system_prompt = this.getSummarizePrompt(originalText, modelRoles.system);

    if (this.model instanceof Anthropic) {
      const response = await this.model.messages.create({
        model: this.service.model_id,
        max_tokens: 1000,
        system: system_prompt,
        temperature: modelParams['summarize'].temperature,
        top_p: modelParams['summarize'].top_p,
        messages: [
            {
            "role": "user",
            "content": [
                { "type": "text", "text": user_prompt }
            ]
            }
        ]
        });

      return response.content
        .reduce((acc: string[], item) => {
          if (item.type === "text") acc.push((item as Anthropic.TextBlock).text);
          return acc;
        }, [])
        .join(" ");
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
    

  }
}

export class Mmllm_Mistral extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'DataURL'
  };

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.model = new Mistral({
      apiKey: this.apiKey
    });
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt(modelRoles.user);
    //const system_prompt = this.getOCRPrompt(modelRoles.system);

    // images
    const imageParts: ContentChunk[] = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => (
        { 
          type: 'image_url', 
          imageUrl: <string> image,
        }
      ));
    
    if (this.model instanceof Mistral) {
      const response = await this.model.chat.complete({
        model: this.service.model_id,
        temperature: modelParams['ocr'].temperature,
        topP: modelParams['ocr'].top_p,
        messages: [
/*           {
            role: 'system',
            content: system_prompt,
          }, */
          {
            role: "user",
            content: [
              { type: "text", text: user_prompt },
              ...imageParts,
            ],
          },
        ],
      });

      // @ts-ignore
      return response.choices?.[0]?.message?.content ?? '';
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }

  }

  async taskSummarize(originalText: string): Promise<string> {
    const user_prompt = this.getSummarizePrompt(originalText, modelRoles.user);

    if (this.model instanceof Mistral) {
      const response = await this.model.chat.complete({
        model: this.service.model_id,
        temperature: modelParams['summarize'].temperature,
        topP: modelParams['summarize'].top_p,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: user_prompt },
            ],
          },
        ],
      });

      // @ts-ignore
      return response.choices?.[0]?.message?.content ?? '';
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
    

  }
}

export class Mmllm_AlibabaCloud extends Mmllm implements IMmllm {

  imageSpecs: imageSpecs = {
    maxDimensions: 1000,
    maxPixels: 1000000,
    format: 'webp',
    mimeType: 'image/webp',
    outputType: 'DataURL'
  };

  private endpoint = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

  constructor(mmllmService: AIModel, apiKey: string, app: App | undefined = undefined) {
    super(mmllmService, apiKey, app);
  }

  init(): void {
    // Add your initialization logic here
    this.model = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.endpoint,
      dangerouslyAllowBrowser: true,
    });
  }

  async taskOCR(): Promise<string> {
    const user_prompt = this.getOCRPrompt(modelRoles.user)

    const imageParts: ChatCompletionContentPartImage[] = this.images
      .filter((image): image is string => typeof image === "string")
      .map(image => (
        { 
          type: 'image_url', 
          image_url: { 'url': image }
        }
      ));

      if (this.model instanceof OpenAI) {
        const response = await this.model.chat.completions.create({
          model: this.service.model_id,
          stream: false,
          temperature: modelParams['ocr'].temperature,
          top_p: modelParams['ocr'].top_p,
          messages: [
            { 
              role: 'user', 
              content: [{ type: 'text', text: user_prompt }, ...imageParts], 
            },
          ],
        });

        return response.choices?.[0]?.message?.content ?? '';
      }
      else {
        throw new Error(`Model is not an instance of ${this.service.interface}`);
      }
  }

  async taskSummarize(originalText: string): Promise<string> {
    const system_prompt = this.getSummarizePrompt(originalText, modelRoles.system);

    if (this.model instanceof OpenAI) {
      const response = await this.model.chat.completions.create({
        model: this.service.model_id,
        temperature: modelParams['summarize'].temperature,
        top_p: modelParams['summarize'].top_p,
        messages: [
          {
            role: 'system',
            content: system_prompt,
          },
          { role: 'user', 
            content: [{ type: 'text', text: originalText }],
          },
        ],
      });
    
      return response.choices?.[0]?.message?.content ?? '';
    } else {
      throw new Error(`Model is not an instance of ${this.service.interface}`);
    }
    

  }
}