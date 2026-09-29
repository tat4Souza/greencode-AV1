import readline from "node:readline";
import { ServicoAutenticacao } from "../services/ServicoAutenticacao.ts";
import { ServicoOrganizacao } from "../services/ServicoOrganizacao.ts";
import { ServicoLote } from "../services/ServicoLote.ts";
import { ServicoEquipamento } from "../services/ServicoEquipamento.ts";
import { ServicoRelatorio } from "../services/ServicoRelatorio.ts";
import { Sessao } from "../models/Usuario/Sessao.ts";
import { HistoricoCLI } from "./HistoricoCLI.ts";
import { AdminHandler } from "./handlers/AdminHandler.ts";
import { OperadorHandler } from "./handlers/OperadorHandler.ts";
import { GestorHandler } from "./handlers/GestorHandler.ts";
import { AuditorHandler } from "./handlers/AuditorHandler.ts";
import { ServicoParametros } from "../services/ServicoParametros.ts";
import {
  EstadoFisico,
  PapelUsuario,
  StatusRastreamento,
  TipoEquipamento,
} from "../types/Enums.ts";
import { ConsoleLogger } from "./ConsoleLogger.ts";
import { ComandoParser } from "./ComandoParser.ts";
import { LeitorSenha } from "./LeitorSenha.ts";

export class CLIInterface {
  autenticacao: ServicoAutenticacao;
  organizacao: ServicoOrganizacao;
  lote: ServicoLote;
  equipamento: ServicoEquipamento;
  relatorio: ServicoRelatorio;
  sessaoAtual: Sessao | null = null;

  private rl!: readline.Interface;
  private historicoCLI: HistoricoCLI;
  private adminHandler: AdminHandler;
  private operadorHandler: OperadorHandler;
  private gestorHandler: GestorHandler;
  private auditorHandler: AuditorHandler;

  private flagsObrigatorias: Record<string, string[]> = {
    login: ["--user"],
    "usuario cadastrar": ["--user", "--papel"],
    "parametros configurar": ["--aliquota", "--depreciacao"],
    "org cadastrar": [
      "--razao",
      "--cnpj",
      "--mensal",
      "--venc",
      "--ie",
      "--end",
      "--tel",
      "--email",
    ],
    "org renovar": ["--id", "--venc"],
    "lote criar": ["--org", "--nf", "--transp"],
    "equipamento adicionar": [
      "--lote",
      "--tipo",
      "--marca",
      "--modelo",
      "--ano",
      "--peso",
    ],
    "lote triagem": ["--id"],
    "equipamento estado": ["--id", "--estado"],
    "equipamento movimentar": ["--id", "--status"],
    "equipamento rastrear": ["--id"],
    "relatorio org": ["--id"],
    "relatorio financeiro": [],
    "relatorio status": ["--status"],
    "senha alterar": [],
  };

  private flagsComandoAutocomplete: Record<string, string[]> = {
    login: ["--user"],
    "usuario cadastrar": ["--user", "--papel"],
    "parametros configurar": ["--aliquota", "--depreciacao"],
    "org cadastrar": [
      "--razao",
      "--cnpj",
      "--mensal",
      "--venc",
      "--ie",
      "--end",
      "--tel",
      "--email",
    ],
    "org renovar": ["--id", "--venc"],
    "lote criar": ["--org", "--nf", "--transp", "--obs", "--data"],
    "equipamento adicionar": [
      "--lote",
      "--tipo",
      "--marca",
      "--modelo",
      "--ano",
      "--peso",
    ],
    "lote triagem": ["--id"],
    "equipamento estado": ["--id", "--estado", "--justificativa"],
    "equipamento movimentar": [
      "--id",
      "--status",
      "--origem",
      "--destino",
      "--obs",
    ],
    "equipamento rastrear": ["--id"],
    "relatorio org": ["--id", "--ano"],
    "relatorio financeiro": ["--ano"],
    "relatorio status": ["--status"],
    "senha alterar": [],
  };

  constructor(
    autenticacao: ServicoAutenticacao,
    organizacao: ServicoOrganizacao,
    lote: ServicoLote,
    equipamento: ServicoEquipamento,
    relatorio: ServicoRelatorio,
    servicoParams?: ServicoParametros,
  ) {
    this.autenticacao = autenticacao;
    this.organizacao = organizacao;
    this.lote = lote;
    this.equipamento = equipamento;
    this.relatorio = relatorio;
    this.sessaoAtual = null;

    const params =
      servicoParams || new ServicoParametros(this.organizacao.repositorio);
    this.historicoCLI = new HistoricoCLI();
    this.adminHandler = new AdminHandler(this.autenticacao, params);
    this.operadorHandler = new OperadorHandler(this.organizacao);
    this.gestorHandler = new GestorHandler(this.lote, this.equipamento);
    this.auditorHandler = new AuditorHandler(this.equipamento, this.relatorio);

    this.configurarReadline();
  }

