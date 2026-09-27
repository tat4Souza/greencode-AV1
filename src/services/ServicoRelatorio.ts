import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { Lote } from "../models/Lote.ts";
import { Organizacao } from "../models/Organizacao.ts";
import { StatusRastreamento } from "../types/Enums.ts";

export class ServicoRelatorio {
  private repositorio: RepositorioArquivo;
  private readonly ARQUIVO_LOTES = "lotes.dat";
  private readonly ARQUIVO_ORGS = "organizacao.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
  }

  gerarRelatorioPorOrganizacao(
    organizacaoId: string,
    periodo: { inicio: Date; fim: Date },
  ): string {
    const org = this.repositorio.carregarEntidade<Organizacao>(
      this.ARQUIVO_ORGS,
      organizacaoId,
    );
    const todosLotes = this.repositorio.listarEntidades<Lote>(
      this.ARQUIVO_LOTES,
    );

    const lotesOrg = todosLotes.filter((l) => {
      const data = new Date(l.dataEntrada);
      return (
        l.organizacaoId === organizacaoId &&
        data >= periodo.inicio &&
        data <= periodo.fim
      );
    });

    let totalEquipamentos = 0;
    lotesOrg.forEach((l) => (totalEquipamentos += l.equipamentos?.length || 0));

    return (
      `=== RELATÓRIO POR ORGANIZAÇÃO ===\n` +
      `Organização: ${org ? org.razaoSocial : organizacaoId}\n` +
      `Período: ${periodo.inicio.toLocaleDateString()} a ${periodo.fim.toLocaleDateString()}\n` +
      `Total de Lotes: ${lotesOrg.length}\n` +
      `Total de Equipamentos Recebidos: ${totalEquipamentos}\n`
    );
  }

  gerarRelatorioPorStatus(status: StatusRastreamento): string {
    const todosLotes = this.repositorio.listarEntidades<Lote>(
      this.ARQUIVO_LOTES,
    );
    let contagem = 0;
    const equipamentosEncontrados: string[] = [];

    todosLotes.forEach((lote) => {
      lote.equipamentos?.forEach((eq) => {
        if (eq.statusRastreamento === status) {
          contagem++;
          equipamentosEncontrados.push(
            `- [${eq.codigoBarrasInterno}] ${eq.marca} ${eq.modelo} (Lote: ${lote.id})`,
          );
        }
      });
    });

    return (
      `=== RELATÓRIO POR STATUS DE RASTREAMENTO ===\n` +
      `Status Filtrado: ${status}\n` +
      `Quantidade Total: ${contagem}\n` +
      (equipamentosEncontrados.length > 0
        ? equipamentosEncontrados.join("\n")
        : "Nenhum equipamento neste status.")
    );
  }

  gerarRelatorioFinanceiro(periodo: { inicio: Date; fim: Date }): string {
    const orgs = this.repositorio.listarEntidades<Organizacao>(
      this.ARQUIVO_ORGS,
    );
    const paramsEntidade = this.repositorio.carregarEntidade<any>(
      "parametros.dat",
      "SISTEMA_PARAMETROS",
    );

    const aliquota = paramsEntidade?.aliquotaImposto ?? 10;
    const depreciacao = paramsEntidade?.coeficienteDepreciacaoAnual ?? 15;

    let receitaBruta = 0;
    const ativas = orgs.filter((o) => Boolean(o.ativo));

    ativas.forEach((org) => {
      if (org.contratoVigente) {
        receitaBruta += Number(org.contratoVigente.valorMensal || 0);
      }
    });

    const impostos = receitaBruta * (aliquota / 100);
    const receitaLiquida = receitaBruta - impostos;

    return (
      `=== RELATÓRIO FINANCEIRO (CONTRATOS ATIVOS) ===\n` +
      `Período: ${periodo.inicio.toLocaleDateString()} a ${periodo.fim.toLocaleDateString()}\n` +
      `Total de Organizações Ativas: ${ativas.length}\n` +
      `Receita Mensal Bruta Recorrente: R$ ${receitaBruta.toFixed(2)}\n` +
      `Alíquota de Tributos Aplicada: ${aliquota.toFixed(2)}% (- R$ ${impostos.toFixed(2)})\n` +
      `Receita Mensal Líquida: R$ ${receitaLiquida.toFixed(2)}\n` +
      `Taxa Global de Depreciação de Ativos: ${depreciacao.toFixed(2)}% a.a.\n`
    );
  }
}
