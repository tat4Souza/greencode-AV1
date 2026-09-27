import { Sessao } from "../../models/Usuario/Sessao.ts";
import { ServicoAutenticacao } from "../../services/ServicoAutenticacao.ts";
import { ServicoParametros } from "../../services/ServicoParametros.ts";
import { PapelUsuario } from "../../types/Enums.ts";
import { ComandoParsed } from "../../types/Interfaces.ts";
import { ConsoleLogger } from "../ConsoleLogger.ts";
import { LeitorSenha } from "../LeitorSenha.ts";

export class AdminHandler {
  constructor(
    private servicoAuth: ServicoAutenticacao,
    private servicoParams: ServicoParametros,
  ) {}

  async processar(cmd: ComandoParsed, sessao: Sessao): Promise<void> {
    if (cmd.acaoPrincipal === "usuario cadastrar") {
      const user = cmd.flags["user"];
      const papel = cmd.flags["papel"];

      if (!user)
        throw new Error(
          "Especificar o nome do usuário (--user) é obrigatório.",
        );
      if (!papel)
        throw new Error(
          `Especificar o papel do usuário (--papel) é obrigatório. Opções: ${Object.values(PapelUsuario).join(", ")}`,
        );

      if (
        !Object.values(PapelUsuario).includes(
          papel.toUpperCase() as PapelUsuario,
        )
      ) {
        throw new Error(
          `Papel inválido "${papel}". Opções aceitas: ${Object.values(PapelUsuario).join(", ")}`,
        );
      }

      const pass = await LeitorSenha.lerSenha(
        `Defina a senha para o novo usuário (${user}): `,
      );

      if (!pass || pass.trim().length === 0) {
        throw new Error("A senha do usuário não pode estar em branco.");
      }

      this.servicoAuth.cadastroUsuario(
        user,
        pass,
        papel.toUpperCase() as PapelUsuario,
        sessao.usuario,
      );
      ConsoleLogger.sucesso(
        `Usuário "${user}" (${papel.toUpperCase()}) cadastrado com sucesso.`,
      );
      return;
    }

    if (cmd.acaoPrincipal === "parametros configurar") {
      const { aliquota, depreciacao } = cmd.flags;
      if (!aliquota || !depreciacao) {
        throw new Error(
          "Uso: parametros configurar --aliquota <valor> --depreciacao <valor>",
        );
      }
      const res = this.servicoParams.atualizarParametros(
        Number(aliquota),
        Number(depreciacao),
        sessao.usuario,
      );
      ConsoleLogger.sucesso(
        `Parâmetros globais atualizados: Impostos=${res.aliquotaImposto}%, Depreciação=${res.coeficienteDepreciacaoAnual}% a.a.`,
      );
      return;
    }

    throw new Error(
      `Comando "${cmd.acaoPrincipal}" não reconhecido para o perfil Administrador.`,
    );
  }
}
