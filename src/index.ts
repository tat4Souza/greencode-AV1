import path from "node:path";
import { GerenciadorConfiguracao } from "./core/ConfiguracaoMestre.ts";
import { RepositorioArquivo } from "./core/RepositorioArquivo.ts";
import { ServicoAutenticacao } from "./services/ServicoAutenticacao.ts";
import { ServicoOrganizacao } from "./services/ServicoOrganizacao.ts";
import { ServicoLote } from "./services/ServicoLote.ts";
import { ServicoEquipamento } from "./services/ServicoEquipamento.ts";
import { ServicoRelatorio } from "./services/ServicoRelatorio.ts";
import { ServicoParametros } from "./services/ServicoParametros.ts";
import { CLIInterface } from "./cli/CLIInterface.ts";
import { LeitorSenha } from "./cli/LeitorSenha.ts";
import { ConsoleLogger } from "./cli/ConsoleLogger.ts";
import { EasterEgg } from "./cli/EasterEgg.ts";
import { JournalTransacao } from "./core/JournalTransacao.ts";

async function bootstrap() {
  const pastaData = path.join(process.cwd(), "data");
  let chaveMestra: string;

  JournalTransacao.definirDiretorio(pastaData);
  JournalTransacao.aplicarPoliticaRetencao(180);
  JournalTransacao.limparBackupsAntigos(180);

  if (!GerenciadorConfiguracao.existeConfiguracao()) {
    console.log(
      "\n\x1b[1m\x1b[34m================================================================================\x1b[0m",
    );
    console.log(
      "\x1b[1m\x1b[34m                  MODO DE PROVISIONAMENTO INICIAL - GREENCODE                   \x1b[0m",
    );
    console.log(
      "\x1b[1m\x1b[34m================================================================================\x1b[0m",
    );

    let senhaAdmin = "";
    while (true) {
      senhaAdmin = await LeitorSenha.lerSenha(
        "Defina a senha para o primeiro Administrador (admin):",
      );

      if (senhaAdmin.trim().length >= 6) {
        break;
      }

      ConsoleLogger.erro(
        " A senha deve possuir no mínimo 6 caracteres. Tente novamente.\n",
      );
    }

    console.log(
      "\x1b[2m Gerando nova chave criptográfica AES-256 mestra... \x1b[0m\n",
    );

    chaveMestra = GerenciadorConfiguracao.criarConfiguracaoMestre();

    const repositorio = new RepositorioArquivo(pastaData, chaveMestra);
    const servicoAuth = new ServicoAutenticacao(repositorio);

    servicoAuth.provisionarPrimeiroAdmin(senhaAdmin);
    ConsoleLogger.sucesso(
      " Sistema configurado com sucesso! Chave e usuário admin criados.\n",
    );
  } else {
    chaveMestra = GerenciadorConfiguracao.obterChaveMestra();
  }

  const repositorio = new RepositorioArquivo(pastaData, chaveMestra);

  const servicoAuth = new ServicoAutenticacao(repositorio);
  const servicoOrg = new ServicoOrganizacao(repositorio);
  const servicoLote = new ServicoLote(repositorio);
  const servicoEquip = new ServicoEquipamento(repositorio);
  const servicoRelatorio = new ServicoRelatorio(repositorio);
  const servicoParams = new ServicoParametros(repositorio);

  const cli = new CLIInterface(
    servicoAuth,
    servicoOrg,
    servicoLote,
    servicoEquip,
    servicoRelatorio,
    servicoParams,
  );

  await cli.iniciarLoop();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--easter-egg") || args.includes("-e")) {
    await EasterEgg.verificar();
    process.exit(0);
  }

  await bootstrap();
}

main().catch((erro) => {
  ConsoleLogger.erro(
    `❌ Falha crítica ao iniciar o sistema:${erro.message || erro}`,
  );
  process.exit(1);
});
