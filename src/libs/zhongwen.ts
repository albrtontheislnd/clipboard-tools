
export function zhongwenTasks(task: string, providedText: string) {
  let prompt = '';
  let system = '';

  switch (task) {
    case 'grammar':
      prompt = `
Explain the following Chinese grammar point in clear, accurate English:

Grammar Point: ${providedText}.

Your explanation must be written in Markdown and include the following sections:

1. Meaning: Explain what the grammar point expresses conceptually.

2. Usage: Describe how and when it is used, including common sentence patterns if applicable.

3. Example Sentences

Provide at least 3 examples presented in a Markdown table with the following columns: Chinese, Pinyin (tone marks), English.
		
Ensure:
Pinyin uses tone marks (e.g. nǐ hǎo)
English translations are natural, not word-for-word

4. Common Mistakes: List typical learner mistakes and explain why they are incorrect.

5. Notes
Add nuances, register (spoken vs written), comparisons with similar grammar points, or special usage restrictions.
Use clear headings, clean tables, accurate tone-mark pinyin, and learner-friendly explanations. 
Avoid unnecessary linguistic jargon unless briefly explained.
      `;
      system = 'You are a Chinese language teacher explaining Chinese grammar to English-speaking learners.';
      break;
    case 'word-usage-en':
      prompt = `
Explain **concisely** the Chinese word **${providedText}** in **English**, using the **style and structure of a Learner’s Dictionary** (e.g. Oxford / Cambridge).

### Requirements
- Output **Markdown text only**
- Use **clear, simple English** suitable for learners
- Be **concise but precise**

### Structure
1. **Headword** (Chinese) with pinyin
2. **Part of Speech**
3. **English Definition**
4. **Usage Notes**
   - Typical context
   - Tone (positive / neutral / negative)
   - Common collocations or subjects
5. **Chinese Example Sentences**
   - At least **2 examples**
   - Each example should be **natural, modern Chinese**
   - Provide **English gloss or translation** for each example

### Constraints
- Do **not** include pinyin unless it is necessary for clarity
- Do **not** include long cultural essays
- Avoid overly academic language

Focus on helping an **English-speaking learner** understand how **${providedText}** is actually used in real Chinese.      
      `;
      system = 'You are a bilingual Chinese–English lexicography assistant.';
      break;
    case 'word-usage-vi':
      prompt = `
Explain **concisely** the Chinese word **${providedText}** in **Vietnamese**, using the **style and structure of a Learner’s Dictionary** (e.g. Oxford / Cambridge).

### Requirements
- Output **Markdown text only**
- Use **clear Vietnamese** suitable for learners
- Be **concise but precise**

### Structure
1. **Headword** (Chinese) with pinyin
2. **Part of Speech**
3. **Vietnamese Definition**
4. **Usage Notes**
   - Typical context
   - Tone (positive / neutral / negative)
   - Common collocations or subjects
5. **Chinese Example Sentences**
   - At least **2 examples**
   - Each example should be **natural, modern Chinese**
   - Provide **Vietnamese gloss or translation** for each example

### Constraints
- Do **not** include pinyin unless it is necessary for clarity
- Do **not** include long cultural essays
- Avoid overly academic language

Focus on helping an **Vietnamese-speaking learner** understand how **${providedText}** is actually used in real Chinese.      
      `;
      system = 'You are a bilingual Chinese–Vietnamese lexicography assistant.';
      break;
    case 'explain':
      prompt = `
For the following Chinese sentences, do the following:

Provide an accurate English translation.
Explain key grammar points in English, including:
- Sentence structure
- Important particles (e.g. 了, 的, 得, 过, 把, 被, etc.)
- Verb complements, aspect markers, and word order
- Any idiomatic or non-literal usage
- Highlight common learner pitfalls related to these sentences (if any).

Chinese text: ${providedText}      
      `;
      system = 'You are a Chinese–English language tutor. Keep explanations clear, concise, and suitable for intermediate Chinese learners.';
  }

  return {
    prompt,
    providedText,
    system
  };
}