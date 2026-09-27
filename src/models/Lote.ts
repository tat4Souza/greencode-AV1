import { randomUUID } from "crypto";
import { StatusLote, StatusRastreamento } from "../types/Enums.ts";
import { Equipamento } from "./Equipamento.ts";

export class Lote {
  id: string;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  equipamentos: Equipamento[];
  statusProcessamento: StatusLote;
  observacoes: string;

  constructor(
    dataEntrada: Date,
    organizacaoId: string,
    notaFiscal: string,
    transportadora: string,
    observacoes: string = "",
  ) {
    this.id = randomUUID();
    this.dataEntrada = dataEntrada;
    this.organizacaoId = organizacaoId;
    this.notaFiscal = notaFiscal;
    this.transportadora = transportadora;
    this.equipamentos = [];
    this.statusProcessamento = StatusLote.RECEBIDO;
    this.observacoes = observacoes;
  }

  adicionarEquipamento(equip: Equipamento): void {
    this.equipamentos.push(equip);
  }

  removerEquipamento(equipId: string): boolean {
    const totalAntes = this.equipamentos.length;
    this.equipamentos = this.equipamentos.filter((e) => e.id !== equipId);
    return this.equipamentos.length < totalAntes;
  }

  calcularPesoTotal(): number {
    return this.equipamentos.reduce((acc, eq) => acc + eq.pesoQuilogramas, 0);
  }

  gerarRelatorioTriagem(): string {
    const totalItens = this.equipamentos.length;
    const pesoTotal = this.calcularPesoTotal();
    const itensTriados = this.equipamentos.filter(
      (e) => e.statusRastreamento !== StatusRastreamento.AGUARDANDO_TRIAGEM,
    ).length;

    return (
      `Relatório de Triagem - Lote ${this.id} (NF: ${this.notaFiscal})\n` +
      `Status: ${this.statusProcessamento}\n` +
      `Total de Itens: ${totalItens} | Triados: ${itensTriados}\n` +
      `Peso Total: ${pesoTotal.toFixed(2)} kg\n` +
      `Transportadora: ${this.transportadora}`
    );
  }
}
