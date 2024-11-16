import { AIModel } from "./interfaces";

export const aiModelsList: AIModel[] = [
    {
        model_id: 'claude-3-5-sonnet-20241022',
        platform_id: 'Anthropic',
        interface: 'Mmllm_Anthropic',
    },
    {
        model_id: 'gemini-1.5-flash',
        platform_id: 'Google',
        interface: 'Mmllm_GoogleGenerativeAI',
    },
    {
        model_id: 'pixtral-12b-2409',
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
        model_id: 'meta-llama/Llama-Vision-Free',
        platform_id: 'TogetherAI',
        interface: 'Mmllm_TogetherAI',
    },
    {
        model_id: 'gpt-4o-mini-2024-07-18',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    },
    {
        model_id: 'gpt-4o-2024-08-06',
        platform_id: 'OpenAI',
        interface: 'Mmllm_OpenAI',
    }
];
