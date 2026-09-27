import { randomUUID } from "crypto";
import {
  EstadoFisico,
  StatusRastreamento,
  TipoEquipamento,
} from "../types/Enums.ts";
import { Movimentacao } from "./Movimentacao.ts";

export class Equipamento {
  id: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  historicoMovimentacao: Movimentacao[];

  constructor(
    codigoBarrasInterno: string,
    tipo: TipoEquipamento,
    marca: string,
    modelo: string,
    anoFabricacao: number,
    estadoFisico: EstadoFisico,
    pesoQuilogramas: number,
    loteId: string,
    posicaoNoLote: number,
  ) {
    this.id = randomUUID();
    this.codigoBarrasInterno = codigoBarrasInterno;
    this.tipo = tipo;
    this.marca = marca;
    this.modelo = modelo;
    this.anoFabricacao = anoFabricacao;
    this.estadoFisico = estadoFisico;
    this.pesoQuilogramas = pesoQuilogramas;
    this.loteId = loteId;
    this.posicaoNoLote = posicaoNoLote;
    this.statusRastreamento = StatusRastreamento.AGUARDANDO_TRIAGEM;
    this.historicoMovimentacao = [];
  }

  atualizarStatus(
    novoStatus: StatusRastreamento,
    justificativa: string = "",
  ): void {
    const exigeTriagemPrevia =
      novoStatus === StatusRastreamento.EM_DESMONTE ||
      novoStatus === StatusRastreamento.AGUARDANDO_DESMONTE;

    if (exigeTriagemPrevia) {
      const aindaNaoTriado =
        this.statusRastreamento === StatusRastreamento.AGUARDANDO_TRIAGEM;

      if (aindaNaoTriado) {
        throw new Error(
          "Equipamento só pode ser encaminhado para desmonte após triagem completa.",
        );
      }
    }

    this.statusRastreamento = novoStatus;
  }

  registrarMovimentacao(
    origem: string,
    destino: string,
    responsavel: string,
    observacao: string = "",
  ): void {
    const mov = new Movimentacao(
      this.id,
      origem,
      destino,
      responsavel,
      observacao,
    );
    this.historicoMovimentacao.push(mov);
  }

  calcularDepreciacao(): number {
    const anoAtual = new Date().getFullYear();
    const idadeAnos = anoAtual - this.anoFabricacao;
    return Math.min(idadeAnos * 0.2, 0.9);
  }
}
