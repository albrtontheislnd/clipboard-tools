import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile} from 'obsidian';
import ImgWebpOptimizerPlugin from './main';
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

import { createApp, App as VueApp } from 'vue';
import SuggestionItem from './components/SuggestionItem.vue';
import { latexCategories } from './latex_symbols/latexAll';
import { latexSuggestion } from './latex_symbols/interfaces';





export class LatexSuggest extends EditorSuggest<latexSuggestion> {
    plugin: ImgWebpOptimizerPlugin;
    vueApps: Map<HTMLElement, VueApp> = new Map();
    allLatexSymbols: Record<string, { symbol: string; category: string }>;

    constructor(app: App, plugin: ImgWebpOptimizerPlugin) {
        super(app);
        this.plugin = plugin;
        this.allLatexSymbols = {};
        this.populateLatexSymbols();
    }

    populateLatexSymbols() {
        // loop through each category and add symbols to LATEX_SYMBOLS
        for (const [category, symbols] of Object.entries(latexCategories)) {
            for (const symbol of symbols) {
                const command = symbol.latex.replace(/^\\/, ''); // Remove leading backslash
                this.allLatexSymbols[command] = {
                    symbol: symbol.display,
                    category: category
                };
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {

        // Check if cursor is in a math block
        const isInMath = this.isInMath(editor, cursor);

        if (!isInMath) {
            return null;
        }

        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);
        
        // Match backslash followed by word characters
        const match = textBeforeCursor.match(/\\(\w*)$/);
        
        if (match) {
            return {
                start: { line: cursor.line, ch: cursor.ch - match[0].length },
                end: cursor,
                query: match[1], // The text after the backslash
            };
        }
        
        return null;
    }



    isInMath(editor: Editor, cursor: EditorPosition): boolean {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const view = (editor as any).cm;
        if (!view) return false;

        const offset = editor.posToOffset(cursor);
        let node: SyntaxNode | undefined = syntaxTree(view.state).resolveInner(offset, -1);

        while (node) {
            const name = node.name;

            // Inner math grammar
            if (name.startsWith("math_") 
                || name.startsWith("formatting_formatting-math") 
                || name === "formatting-escape_hmd-escape-backslash" 
                || name === "error_math") {
                return true;
            }
            node = node.parent ?? undefined;
        }

        return false;

    }


    getSuggestions(context: EditorSuggestContext): latexSuggestion[] {
        const query = context.query.toLowerCase();
        const suggestions: latexSuggestion[] = [];
        
        for (const [command, data] of Object.entries(this.allLatexSymbols)) {
            if (command.toLowerCase().startsWith(query)) {
                suggestions.push({ 
                    command, 
                    symbol: data.symbol,
                    category: data.category
                });
            }
        }
        
        return suggestions.sort((a, b) => a.command.length - b.command.length);
    }

    renderSuggestion(suggestion: latexSuggestion, el: HTMLElement): void {
        // Clean up any existing Vue app
        if (this.vueApps.has(el)) {
            this.vueApps.get(el)?.unmount();
            this.vueApps.delete(el);
        }

        // Create and mount Vue app
        const vueApp = createApp(SuggestionItem, {
            suggestion: suggestion,
            isSelected: el.hasClass('is-selected')
        });

        vueApp.mount(el);
        this.vueApps.set(el, vueApp);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectSuggestion(suggestion: latexSuggestion, _evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        
        const editor = this.context.editor;
        
        editor.replaceRange(
            `\\${suggestion.command}`,
            this.context.start,
            this.context.end
        );
    }

    // Clean up Vue apps when suggestions are closed
    close(): void {
        this.vueApps.forEach(app => app.unmount());
        this.vueApps.clear();
        super.close();
    }

}





