export interface Symbol {
  display: string;
  latex: string;
  tooltip: string;
}

export interface SymbolTab {
  id: string;
  label: string;
  symbols: Symbol[][];
}