import { IParametrosGlobais } from "../types/Interfaces.ts";

export class ParametrosGlobais implements IParametrosGlobais {
  id: string = "SISTEMA_PARAMETROS";
  aliquotaImposto: number;
  coeficienteDepreciacaoAnual: number;
  dataAtualizacao: Date;
  atualizadoPor: string;

  constructor(
    aliquotaImposto: number = 10,
    coeficienteDepreciacaoAnual: number = 15,
    atualizadoPor: string = "SISTEMA",
  ) {
    this.aliquotaImposto = aliquotaImposto;
    this.coeficienteDepreciacaoAnual = coeficienteDepreciacaoAnual;
    this.dataAtualizacao = new Date();
    this.atualizadoPor = atualizadoPor;
  }
}
