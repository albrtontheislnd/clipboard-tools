import { latexSymbol } from './interfaces';
import { relationsSymbols } from './relationsSymbols';
import { negatedRelations } from './negatedRelations';
import { miscellaneousSymbolsTwo } from './miscellaneousSymbolsTwo';
import { miscellaneousSymbols } from './miscellaneousSymbols';
import { mathModeAccents } from './mathModeAccents';
import { greekHebrewSymbols } from './greekHebrewSymbols';
import { arrowSymbols } from './arrowSymbols';
import { accentsDelimitersSymbols } from './accentsDelimitersSymbols';

export const latexCategories: Record<string, latexSymbol[]> = {
    'relations': relationsSymbols,
    'negation': negatedRelations,
    'misc2': miscellaneousSymbolsTwo,
    'misc1': miscellaneousSymbols,
    'accents': mathModeAccents,
    'greek': greekHebrewSymbols,
    'arrow': arrowSymbols,
    'delimiters': accentsDelimitersSymbols,
};