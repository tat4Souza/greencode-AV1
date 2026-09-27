import { ServicoEquipamento } from "../../services/ServicoEquipamento.ts";
import { ServicoRelatorio } from "../../services/ServicoRelatorio.ts";
import { StatusRastreamento } from "../../types/Enums.ts";
import { ComandoParsed } from "../../types/Interfaces.ts";

export class AuditorHandler {
  constructor(
    private servicoEquip: ServicoEquipamento,
    private servicoRelatorio: ServicoRelatorio,
  ) {}

  async processar(cmd: ComandoParsed): Promise<void> {
    if (cmd.acaoPrincipal === "equipamento rastrear") {
      const { id } = cmd.flags;
      if (!id) throw new Error("Uso: equipamento rastrear --id <codigoOuId>");
      const dados = this.servicoEquip.rastrearEquipamento(id);
      console.log(
        "\n====================== RASTREABILIDADE ======================",
      );
      console.log(
        `Código: ${dados.equipamento.codigoBarrasInterno} | Tipo: ${dados.equipamento.tipo}`,
      );
      console.log(
        `Modelo: ${dados.equipamento.marca} ${dados.equipamento.modelo} | Estado: ${dados.equipamento.estadoFisico}`,
      );
      console.log(
        `Status Atual: ${dados.equipamento.statusRastreamento} | Lote: ${dados.loteId}`,
      );
      console.log("Movimentações Auditadas:");
      dados.historico.forEach((mov: any, i: number) => {
        console.log(
          `  ${i + 1}. [${new Date(mov.dataHora).toLocaleString()}] ${mov.origem} -> ${mov.destino} (Por: ${mov.responsavel})`,
        );
        if (mov.observacao) console.log(`     Nota: ${mov.observacao}`);
      });
      console.log(
        "=============================================================\n",
      );
      return;
    }

    if (cmd.acaoPrincipal === "relatorio org") {
      const { id, ano } = cmd.flags;
      if (!id) throw new Error("Uso: relatorio org --id <orgId> [--ano <ano>]");
      const anoRel = Number(ano) || new Date().getFullYear();
      const rel = this.servicoRelatorio.gerarRelatorioPorOrganizacao(id, {
        inicio: new Date(anoRel, 0, 1),
        fim: new Date(anoRel, 11, 31),
      });
      console.log(`\n${rel}`);
      return;
    }

    if (cmd.acaoPrincipal === "relatorio financeiro") {
      const anoRel = Number(cmd.flags["ano"]) || new Date().getFullYear();
      const rel = this.servicoRelatorio.gerarRelatorioFinanceiro({
        inicio: new Date(anoRel, 0, 1),
        fim: new Date(anoRel, 11, 31),
      });
      console.log(`\n${rel}`);
      return;
    }

    if (cmd.acaoPrincipal === "relatorio status") {
      const { status } = cmd.flags;
      if (!status)
        throw new Error(
          "Uso: relatorio status --status <RECEBIDO|AGUARDANDO_TRIAGEM|EM_TRIAGEM|HIGIENIZADO|TESTADO|PRONTO_DESCARTE|EXPEDIDO>",
        );
      const rel = this.servicoRelatorio.gerarRelatorioPorStatus(
        status.toUpperCase() as StatusRastreamento,
      );
      console.log(`\n${rel}`);
      return;
    }

    throw new Error(
      `Comando "${cmd.acaoPrincipal}" não reconhecido para Auditor.`,
    );
  }
}
