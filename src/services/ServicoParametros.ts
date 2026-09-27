import { JournalTransacao } from "../core/JournalTransacao.ts";
import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { ParametrosGlobais } from "../models/ParametrosGlobais.ts";

export class ServicoParametros {
  private repositorio: RepositorioArquivo;
  private readonly ARQUIVO = "parametros.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
  }

  obterParametros(): ParametrosGlobais {
    const params = this.repositorio.carregarEntidade<ParametrosGlobais>(
      this.ARQUIVO,
      "SISTEMA_PARAMETROS",
    );
    if (!params) {
      const padrao = new ParametrosGlobais(10, 15, "SISTEMA");
      this.repositorio.salvarEntidade(this.ARQUIVO, padrao);
      return padrao;
    }
    return params;
  }

  atualizarParametros(
    aliquotaImposto: number,
    coeficienteDepreciacao: number,
    usuarioResponsavel: string,
  ): ParametrosGlobais {
    if (aliquotaImposto < 0 || aliquotaImposto > 100) {
      throw new Error("A alíquota de impostos deve estar entre 0% e 100%.");
    }
    if (coeficienteDepreciacao < 0 || coeficienteDepreciacao > 100) {
      throw new Error("A taxa de depreciação deve estar entre 0% e 100%.");
    }

    const antes = this.obterParametros();
    const atualizado = new ParametrosGlobais(
      aliquotaImposto,
      coeficienteDepreciacao,
      usuarioResponsavel,
    );

    new JournalTransacao(
      "CONFIGURAR_PARAMETROS_GLOBAIS",
      "ParametrosGlobais",
      {
        aliquotaImposto: antes.aliquotaImposto,
        coeficienteDepreciacaoAnual: antes.coeficienteDepreciacaoAnual,
      },
      { aliquotaImposto, coeficienteDepreciacaoAnual: coeficienteDepreciacao },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO, atualizado);
    return atualizado;
  }
}
