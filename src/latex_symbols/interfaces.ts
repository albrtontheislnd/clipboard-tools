export interface latexSymbol {
  display: string;
  latex: string;
  tooltip: string;
}

export interface latexSuggestion {
    command: string;
    symbol: string;
    category: string;
}