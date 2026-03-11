import type { Logger } from 'pino'

/** Government data sources supported by the pipeline. */
export enum DataSource {
  CAMARA = 'camara',
  SENADO = 'senado',
  TRANSPARENCIA = 'transparencia',
  TSE = 'tse',
  TCU = 'tcu',
  CGU = 'cgu',
}

/** Context passed to adapters and transformers during a pipeline run. */
export interface AdapterContext {
  source: DataSource
  logger: Logger
  timestamp: Date
}

/** Raw Camara API deputy shape. */
export interface CamaraDeputy {
  id: number
  uri: string
  nome: string
  siglaPartido: string
  uriPartido: string
  siglaUf: string
  idLegislatura: number
  urlFoto: string
  email: string
}

/** Raw Camara API bill shape. */
export interface CamaraBill {
  id: number
  uri: string
  siglaTipo: string
  codTipo: number
  numero: number
  ano: number
  ementa: string
}

/** Raw Camara API vote shape. */
export interface CamaraVote {
  uriVotacao: string
  data: string
  dataHoraRegistro: string
  siglaOrgao: string
  descricao: string
  aprovacao: number
}

/** Raw Senado API senator shape. */
export interface SenadorData {
  CodigoParlamentar: string
  NomeParlamentar: string
  NomeCompletoParlamentar: string
  SiglaPartidoParlamentar: string
  UfParlamentar: string
  UrlFotoParlamentar: string
  EmailParlamentar: string
}

/** Raw Portal da Transparencia expense shape. */
export interface TransparenciaExpense {
  id: number
  dataDocumento: string
  valorDocumento: number
  valorLiquido: number
  nomeFornecedor: string
  cpfCnpjFornecedor: string
  tipoDespesa: string
  urlDocumento: string
}

/** Raw TSE candidate CSV row. */
export interface TSECandidate {
  SQ_CANDIDATO: string
  NM_CANDIDATO: string
  NR_CPF_CANDIDATO: string
  SG_PARTIDO: string
  SG_UF: string
  DS_CARGO: string
  NR_ANO_ELEICAO: string
  DS_SIT_TOT_TURNO: string
}

/** Raw TCU exclusion record. */
export interface TCUExclusion {
  cpf: string
  nome: string
  tipoSancao: string
  dataTransitoJulgado: string
  orgao: string
}

/** Raw CGU exclusion CSV row. */
export interface CGUExclusion {
  CPF_SERVIDOR: string
  NOME_SERVIDOR: string
  TIPO_PUNICAO: string
  DATA_PUBLICACAO: string
  PORTARIA: string
}

/** Unified politician data ready for upsert into public schema. */
export interface PoliticianUpsert {
  externalId: string
  source: string
  name: string
  slug: string
  state: string
  party: string
  role: string
  photoUrl: string | null
  tenureStartDate: string | null
}

/** Unified bill data ready for upsert. */
export interface BillUpsert {
  politicianId: string
  externalId: string
  source: string
  title: string
  billType: string
  billNumber: string
  billYear: number
  status: string
  submissionDate: string
  sourceUrl: string | null
}

/** Unified vote data ready for upsert. */
export interface VoteUpsert {
  politicianId: string
  externalId: string
  source: string
  sessionDate: string
  matterDescription: string
  voteCast: string
  sessionResult: string
  sourceUrl: string | null
}

/** Unified expense data ready for upsert. */
export interface ExpenseUpsert {
  politicianId: string
  externalId: string
  source: string
  year: number
  month: number
  category: string
  supplierName: string
  amount: string // numeric(12,2) stored as string for Drizzle
  documentNumber: string | null
  sourceUrl: string | null
}
