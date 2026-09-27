import { JournalTransacao } from "../core/JournalTransacao.ts";
import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { Equipamento } from "../models/Equipamento.ts";
import { Lote } from "../models/Lote.ts";

import {
  EstadoFisico,
  StatusLote,
  StatusRastreamento,
  TipoEquipamento,
} from "../types/Enums.ts";
import { HistoricoCompleto } from "../types/Interfaces.ts";

const HIERARQUIA_ESTADO: EstadoFisico[] = [
  EstadoFisico.NOVO,
  EstadoFisico.BOM_ESTADO,
  EstadoFisico.USADO_LEVE,
  EstadoFisico.USADO_MODERADO,
  EstadoFisico.DANIFICADO_LEVE,
  EstadoFisico.DANIFICADO_GRAVE,
  EstadoFisico.INSERVIVEL,
];

export class ServicoEquipamento {
  repositorio: RepositorioArquivo;
  private readonly ARQUIVO_LOTES = "lotes.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
  }

  rastrearEquipamento(id: string): HistoricoCompleto {
    const lotes = this.repositorio.listarEntidades<Lote>(this.ARQUIVO_LOTES);

    for (const lote of lotes) {
      const eq = lote.equipamentos?.find(
        (e) => e.id === id || e.codigoBarrasInterno === id,
      );
      if (eq) {
        return {
          equipamento: eq,
          loteId: lote.id,
          historico: eq.historicoMovimentacao || [],
        };
      }
    }

    throw new Error(`Equipamento com identificador "${id}" não encontrado.`);
  }

  atualizarEstadoFisico(
    id: string,
    novoEstado: EstadoFisico,
    justificativa?: string,
    responsavel: string = "SISTEMA",
  ): void {
    const lotes = this.repositorio.listarEntidades<Lote>(this.ARQUIVO_LOTES);
    let equipamentoEncontrado: Equipamento | null = null;
    let loteCorrespondente: Lote | null = null;

    for (const lote of lotes) {
      const eq = lote.equipamentos?.find(
        (e) => e.id === id || e.codigoBarrasInterno === id,
      );
      if (eq) {
        equipamentoEncontrado = new Equipamento(
          eq.codigoBarrasInterno,
          eq.tipo,
          eq.marca,
          eq.modelo,
          eq.anoFabricacao,
          eq.estadoFisico,
          eq.pesoQuilogramas,
          eq.loteId,
          eq.posicaoNoLote,
        );
        equipamentoEncontrado.id = eq.id;
        equipamentoEncontrado.statusRastreamento = eq.statusRastreamento;
        equipamentoEncontrado.historicoMovimentacao =
          eq.historicoMovimentacao || [];
        loteCorrespondente = lote;
        break;
      }
    }

    if (!equipamentoEncontrado || !loteCorrespondente) {
      throw new Error(`Equipamento com identificador "${id}" não encontrado.`);
    }

    const indexAtual = HIERARQUIA_ESTADO.indexOf(
      equipamentoEncontrado.estadoFisico,
    );
    const indexNovo = HIERARQUIA_ESTADO.indexOf(novoEstado);

    const diferencaRebaixamento = indexNovo - indexAtual;
    if (
      diferencaRebaixamento >= 2 &&
      (!justificativa || justificativa.trim().length === 0)
    ) {
      throw new Error(
        `Rebaixamento de 2 ou mais categorias (${equipamentoEncontrado.estadoFisico} -> ${novoEstado}) exige justificativa textual obrigatória.`,
      );
    }

    const dadosAntes = { estadoFisico: equipamentoEncontrado.estadoFisico };
    equipamentoEncontrado.estadoFisico = novoEstado;

    const obs = `Alteração para ${novoEstado}. Justificativa: ${justificativa || "N/A"}`;
    equipamentoEncontrado.registrarMovimentacao(
      "AVALIACAO_TECNICA",
      "ALMOXARIFADO",
      responsavel,
      obs,
    );

    new JournalTransacao(
      "ATUALIZAR_ESTADO_FISICO",
      "Equipamento",
      dadosAntes,
      { equipamentoId: equipamentoEncontrado.id, novoEstado, justificativa },
      responsavel,
    ).registrar();

    const indexEq = loteCorrespondente.equipamentos.findIndex(
      (e) => e.id === equipamentoEncontrado!.id,
    );
    loteCorrespondente.equipamentos[indexEq] = equipamentoEncontrado;

    this.repositorio.salvarEntidade(this.ARQUIVO_LOTES, loteCorrespondente);
  }

  movimentarEquipamento(
    id: string,
    novoStatus: StatusRastreamento,
    origem: string,
    destino: string,
    responsavel: string = "SISTEMA",
    observacao?: string,
  ): void {
    const lotes = this.repositorio.listarEntidades<Lote>(this.ARQUIVO_LOTES);
    let equipamentoEncontrado: Equipamento | null = null;
    let loteCorrespondente: Lote | null = null;

    for (const lote of lotes) {
      const eq = lote.equipamentos?.find(
        (e) => e.id === id || e.codigoBarrasInterno === id,
      );
      if (eq) {
        equipamentoEncontrado = new Equipamento(
          eq.codigoBarrasInterno,
          eq.tipo,
          eq.marca,
          eq.modelo,
          eq.anoFabricacao,
          eq.estadoFisico,
          eq.pesoQuilogramas,
          eq.loteId,
          eq.posicaoNoLote,
        );
        equipamentoEncontrado.id = eq.id;
        equipamentoEncontrado.statusRastreamento = eq.statusRastreamento;
        equipamentoEncontrado.historicoMovimentacao =
          eq.historicoMovimentacao || [];
        loteCorrespondente = lote;
        break;
      }
    }

    if (!equipamentoEncontrado || !loteCorrespondente) {
      throw new Error(`Equipamento com identificador "${id}" não encontrado.`);
    }

    const statusAnterior = equipamentoEncontrado.statusRastreamento;

    equipamentoEncontrado.atualizarStatus(novoStatus, observacao || "");

    equipamentoEncontrado.registrarMovimentacao(
      origem,
      destino,
      responsavel,
      observacao || `Transição: ${statusAnterior} -> ${novoStatus}`,
    );

    new JournalTransacao(
      "MOVIMENTAR_EQUIPAMENTO",
      "Equipamento",
      { statusRastreamento: statusAnterior },
      { equipamentoId: equipamentoEncontrado.id, novoStatus, origem, destino },
      responsavel,
    ).registrar();

    const indexEq = loteCorrespondente.equipamentos.findIndex(
      (e) => e.id === equipamentoEncontrado!.id,
    );
    loteCorrespondente.equipamentos[indexEq] = equipamentoEncontrado;

    this.repositorio.salvarEntidade(this.ARQUIVO_LOTES, loteCorrespondente);
  }

  gerarCodigoBarras(tipo: TipoEquipamento, sequencia: number): string {
    const prefixo = tipo.substring(0, 3).toUpperCase();
    const numeroFormatado = String(sequencia).padStart(6, "0");
    return `GC-${prefixo}-${numeroFormatado}`;
  }
}
