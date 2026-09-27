import { randomUUID } from "crypto";

export class Contrato {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;

  constructor(
    organizacaoId: string,
    dataAssinatura: Date,
    dataVencimento: Date,
    valorMensal: number,
    clausulas: string[] = [],
    renovacaoAutomatica: boolean = true,
  ) {
    this.id = randomUUID();
    this.organizacaoId = organizacaoId;
    this.dataAssinatura = dataAssinatura;
    this.dataVencimento = dataVencimento;
    this.valorMensal = valorMensal;
    this.clausulas = clausulas;
    this.renovacaoAutomatica = renovacaoAutomatica;
  }

  estaVigente(): boolean {
    return new Date() <= this.dataVencimento;
  }

  renovar(novoVencimento: Date): void {
    this.dataVencimento = novoVencimento;
  }
}
