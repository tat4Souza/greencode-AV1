import { Equipamento } from "../../models/Equipamento.ts";
import { Sessao } from "../../models/Usuario/Sessao.ts";
import { ServicoEquipamento } from "../../services/ServicoEquipamento.ts";
import { ServicoLote } from "../../services/ServicoLote.ts";
import {
  EstadoFisico,
  StatusRastreamento,
  TipoEquipamento,
} from "../../types/Enums.ts";
import { ComandoParsed } from "../../types/Interfaces.ts";
import { ConsoleLogger } from "../ConsoleLogger.ts";

export class GestorHandler {
  constructor(
    private servicoLote: ServicoLote,
    private servicoEquip: ServicoEquipamento,
  ) {}

  async processar(cmd: ComandoParsed, sessao: Sessao): Promise<void> {
    if (cmd.acaoPrincipal === "lote criar") {
      const { org, nf, transp, obs, data } = cmd.flags;
      if (!org || !nf || !transp) {
        throw new Error(
          "Uso: lote criar --org <id> --nf <numero> --transp <nome> [--obs <texto>] [--data <AAAA-MM-DD>]",
        );
      }

      let dataEntrada = new Date();
      if (data) {
        const dataInformada = new Date(data);
        if (isNaN(dataInformada.getTime())) {
          throw new Error(
            `Data "${data}" inválida. Utilize o formato AAAA-MM-DD.`,
          );
        }
        dataEntrada = dataInformada;
      }

      const lote = this.servicoLote.criarLote(
        {
          dataEntrada,
          organizacaoId: org,
          notaFiscal: nf,
          transportadora: transp,
          observacoes: obs || "",
        },
        sessao.usuario,
      );
      ConsoleLogger.sucesso(
        `Lote criado com sucesso! ID: ${lote.id} | Status: ${lote.statusProcessamento}`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "equipamento adicionar") {
      const { lote, tipo, marca, modelo, ano, peso } = cmd.flags;
      if (!lote || !tipo || !marca || !modelo || !ano || !peso) {
        throw new Error(
          "Uso: equipamento adicionar --lote <id> --tipo <TIPO> --marca <m> --modelo <mod> --ano <ano> --peso <kg>",
        );
      }

      if (
        !Object.values(TipoEquipamento).includes(
          tipo.toUpperCase() as TipoEquipamento,
        )
      ) {
        throw new Error(
          `Tipo inválido "${tipo}". Valores aceitos: ${Object.values(TipoEquipamento).join(", ")}`,
        );
      }

      const tipoEnum = tipo.toUpperCase() as TipoEquipamento;
      const codigoBarras = this.servicoEquip.gerarCodigoBarras(
        tipoEnum,
        Date.now() % 1000000,
      );
      const equip = new Equipamento(
        codigoBarras,
        tipoEnum,
        marca,
        modelo,
        Number(ano),
        EstadoFisico.BOM_ESTADO,
        Number(peso),
        lote,
        0,
      );
      this.servicoLote.adicionarEquipamentoLote(lote, equip, sessao.usuario);
      ConsoleLogger.sucesso(
        `Equipamento registrado com sucesso! Código gerado: ${codigoBarras}`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "lote triagem") {
      const { id } = cmd.flags;
      if (!id) throw new Error("Uso: lote triagem --id <loteId>");
      this.servicoLote.processarTriagem(id, sessao.usuario);
      ConsoleLogger.sucesso(`Triagem do lote "${id}" concluída com sucesso.`);
      return;
    }

    if (cmd.acaoPrincipal === "equipamento estado") {
      const { id, estado, justificativa } = cmd.flags;
      if (!id || !estado)
        throw new Error(
          "Uso: equipamento estado --id <codigoOuId> --estado <ESTADO> [--justificativa <texto>]",
        );

      if (
        !Object.values(EstadoFisico).includes(
          estado.toUpperCase() as EstadoFisico,
        )
      ) {
        throw new Error(
          `Estado físico inválido "${estado}". Valores aceitos: ${Object.values(EstadoFisico).join(", ")}`,
        );
      }

      this.servicoEquip.atualizarEstadoFisico(
        id,
        estado.toUpperCase() as EstadoFisico,
        justificativa || "",
        sessao.usuario,
      );
      ConsoleLogger.sucesso(
        `Estado físico de [${id}] atualizado para ${estado.toUpperCase()}.`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "equipamento movimentar") {
      const { id, status, origem, destino, obs } = cmd.flags;
      if (!id || !status)
        throw new Error(
          "Uso: equipamento movimentar --id <codigo> --status <STATUS> [--origem <local>] [--destino <local>] [--obs <texto>]",
        );

      if (
        !Object.values(StatusRastreamento).includes(
          status.toUpperCase() as StatusRastreamento,
        )
      ) {
        throw new Error(
          `Status de rastreamento inválido "${status}". Valores aceitos: ${Object.values(StatusRastreamento).join(", ")}`,
        );
      }

      this.servicoEquip.movimentarEquipamento(
        id,
        status.toUpperCase() as StatusRastreamento,
        origem || "ALMOXARIFADO",
        destino || "AREA_DESMONTE",
        sessao.usuario,
        obs,
      );
      ConsoleLogger.sucesso(
        `Equipamento [${id}] movimentado com sucesso para o status: ${status.toUpperCase()}.`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "equipamento rastrear") {
      const { id } = cmd.flags;
      if (!id) throw new Error("Uso: equipamento rastrear --id <codigoOuId>");
      const dados = this.servicoEquip.rastrearEquipamento(id);
      ConsoleLogger.info(
        `Rastreio do Equipamento ${dados.equipamento.codigoBarrasInterno} | Status: ${dados.equipamento.statusRastreamento}`,
      );
      dados.historico.forEach((m: any, i: number) =>
        console.log(
          `  ${i + 1}. [${new Date(m.dataHora).toLocaleString()}] ${m.origem} -> ${m.destino} (${m.responsavel})`,
        ),
      );
      return;
    }

    throw new Error(
      `Comando "${cmd.acaoPrincipal}" não reconhecido para Gestor de Almoxarifado.`,
    );
  }
}
