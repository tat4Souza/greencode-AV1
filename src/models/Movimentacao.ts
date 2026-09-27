import { randomUUID } from "crypto";

export class Movimentacao {
  id: string;
  equipamentoId: string;
  dataHora: Date;
  origem: string;
  destino: string;
  responsavel: string;
  observacao: string;

  constructor(
    equipamentoId: string,
    origem: string,
    destino: string,
    responsavel: string,
    observacao: string = "",
  ) {
    this.id = randomUUID();
    this.equipamentoId = equipamentoId;
    this.dataHora = new Date();
    this.origem = origem;
    this.destino = destino;
    this.responsavel = responsavel;
    this.observacao = observacao;
  }
}
