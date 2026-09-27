import { JournalTransacao } from "../core/JournalTransacao.ts";
import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { Equipamento } from "../models/Equipamento.ts";
import { Lote } from "../models/Lote.ts";
import { ValidadorDataEntrada } from "../models/Validador.ts";
import { StatusLote, StatusRastreamento } from "../types/Enums.ts";

export class ServicoLote {
  repositorio: RepositorioArquivo;
  private validadorData: ValidadorDataEntrada;
  private readonly ARQUIVO_LOTES = "lotes.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.validadorData = new ValidadorDataEntrada();
  }

  criarLote(dados: any, usuarioResponsavel: string = "SISTEMA"): Lote {
    const dataEntrada = new Date(dados.dataEntrada || Date.now());

    if (!this.validadorData.validarData(dataEntrada)) {
      throw new Error(
        `Data de entrada inválida: ${this.validadorData.obterMensagemErro()}`,
      );
    }

    const novoLote = new Lote(
      dataEntrada,
      dados.organizacaoId,
      dados.notaFiscal,
      dados.transportadora,
      dados.observacoes || "",
    );

    new JournalTransacao(
      "CRIAR_LOTE",
      "Lote",
      null,
      {
        id: novoLote.id,
        nf: novoLote.notaFiscal,
        orgId: novoLote.organizacaoId,
      },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_LOTES, novoLote);
    return novoLote;
  }

  adicionarEquipamentoLote(
    loteId: string,
    equipamento: Equipamento,
    usuarioResponsavel: string = "SISTEMA",
  ): void {
    const lote = this.repositorio.carregarEntidade<Lote>(
      this.ARQUIVO_LOTES,
      loteId,
    );
    if (!lote) {
      throw new Error(`Lote com ID "${loteId}" não encontrado`);
    }

    const instanciaLote = new Lote(
      new Date(lote.dataEntrada),
      lote.organizacaoId,
      lote.notaFiscal,
      lote.transportadora,
      lote.observacoes,
    );
    instanciaLote.id = lote.id;
    instanciaLote.statusProcessamento = lote.statusProcessamento;
    instanciaLote.equipamentos = lote.equipamentos || [];

    equipamento.loteId = lote.id;
    equipamento.posicaoNoLote = instanciaLote.equipamentos.length + 1;

    instanciaLote.adicionarEquipamento(equipamento);

    new JournalTransacao(
      "ADICIONAR_EQUIPAMENTO_LOTE",
      "Lote",
      null,
      {
        loteId,
        equipamentoId: equipamento.id,
        codBarras: equipamento.codigoBarrasInterno,
      },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_LOTES, instanciaLote);
  }

  processarTriagem(
    loteId: string,
    usuarioResponsavel: string = "SISTEMA",
  ): void {
    const lote = this.repositorio.carregarEntidade<Lote>(
      this.ARQUIVO_LOTES,
      loteId,
    );
    if (!lote) {
      throw new Error(`Lote com ID "${loteId}" não encontrado.`);
    }

    const dadosAntes = { status: lote.statusProcessamento };
    lote.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;

    if (lote.equipamentos && lote.equipamentos.length > 0) {
      lote.equipamentos.forEach((eq) => {
        if (eq.statusRastreamento === StatusRastreamento.AGUARDANDO_TRIAGEM) {
          eq.statusRastreamento = StatusRastreamento.EM_TRIAGEM;
          eq.historicoMovimentacao = eq.historicoMovimentacao || [];
          eq.historicoMovimentacao.push({
            id: String(Date.now()),
            equipamentoId: eq.id,
            dataHora: new Date(),
            origem: "RECEBIMENTO",
            destino: "BANCADA_TRIAGEM",
            responsavel: usuarioResponsavel,
            observacao: "TRIAGEM_CONCLUIDA",
          });
        }
      });
    }

    new JournalTransacao(
      "PROCESSAR_TRIAGEM",
      "Lote",
      dadosAntes,
      { status: lote.statusProcessamento, loteId },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_LOTES, lote);
  }

  consultarLotePorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
    const todos = this.repositorio.listarEntidades<Lote>(this.ARQUIVO_LOTES);
    return todos.filter((l) => {
      const data = new Date(l.dataEntrada);
      return data >= dataInicio && data <= dataFim;
    });
  }
}
