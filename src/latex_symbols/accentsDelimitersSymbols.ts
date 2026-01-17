import { latexSymbol } from "./interfaces";

export const accentsDelimitersSymbols: latexSymbol[] = 
      [
        { display: 'a/x', latex: '\\frac{abc}{xyz}', tooltip: '\\frac{abc}{xyz}' },
        { display: 'c̅', latex: '\\overline{abc}', tooltip: '\\overline{abc}' },
        { display: 'c→', latex: '\\overrightarrow{abc}', tooltip: '\\overrightarrow{abc}' },
        { display: 'c_', latex: '\\underline{abc}', tooltip: '\\underline{abc}' },
        { display: 'c←', latex: '\\overleftarrow{abc}', tooltip: '\\overleftarrow{abc}' },
        { display: '√a', latex: '\\sqrt{abc}', tooltip: '\\sqrt{abc}' },
        { display: 'â', latex: '\\widehat{abc}', tooltip: '\\widehat{abc}' },
        { display: 'c⏜', latex: '\\overbrace{abc}', tooltip: '\\overbrace{abc}' },

        { display: 'ⁿ√a', latex: '\\sqrt[n]{abc}', tooltip: '\\sqrt[n]{abc}' },
        { display: 'c~', latex: '\\widetilde{abc}', tooltip: '\\widetilde{abc}' },
        { display: 'c⏝', latex: '\\underbrace{abc}', tooltip: '\\underbrace{abc}' },
        { display: '|', latex: '\\vert', tooltip: '\\vert' },
        { display: '⌊', latex: '\\lfloor', tooltip: '\\lfloor' },
        { display: '⇑', latex: '\\Uparrow', tooltip: '\\Uparrow' },
        { display: '⌜', latex: '\\llcorner', tooltip: '\\llcorner' },
        { display: '↑', latex: '\\uparrow', tooltip: '\\uparrow' },
        { display: '⌝', latex: '\\lrcorner', tooltip: '\\lrcorner' },

        { display: '‖', latex: '\\Vert', tooltip: '\\Vert' },
        { display: '⟨', latex: '\\langle', tooltip: '\\langle' },
        { display: '⇓', latex: '\\Downarrow', tooltip: '\\Downarrow' },
        { display: '⟩', latex: '\\rangle', tooltip: '\\rangle' },
        { display: '↓', latex: '\\downarrow', tooltip: '\\downarrow' },
        { display: '∑', latex: '\\sum', tooltip: '\\sum' },
        { display: '∫', latex: '\\int', tooltip: '\\int' },
        { display: '⨁', latex: '\\bigoplus', tooltip: '\\bigoplus' },
        { display: '⋁', latex: '\\bigvee', tooltip: '\\bigvee' },

        { display: '∏', latex: '\\prod', tooltip: '\\prod' },
        { display: '∮', latex: '\\oint', tooltip: '\\oint' },
        { display: '⋂', latex: '\\bigcap', tooltip: '\\bigcap' },
        { display: '⨂', latex: '\\bigotimes', tooltip: '\\bigotimes' },
        { display: '⋀', latex: '\\bigwedge', tooltip: '\\bigwedge' },
        { display: '∐', latex: '\\coprod', tooltip: '\\coprod' },
        { display: '∬', latex: '\\iint', tooltip: '\\iint' },
        { display: '⋃', latex: '\\bigcup', tooltip: '\\bigcup' },
        { display: '⨀', latex: '\\bigodot', tooltip: '\\bigodot' },
        { display: '⨆', latex: '\\bigsqcup', tooltip: '\\bigsqcup' },
];
