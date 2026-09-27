import { Sessao } from "../../models/Usuario/Sessao.ts";
import { ServicoOrganizacao } from "../../services/ServicoOrganizacao.ts";
import { ComandoParsed } from "../../types/Interfaces.ts";
import { ConsoleLogger } from "../ConsoleLogger.ts";

export class OperadorHandler {
  constructor(private servicoOrg: ServicoOrganizacao) {}

  async processar(cmd: ComandoParsed, sessao: Sessao): Promise<void> {
    if (cmd.acaoPrincipal === "org cadastrar") {
      const { razao, cnpj, ie, end, tel, email, mensal, venc } = cmd.flags;
      if (!razao || !cnpj || !mensal || !venc) {
        throw new Error(
          "Uso: org cadastrar --razao <nome> --cnpj <cnpj> --mensal <valor> --venc <AAAA-MM-DD> [--ie <ie>] [--end <end>] [--tel <tel>] [--email <email>]",
        );
      }
      const org = this.servicoOrg.cadastrarOrganizacao(
        {
          razaoSocial: razao,
          cnpj,
          inscricaoEstadual: ie || "",
          enderecoCompleto: end || "",
          telefone: tel || "",
          email: email || "",
          valorMensal: Number(mensal),
          dataVencimento: new Date(venc).toISOString(),
          clausulas: ["Triagem e destinação de resíduos eletrônicos"],
        },
        sessao.usuario,
      );
      ConsoleLogger.sucesso(
        `Organização "${org.razaoSocial}" cadastrada com ID: ${org.id}`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "org listar") {
      const orgs = this.servicoOrg.listarOrganizacoesAtivas();
      ConsoleLogger.info(`Organizações ativas encontradas (${orgs.length}):`);
      orgs.forEach((o) =>
        console.log(`  • [${o.id}] ${o.razaoSocial} | CNPJ: ${o.cnpj}`),
      );
      return;
    }

    if (cmd.acaoPrincipal === "org renovar") {
      const { id, venc } = cmd.flags;
      if (!id || !venc)
        throw new Error("Uso: org renovar --id <id> --venc <AAAA-MM-DD>");
      this.servicoOrg.renovarContrato(id, new Date(venc), sessao.usuario);
      ConsoleLogger.sucesso(
        `Contrato da organização [${id}] renovado até ${venc}.`,
      );
      return;
    }

    throw new Error(
      `Comando "${cmd.acaoPrincipal}" não reconhecido para Operador de Cadastro.`,
    );
  }
}
