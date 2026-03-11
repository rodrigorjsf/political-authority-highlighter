import type { TransparenciaExpense, ExpenseUpsert } from '../types.js'

/**
 * Transforms a Portal da Transparencia expense into a unified ExpenseUpsert.
 * Amount is kept as string for Drizzle numeric(12,2) column compatibility.
 */
export function transformTransparenciaExpense(
  raw: TransparenciaExpense,
  politicianId: string,
  source: 'camara' | 'senado',
): ExpenseUpsert {
  const date = new Date(raw.dataDocumento)
  return {
    politicianId,
    externalId: `transparencia-${raw.id}`,
    source,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    category: raw.tipoDespesa,
    supplierName: raw.nomeFornecedor,
    amount: raw.valorLiquido.toFixed(2), // Drizzle numeric stored as string
    documentNumber: raw.cpfCnpjFornecedor || null,
    sourceUrl: raw.urlDocumento || null,
  }
}
