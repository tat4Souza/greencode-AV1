import { Equipamento } from "../models/Equipamento.ts";
import { Movimentacao } from "../models/Movimentacao.ts";

export interface Autenticavel {
  autenticar(usuario: string, senha: string): boolean;
  renovarToken(): string;
}

export interface HistoricoCompleto {
  equipamento: Equipamento;
  loteId: string;
  historico: Movimentacao[];
}

export interface IParametrosGlobais {
  id: string;
  aliquotaImposto: number;
  coeficienteDepreciacaoAnual: number;
  dataAtualizacao: Date;
  atualizadoPor: string;
}

export interface ComandoParsed {
  acaoPrincipal: string;
  argumentos: string[];
  flags: Record<string, string>;
}
