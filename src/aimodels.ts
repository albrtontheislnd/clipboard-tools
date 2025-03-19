import { AIModel } from "./interfaces";

export const aiModelsList: AIModel[] = [
    {
        model_id: 'claude-3-7-sonnet-latest',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    {
        model_id: 'gemini-2.0-flash',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-2.0-flash-lite',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-1.5-flash-8b',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'gemini-1.5-flash',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
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
        model_id: 'mistral-small-latest',
        platform_id: 'Mistral',
        interface: 'Mmllm_Mistral',
    },
    {
        model_id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        platform_id: 'TogetherAI',
        interface: 'Mmllm_TogetherAI',
    },
    {
        model_id: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
        platform_id: 'TogetherAI',
        interface: 'Mmllm_TogetherAI',
    },
    {
        model_id: 'Qwen/Qwen2-VL-72B-Instruct',
        platform_id: 'TogetherAI',
        interface: 'Mmllm_TogetherAI',
    },
    {
        model_id: 'gpt-4o',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-4o-mini',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'chatgpt-4o-latest',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
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
    {
        model_id: 'grok-vision-beta',
        platform_id: 'xAI',
        interface: 'Mmllm_Grok',
    },
    {
        model_id: 'grok-2-vision-latest',
        platform_id: 'xAI',
        interface: 'Mmllm_Grok',
    }
];
