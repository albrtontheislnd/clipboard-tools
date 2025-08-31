import { AIModel } from "./interfaces";

export const aiModelsList: AIModel[] = [
    // Claude
    {
        model_id: 'claude-3-haiku-20240307',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    {
        model_id: 'claude-3-5-haiku-latest',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    {
        model_id: 'claude-3-7-sonnet-latest',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    {
        model_id: 'claude-sonnet-4-0',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    // Gemini
    {
        model_id: 'gemini-2.5-flash-lite',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-2.0-flash-lite',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-2.0-flash',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-2.5-flash',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-1.5-flash-8b-latest',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-1.5-flash-latest',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    // Mistral
    {
        model_id: 'pixtral-12b-latest',
        platform_id: 'Mistral',
        interface: 'Mmllm_Mistral',
    },
    {
        model_id: 'pixtral-large-latest',
        platform_id: 'Mistral',
        interface: 'Mmllm_Mistral',
    },
    {
        model_id: 'mistral-medium-latest',
        platform_id: 'Mistral',
        interface: 'Mmllm_Mistral',
    },
    {
        model_id: 'mistral-small-latest',
        platform_id: 'Mistral',
        interface: 'Mmllm_Mistral',
    },
    // OpenAI
    {
        model_id: 'gpt-4o-mini',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-4.1-nano',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-4.1-mini',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-5-mini',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-5-nano',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'o4-mini',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    // Qwen
    {
        model_id: 'qwen-vl-plus',
        platform_id: 'AlibabaCloud',
        interface: 'Mmllm_AlibabaCloud',
    },
    {
        model_id: 'qwen-vl-max',
        platform_id: 'AlibabaCloud',
        interface: 'Mmllm_AlibabaCloud',
    },
/*     {
        model_id: 'grok-vision-beta',
        platform_id: 'xAI',
        interface: 'Mmllm_Grok',
    },
    {
        model_id: 'grok-2-vision-latest',
        platform_id: 'xAI',
        interface: 'Mmllm_Grok',
    } */
];