  private validarFlagsObrigatorias(
    acaoPrincipal: string,
    flagsFornecidas: Record<string, string>,
  ): void {
    const obrigatorias = this.flagsObrigatorias[acaoPrincipal];

    if (!obrigatorias || obrigatorias.length === 0) {
      return;
    }

    const ausentes: string[] = [];

    for (const flag of obrigatorias) {
      const chaveFlag = flag.replace(/^--?/, "");
      if (
        !flagsFornecidas[chaveFlag] ||
        flagsFornecidas[chaveFlag].trim() === ""
      ) {
        ausentes.push(flag);
      }
    }

    if (ausentes.length > 0) {
      throw new Error(
        `Parâmetros obrigatórios ausentes para "${acaoPrincipal}": ${ausentes.join(
          ", ",
        )}`,
      );
    }
  }

  private obterComandosPermitidos(): string[] {
    if (!this.sessaoAtual) return ["login", "sair", "ajuda"];
    const basicos = ["senha alterar", "logout", "sair", "ajuda"];

    switch (this.sessaoAtual.papel) {
      case PapelUsuario.ADMINISTRADOR:
        return [...basicos, "usuario cadastrar", "parametros configurar"];
      case PapelUsuario.OPERADOR_CADASTRO:
        return [...basicos, "org cadastrar", "org listar", "org renovar"];
      case PapelUsuario.GESTOR_ALMOXARIFADO:
        return [
          ...basicos,
          "lote criar",
          "equipamento adicionar",
          "lote triagem",
          "equipamento estado",
          "equipamento movimentar",
          "equipamento rastrear",
        ];
      case PapelUsuario.AUDITOR:
        return [
          ...basicos,
          "equipamento rastrear",
          "relatorio org",
          "relatorio financeiro",
          "relatorio status",
        ];
      default:
        return basicos;
    }
  }

  private autocompletar(linha: string): [string[], string] {
    const permitidos = this.obterComandosPermitidos();
    const tokens = linha.trimStart().split(/\s+/);
    const ultimoToken = tokens[tokens.length - 1] || "";

    if (tokens.length >= 2) {
      const penultimoToken = tokens[tokens.length - 2];
      if (penultimoToken === "--papel") {
        const papeis = Object.values(PapelUsuario).filter((p) =>
          p.toLowerCase().startsWith(ultimoToken.toLowerCase()),
        );
        return [papeis, ultimoToken];
      }
      if (penultimoToken === "--tipo") {
        const tipos = Object.values(TipoEquipamento).filter((t) =>
          t.toLowerCase().startsWith(ultimoToken.toLowerCase()),
        );
        return [tipos, ultimoToken];
      }
      if (penultimoToken === "--estado") {
        const estados = Object.values(EstadoFisico).filter((e) =>
          e.toLowerCase().startsWith(ultimoToken.toLowerCase()),
        );
        return [estados, ultimoToken];
      }
      if (penultimoToken === "--status") {
        const status = Object.values(StatusRastreamento).filter((s) =>
          s.toLowerCase().startsWith(ultimoToken.toLowerCase()),
        );
        return [status, ultimoToken];
      }
    }

    const possivelAcao = tokens.slice(0, 2).join(" ").toLowerCase();
    const acaoEncontrada = permitidos.find(
      (cmd) => cmd === possivelAcao || cmd === tokens[0],
    );

    if (
      acaoEncontrada &&
      this.flagsComandoAutocomplete[acaoEncontrada] &&
      ultimoToken.startsWith("-")
    ) {
      const flagsPossiveis = this.flagsComandoAutocomplete[
        acaoEncontrada
      ].filter((f) => f.startsWith(ultimoToken));
      return [
        flagsPossiveis.length
          ? flagsPossiveis
          : this.flagsComandoAutocomplete[acaoEncontrada],
        ultimoToken,
      ];
    }

    const matches = permitidos.filter((c) => c.startsWith(linha.toLowerCase()));
    return [matches.length ? matches : permitidos, linha];
  }

  private configurarReadline(): void {
    if (this.rl) {
      this.rl.close();
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: (linha: string) => this.autocompletar(linha),
    });

