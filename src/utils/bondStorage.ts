import { z } from 'zod';
import type { BondInput } from 'rates-calculator/bonds';
import { downloadBlob } from '@/utils/download';

const STORAGE_KEY = 'rc.savedBonds';
const EXPORT_VERSION = 1;

const bondInputSchema = z.object({
    bondType: z.enum(['regular', 'indexed']),
    nominal: z.number(),
    purchasePrice: z.number(),
    startDate: z.string(),
    settlementDate: z.string(),
    maturityDate: z.string(),
    couponRatePercent: z.number(),
    // Defaulted so bonds saved before these fields existed still load.
    couponTaxPercent: z.number().default(0),
    purchaseCosts: z.number().default(0),
    couponDates: z.array(z.string()),
    baseIndex: z.number(),
    currentIndex: z.number()
    // Input is `unknown` (not BondInput) because defaulted fields make those keys optional on input.
}) satisfies z.ZodType<BondInput, z.ZodTypeDef, unknown>;

const savedBondSchema = z.object({
    name: z.string(),
    input: bondInputSchema
});

const collectionSchema = z.array(savedBondSchema);

const exportSchema = z.object({
    version: z.number(),
    bonds: collectionSchema
});

export interface SavedBond {
    name: string;
    input: BondInput;
}

/** Read all saved bonds; returns an empty list if storage is missing or malformed. */
export function listBonds(): SavedBond[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return collectionSchema.parse(JSON.parse(raw));
    } catch {
        return [];
    }
}

function writeBonds(bonds: SavedBond[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bonds));
}

/** Save (or overwrite) a bond config by name. Returns the updated collection. */
export function saveBond(name: string, input: BondInput): SavedBond[] {
    const trimmed = name.trim();
    const bonds = listBonds().filter((b) => b.name !== trimmed);
    bonds.push({ name: trimmed, input });
    bonds.sort((a, b) => a.name.localeCompare(b.name));
    writeBonds(bonds);
    return bonds;
}

/** Delete a bond config by name. Returns the updated collection. */
export function deleteBond(name: string): SavedBond[] {
    const bonds = listBonds().filter((b) => b.name !== name);
    writeBonds(bonds);
    return bonds;
}

/** Download all saved bonds as a JSON file. */
export function exportBonds(): void {
    const payload = { version: EXPORT_VERSION, bonds: listBonds() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8;'
    });
    downloadBlob(blob, 'bonds.json');
}

/**
 * Merge bonds from an exported JSON string into local storage (imported names replace existing).
 * Throws on malformed input. Returns the updated collection.
 */
export function importBonds(json: string): SavedBond[] {
    const parsed = exportSchema.parse(JSON.parse(json));
    const byName = new Map<string, SavedBond>();
    for (const b of listBonds()) byName.set(b.name, b);
    for (const b of parsed.bonds) byName.set(b.name, b);
    const merged = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    writeBonds(merged);
    return merged;
}
