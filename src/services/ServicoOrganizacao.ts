import { JournalTransacao } from "../core/JournalTransacao.ts";
import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { Contrato } from "../models/Contrato.ts";
import { Organizacao } from "../models/Organizacao.ts";
import { ValidadorCNPJ } from "../models/Validador.ts";

export class ServicoOrganizacao {
  repositorio: RepositorioArquivo;
  validadorCNPJ: ValidadorCNPJ;
  private readonly ARQUIVO_ORGS = "organizacao.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.validadorCNPJ = new ValidadorCNPJ();
  }

  cadastrarOrganizacao(
    dados: any,
    usuarioResponsavel: string = "SISTEMA",
  ): Organizacao {
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new Error(
        `CNPJ inválido: ${this.validadorCNPJ.obterMensagemErro()}`,
      );
    }

    const todas = this.repositorio.listarEntidades<Organizacao>(
      this.ARQUIVO_ORGS,
    );
    const cnpjLimpo = (dados.cnpj || "").replace(/[^\d]/g, "");
    const jaExiste = todas.some(
      (o) => (o.cnpj ? o.cnpj.replace(/[^\d]/g, "") : "") === cnpjLimpo,
    );

    if (jaExiste) {
      throw new Error(
        `Já existe uma organização cadastrada com o CNPJ ${dados.cnpj}`,
      );
    }

    const novaOrg = new Organizacao(
      dados.razaoSocial,
      dados.cnpj,
      dados.inscricaoEstadual || "",
      dados.enderecoCompleto || "",
      dados.telefone || "",
      dados.email || "",
    );

    if (dados.valorMensal && dados.dataVencimento) {
      const contrato = new Contrato(
        novaOrg.id,
        new Date(),
        new Date(dados.dataVencimento),
        Number(dados.valorMensal),
        dados.clausulas || [],
      );
      novaOrg.contratoVigente = contrato;
    }

    new JournalTransacao(
      "CADASTRAR_ORGANIZACAO",
      "Organizacao",
      null,
      { id: novaOrg.id, razaoSocial: novaOrg.razaoSocial, cnpj: novaOrg.cnpj },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_ORGS, novaOrg);
    return novaOrg;
  }

  buscarOrganizacao(id: string): Organizacao {
    const org = this.repositorio.carregarEntidade<Organizacao>(
      this.ARQUIVO_ORGS,
      id,
    );
    if (!org) {
      throw new Error(`Organização com ID "${id}" não encontrada.`);
    }
    return org;
  }

  listarOrganizacoesAtivas(): Organizacao[] {
    const todas = this.repositorio.listarEntidades<Organizacao>(
      this.ARQUIVO_ORGS,
    );
    return todas.filter((o) => o.ativo === true);
  }

  renovarContrato(
    organizacaoId: string,
    novoVencimento: Date,
    usuarioResponsavel: string = "SISTEMA",
  ): void {
    const org = this.buscarOrganizacao(organizacaoId);

    if (!org.contratoVigente) {
      throw new Error("A organização não possui contrato cadastrado.");
    }

    const dadosAntes = { ...org.contratoVigente };
    org.contratoVigente.dataVencimento = novoVencimento;

    new JournalTransacao(
      "RENOVAR_CONTRATO",
      "Contrato",
      dadosAntes,
      { ...org.contratoVigente },
      usuarioResponsavel,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_ORGS, org);
  }
}