    this.historicoCLI
      .carregar()
      .forEach((cmd) => (this.rl as any).history.push(cmd));
  }

  exibirBannerInicial(): void {
    console.log(
      "\n\x1b[1m\x1b[32m================================================================================\x1b[0m",
    );
    console.log(
      "\x1b[1m\x1b[32m         GREENCODE - GESTÃO DE RESÍDUOS E LOGÍSTICA REVERSA                     \x1b[0m",
    );
    console.log(
      "\x1b[1m\x1b[32m================================================================================\x1b[0m",
    );
    console.log(
      "\x1b[2m--- Pressione <TAB> para auto-completar comandos, flags e opções de Enums ---\x1b[0m\n",
    );
    console.log(
      "\x1b[1m\x1b[32m    Para prosseguir, efetue o login no sistema \x1b[0m",
    );
    console.log("    Comando [Obrigatório]: login --user <usuario>");
    console.log('    Ou digite: "sair" para encerrar.');
    console.log("");
  }

  exibirMenuPorPapel(papel: PapelUsuario): void {
    console.log(
      "\n\x1b[1m\x1b[32m================================================================================\x1b[0m",
    );
    console.log(
      `\x1b[1m\x1b[32m   GREENCODE CLI - SESSÃO ATIVA: ${this.sessaoAtual?.usuario} [${papel}]\x1b[0m`,
    );
    console.log(
      "\x1b[1m\x1b[32m================================================================================\x1b[0m",
    );
    console.log(
      "\x1b[2m--- Legenda: --parâmetro <valor> (Obrigatório) | [--parâmetro <valor>] (Opcional) ---\x1b[0m\n",
    );
    console.log(
      "------------------------------------------------------------------------",
    );
    console.log("  COMANDOS DISPONÍVEIS: \n");

    switch (papel) {
      case PapelUsuario.ADMINISTRADOR:
        console.log("  • usuario cadastrar --user <nome> --papel <PAPEL>");
        console.log(
          "  • parametros configurar --aliquota <valor> --depreciacao <valor>",
        );
        break;
      case PapelUsuario.OPERADOR_CADASTRO:
        console.log(
          "  • org cadastrar --razao <nome> --cnpj <cnpj> --mensal <R$> --venc <AAAA-MM-DD> --ie <inscricao estadual> --end <endereco> --tel <tel> --email <email>",
        );
        console.log("  • org listar");
        console.log("  • org renovar --id <id> --venc <AAAA-MM-DD>");
        break;
      case PapelUsuario.GESTOR_ALMOXARIFADO:
        console.log(
          "  • lote criar --org <id> --nf <numero> --transp <nome> [--obs <texto>] [--data <AAAA-MM-DD>]",
        );
        console.log(
          "  • equipamento adicionar --lote <id> --tipo <TIPO> --marca <m> --modelo <mod> --ano <ano> --peso <kg>",
        );
        console.log("  • lote triagem --id <loteId>");
        console.log(
          "  • equipamento estado --id <codigoOuId> --estado <ESTADO> [--justificativa <texto>]",
        );
        console.log(
          "  • equipamento movimentar --id <codigo> --status <STATUS> [--origem <orig>] [--destino <dest>] [--obs <texto>]",
        );
        console.log("  • equipamento rastrear --id <codigoOuId>");
        break;
      case PapelUsuario.AUDITOR:
        console.log("  • equipamento rastrear --id <codigoOuId>");
        console.log("  • relatorio org --id <orgId> [--ano <ano>]");
        console.log("  • relatorio financeiro [--ano <ano>]");
        console.log("  • relatorio status --status <STATUS>");
        break;
    }
    console.log(
      "------------------------------------------------------------------------",
    );
    console.log(
      "\x1b[1m\x1b[33m Comandos globais: senha alterar | logout | sair \x1b[0m",
    );
    console.log("");
  }

  private fazerPergunta(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      process.stdin.resume();
      this.rl.question(prompt, (resposta) => {
        resolve(resposta);
      });
    });
  }

  async iniciarLoop(): Promise<void> {
    this.exibirBannerInicial();

    let rodando = true;

    while (rodando) {
      const prefixo = this.sessaoAtual
        ? `\x1b[36m[${this.sessaoAtual.usuario}@greencode]$\x1b[0m `
        : `\x1b[33m[nao_logado@greencode]$\x1b[0m `;

      const linha = await this.fazerPergunta(prefixo);
      const cmdTexto = linha.trim();

      if (cmdTexto.toLowerCase() === "sair") {
        if (this.sessaoAtual) this.autenticacao.logout(this.sessaoAtual.token);
        ConsoleLogger.info("Encerrando aplicação GreenCode. Até logo!");
        this.rl.close();
        rodando = false;
        process.exit(0);
      }

      if (cmdTexto.length > 0) {
        if (!cmdTexto.startsWith("senha")) {
          const comandoSanitizado = cmdTexto
            .replace(/--pass\s+[^\s]+/gi, "")
            .trim();
          this.historicoCLI.adicionar(comandoSanitizado);
        }

        try {
          await this.processarComando(cmdTexto);
        } catch (erro: any) {
          ConsoleLogger.erro(erro.message);
        } finally {
          this.configurarReadline();
        }
      }
    }
  }

  async processarComando(entrada: string): Promise<void> {
    if (this.sessaoAtual && !this.sessaoAtual.isValida()) {
      ConsoleLogger.alerta(
        "Sua sessão expirou por inatividade (limite de 30 min). Faça login novamente.",
      );
      this.sessaoAtual = null;
      this.exibirBannerInicial();
      return;
    }

    const parsed = ComandoParser.parse(entrada);

    if (parsed.acaoPrincipal === "ajuda") {
      if (this.sessaoAtual) {
        this.exibirMenuPorPapel(this.sessaoAtual.papel);
      } else {
        this.exibirBannerInicial();
      }
      return;
    }

    for (const [chave, valor] of Object.entries(parsed.flags)) {
      if (!valor || valor.trim() === "") {
        throw new Error(
          `A flag '--${chave}' foi informada mas não contém um valor válido.`,
        );
      }
    }

    this.validarFlagsObrigatorias(parsed.acaoPrincipal, parsed.flags);

    if (!this.sessaoAtual) {
      if (parsed.acaoPrincipal.startsWith("login")) {
        const user = parsed.flags["user"] || parsed.argumentos[0];

        if (!user) {
          throw new Error(
            "O nome de usuário é obrigatório. Uso: login --user <usuario>",
          );
        }

        if (parsed.flags["pass"]) {
          throw new Error(
            "Por motivos de segurança, a senha não deve ser passada como parâmetro. Digite apenas: login --user " +
              user,
          );
        }

        const pass = await LeitorSenha.lerSenha("Digite a sua senha: ");

        this.configurarReadline();

        if (!pass || pass.trim().length === 0) {
          throw new Error("A senha não pode estar em branco.");
        }

        try {
          this.sessaoAtual = this.autenticacao.login(user, pass);
        } catch {
          throw new Error(
            "Credenciais inválidas. Verifique o usuário e a senha informados.",
          );
        }

        ConsoleLogger.sucesso(
          `Autenticado com sucesso como [${this.sessaoAtual.papel}].`,
        );
        this.exibirMenuPorPapel(this.sessaoAtual.papel);
      } else {
        throw new Error(
          "Acesso negado: Para prosseguir, efetue o login utilizando o comando: login --user <usuario>",
        );
      }
      return;
    }

    this.sessaoAtual.renovar();

    if (parsed.acaoPrincipal === "logout") {
      this.autenticacao.logout(this.sessaoAtual.token);
      this.sessaoAtual = null;
      ConsoleLogger.sucesso("Logout efetuado com sucesso.");
      this.exibirBannerInicial();
      return;
    }

    if (parsed.acaoPrincipal === "senha alterar") {
      const antiga = await LeitorSenha.lerSenha("Digite a senha atual: ");

      let nova = "";
      while (true) {
        nova = await LeitorSenha.lerSenha("Digite a nova senha: ");

        if (nova.trim().length >= 6) {
          break;
        }

        ConsoleLogger.erro(
          " A senha deve possuir no mínimo 6 caracteres. Tente novamente.\n",
        );
      }

      this.configurarReadline();

      if (
        !antiga ||
        !nova ||
        antiga.trim().length === 0 ||
        nova.trim().length === 0
      ) {
        throw new Error(
          "Ambas as senhas são obrigatórias e não podem estar em branco.",
        );
      }

      this.autenticacao.alterarSenhaUsuario(
        this.sessaoAtual.usuario,
        antiga,
        nova,
      );
      ConsoleLogger.sucesso(
        "Senha alterada com sucesso! Utilize a nova senha na próxima sessão.",
      );
      return;
    }

    switch (this.sessaoAtual.papel) {
      case PapelUsuario.ADMINISTRADOR:
        await this.adminHandler.processar(parsed, this.sessaoAtual);
        break;

      case PapelUsuario.OPERADOR_CADASTRO:
        await this.operadorHandler.processar(parsed, this.sessaoAtual);
        break;

      case PapelUsuario.GESTOR_ALMOXARIFADO:
        await this.gestorHandler.processar(parsed, this.sessaoAtual);
        break;

      case PapelUsuario.AUDITOR:
        await this.auditorHandler.processar(parsed);
        break;

      default:
        throw new Error("Papel de usuário não reconhecido no sistema.");
    }
  }
}
