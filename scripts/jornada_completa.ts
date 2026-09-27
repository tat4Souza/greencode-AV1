import fs from "node:fs";
import path from "node:path";
import { GerenciadorConfiguracao } from "../src/core/ConfiguracaoMestre.ts";
import { RepositorioArquivo } from "../src/core/RepositorioArquivo.ts";
import { ServicoAutenticacao } from "../src/services/ServicoAutenticacao.ts";
import { ServicoOrganizacao } from "../src/services/ServicoOrganizacao.ts";
import { ServicoLote } from "../src/services/ServicoLote.ts";
import { ServicoEquipamento } from "../src/services/ServicoEquipamento.ts";
import { ServicoRelatorio } from "../src/services/ServicoRelatorio.ts";
import { ServicoParametros } from "../src/services/ServicoParametros.ts";
import { CLIInterface } from "../src/cli/CLIIterface.ts";
import { LeitorSenha } from "../src/cli/LeitorSenha.ts";
import { ConsoleLogger } from "../src/cli/ConsoleLogger.ts";
import { JournalTransacao } from "../src/core/JournalTransacao.ts";

const esperar = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function simularJornadaCLI() {
  const pastaSimulacao = path.join(process.cwd(), "data_simulacao");

  if (fs.existsSync(pastaSimulacao)) {
    fs.rmSync(pastaSimulacao, { recursive: true, force: true });
  }
  fs.mkdirSync(pastaSimulacao, { recursive: true });

  GerenciadorConfiguracao.definirDiretorio(pastaSimulacao);
  JournalTransacao.definirDiretorio(pastaSimulacao);

  console.log(
    "\n\x1b[1m\x1b[32m================================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[32m                  GREENCODE - DEMONSTRAÇÃO AUTOMATIZADA                         \x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[32m================================================================================\x1b[0m\n",
  );

  // 1. Provisionamento inicial
  let chaveMestra: string;
  try {
    chaveMestra = GerenciadorConfiguracao.criarConfiguracaoMestre();
  } catch {
    chaveMestra = "a".repeat(64);
  }

  const repo = new RepositorioArquivo(pastaSimulacao, chaveMestra);
  const auth = new ServicoAutenticacao(repo);
  const org = new ServicoOrganizacao(repo);
  const lote = new ServicoLote(repo);
  const equip = new ServicoEquipamento(repo);
  const rel = new ServicoRelatorio(repo);
  const params = new ServicoParametros(repo);

  auth.provisionarPrimeiroAdmin("Admin@1234");

  const cli = new CLIInterface(auth, org, lote, equip, rel, params);

  // Fila de senhas fornecidas
  const senhasMockadas: string[] = [
    "Admin@1234", // Login Admin
    "Op@123456", // Cadastro op_pedro
    "Gestor@1234", // Cadastro gestor_marcos
    "Auditor@1234", // Cadastro aud_claudio
    "Op@123456", // Login op_pedro
    "Gestor@1234", // Login gestor_marcos
    "Auditor@1234", // Login aud_claudio
  ];

  LeitorSenha.lerSenha = async (promptTexto: string) => {
    const senha = senhasMockadas.shift() || "SenhaPadrao123";
    console.log(`${promptTexto}${"*".repeat(senha.length)}`);
    return senha;
  };

  let ultimoLogSucesso = "";
  const originalSucesso = ConsoleLogger.sucesso;
  ConsoleLogger.sucesso = (msg: string) => {
    ultimoLogSucesso = msg;
    originalSucesso(msg);
  };

  const executarNaCLI = async (comando: string): Promise<string> => {
    ultimoLogSucesso = "";
    const prefixo = cli.sessaoAtual
      ? `\x1b[36m[${cli.sessaoAtual.usuario}@greencode]$\x1b[0m `
      : `\x1b[33m[nao_logado@greencode]$\x1b[0m `;

    console.log(`\n${prefixo}\x1b[1m${comando}\x1b[0m`);
    await esperar(120);

    try {
      await cli.processarComando(comando);
    } catch (erro: any) {
      console.log(`\x1b[31m[ERRO]\x1b[0m ${erro.message}`);
    }

    return ultimoLogSucesso;
  };

  // Administrador configura parâmetros e cadastra operadores

  await executarNaCLI("login --user admin");
  await executarNaCLI("parametros configurar --aliquota 12 --depreciacao 20");
  await executarNaCLI(
    "usuario cadastrar --user op_pedro --papel OPERADOR_CADASTRO",
  );
  await executarNaCLI(
    "usuario cadastrar --user gestor_marcos --papel GESTOR_ALMOXARIFADO",
  );
  await executarNaCLI("usuario cadastrar --user aud_claudio --papel AUDITOR");
  await executarNaCLI("logout");

  // Operador cadastra a organização cliente

  await executarNaCLI("login --user op_pedro");
  await executarNaCLI(
    'org cadastrar --razao "Banco Nacional de Crédito S/A" --cnpj 33000167000101 --mensal 15000 --venc 2027-12-31',
  );
  await executarNaCLI("org listar");

  const orgs = org.listarOrganizacoesAtivas();
  const orgId = orgs[0]?.id || "ORG-001";
  await executarNaCLI("logout");

  // Gestor cria lote, adiciona equipamento e valida as regras de triagem

  await executarNaCLI("login --user gestor_marcos");

  const logLote = await executarNaCLI(
    `lote criar --org ${orgId} --nf 88990 --transp "TransLog Express" --obs "Descarte de TI"`,
  );

  const matchLote =
    logLote.match(/["']([^"']+)["']/) ||
    logLote.match(/(LOTE?-[A-Za-z0-9-]+)/i) ||
    logLote.match(/ID:\s*([A-Za-z0-9-]+)/i);
  const loteId = matchLote ? matchLote[1] : "LOTE-1";

  const logEquip = await executarNaCLI(
    `equipamento adicionar --lote ${loteId} --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2021 --peso 1.8`,
  );

  const matchEquip = logEquip.match(/(GC-[A-Za-z0-9-]+)/i);
  const codEquip = matchEquip ? matchEquip[1] : "GC-NOT-0001";

  await executarNaCLI(
    `equipamento movimentar --id ${codEquip} --status AGUARDANDO_DESMONTE`,
  );

  await executarNaCLI(
    `equipamento estado --id ${codEquip} --estado DANIFICADO_GRAVE --justificativa "Tela trincada e carcaça oxidada"`,
  );

  await executarNaCLI(`lote triagem --id ${loteId}`);

  await executarNaCLI(
    `equipamento movimentar --id ${codEquip} --status AGUARDANDO_DESMONTE`,
  );
  await executarNaCLI("logout");

  // Auditor inspeciona a rastreabilidade e relatórios

  await executarNaCLI("login --user aud_claudio");
  await executarNaCLI(`equipamento rastrear --id ${codEquip}`);
  await executarNaCLI("relatorio financeiro --ano 2026");
  await executarNaCLI("logout");

  console.log(
    "\n\x1b[1m\x1b[32m================================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[32m                   JORNADA COMPLETA EXECUTADA COM SUCESSO!                        \x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[32m================================================================================\x1b[0m\n",
  );
  console.log("Para sair do ambiente de teste, pressione CTRL C e ENTER");
}

simularJornadaCLI().catch((err) => {
  console.error("Falha na simulação:", err);
});
