import { z } from 'zod';
import type { BondInput } from 'rates-calculator/bonds';
import { downloadBlob } from '@/utils/download';

const EXPORT_VERSION = 1;

const bondInputSchema = z.object({
    // Defaulted so configs saved before a field existed still load.
    instrument: z.enum(['bond', 'token']).default('bond'),
    bondType: z.enum(['regular', 'indexed']),
    nominal: z.number(),
    priceMode: z.enum(['price', 'ytm']).default('price'),
    purchasePrice: z.number(),
    targetYtmPercent: z.number().default(0),
    startDate: z.string(),
    settlementDate: z.string(),
    maturityDate: z.string(),
    couponRatePercent: z.number(),
    couponTaxPercent: z.number().default(0),
    quantity: z.number().default(1),
    purchaseCosts: z.number().default(0),
    couponDates: z.array(z.string()),
    baseIndex: z.number(),
    currentIndex: z.number()
    // Input is `unknown` (not BondInput) because defaulted fields make those keys optional on input.
}) satisfies z.ZodType<BondInput, z.ZodTypeDef, unknown>;

const savedSchema = z.object({ name: z.string(), input: bondInputSchema });
const collectionSchema = z.array(savedSchema);
const exportSchema = z.object({ version: z.number(), items: collectionSchema });

export interface SavedInstrument {
    name: string;
    input: BondInput;
}

export interface InstrumentStore {
    list: () => SavedInstrument[];
    save: (name: string, input: BondInput) => SavedInstrument[];
    remove: (name: string) => SavedInstrument[];
    exportAll: () => void;
    import: (json: string) => SavedInstrument[];
}

/**
 * Build a localStorage-backed store for saved instrument configurations under a given key.
 * Bonds and tokens use separate keys (and therefore separate saved lists and export files).
 */
export function createInstrumentStore(storageKey: string, fileName: string): InstrumentStore {
    const list = (): SavedInstrument[] => {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];
        try {
            return collectionSchema.parse(JSON.parse(raw));
        } catch {
            return [];
        }
    };

    const write = (items: SavedInstrument[]): void => {
        localStorage.setItem(storageKey, JSON.stringify(items));
    };

    const save = (name: string, input: BondInput): SavedInstrument[] => {
        const trimmed = name.trim();
        const items = list().filter((i) => i.name !== trimmed);
        items.push({ name: trimmed, input });
        items.sort((a, b) => a.name.localeCompare(b.name));
        write(items);
        return items;
    };

    const remove = (name: string): SavedInstrument[] => {
        const items = list().filter((i) => i.name !== name);
        write(items);
        return items;
    };

    const exportAll = (): void => {
        const payload = { version: EXPORT_VERSION, items: list() };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json;charset=utf-8;'
        });
        downloadBlob(blob, fileName);
    };

    const importJson = (json: string): SavedInstrument[] => {
        const parsed = exportSchema.parse(JSON.parse(json));
        const byName = new Map<string, SavedInstrument>();
        for (const i of list()) byName.set(i.name, i);
        for (const i of parsed.items) byName.set(i.name, i);
        const merged = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
        write(merged);
        return merged;
    };

    return { list, save, remove, exportAll, import: importJson };
}

export const bondStore = createInstrumentStore('rc.savedBonds', 'bonds.json');
export const tokenStore = createInstrumentStore('rc.savedTokens', 'tokens.json');
