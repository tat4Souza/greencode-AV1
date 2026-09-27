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

async function simularJornadaDeFalhas() {
  const pastaSimulacao = path.join(process.cwd(), "data_simulacao_falhas");

  if (fs.existsSync(pastaSimulacao)) {
    fs.rmSync(pastaSimulacao, { recursive: true, force: true });
  }
  fs.mkdirSync(pastaSimulacao, { recursive: true });

  GerenciadorConfiguracao.definirDiretorio(pastaSimulacao);
  JournalTransacao.definirDiretorio(pastaSimulacao);

  console.log(
    "\n\x1b[1m\x1b[31m================================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[31m                 GREENCODE - JORNADA DE CENÁRIOS DE FALHA                          \x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[31m================================================================================\x1b[0m\n",
  );

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

  // Roteiro de comandos para a jornada de falhas
  const senhasMockadas: string[] = [
    "SenhaFantasma1", // login --user fantasma
    "SenhaErradaAdmin1", // login --user admin (senha errada)
    "Admin@1234", // login --user admin (correto)
    "Op@123456", // usuario cadastrar op_regina
    "Op@123456", // usuario cadastrar op_regina (duplicado, será descartada)
    "Gestor@1234", // usuario cadastrar gestor_bruno
    "Auditor@1234", // usuario cadastrar aud_iris
    "SenhaAntigaErrada1", // senha alterar (senha atual, incorreta)
    "NovaSenhaTeste@1", // senha alterar (nova senha)
    "Op@123456", // login --user op_regina
    "Gestor@1234", // login --user gestor_bruno
    "Auditor@1234", // login --user aud_iris
    "Admin@1234", // login --user admin (para testar expiração de sessão)
  ];

  LeitorSenha.lerSenha = async (promptTexto: string) => {
    const senha = senhasMockadas.shift() ?? "SenhaPadrao123";
    console.log(`${promptTexto}${"*".repeat(senha.length)}`);
    return senha;
  };

  let ultimoLogSucesso = "";
  const originalSucesso = ConsoleLogger.sucesso;
  ConsoleLogger.sucesso = (msg: string) => {
    ultimoLogSucesso = msg;
    originalSucesso(msg);
  };

  const anomalias: string[] = [];
  let totalCenariosFalha = 0;

  const executarNaCLI = async (comando: string): Promise<string> => {
    ultimoLogSucesso = "";
    const prefixo = cli.sessaoAtual
      ? `\x1b[36m[${cli.sessaoAtual.usuario}@greencode]$\x1b[0m `
      : `\x1b[33m[nao_logado@greencode]$\x1b[0m `;

    console.log(`\n${prefixo}\x1b[1m${comando}\x1b[0m`);
    await esperar(80);

    try {
      await cli.processarComando(comando);
    } catch (erro: any) {
      console.log(`\x1b[31m[ERRO]\x1b[0m ${erro.message}`);
    }

    return ultimoLogSucesso;
  };

  const executarEsperandoFalha = async (
    comando: string,
    descricaoCenario: string,
  ): Promise<void> => {
    ultimoLogSucesso = "";
    totalCenariosFalha++;
    await executarNaCLI(comando);
    if (ultimoLogSucesso) {
      anomalias.push(
        `"${descricaoCenario}" — esperava-se uma rejeição, mas o comando "${comando}" foi ACEITO: ${ultimoLogSucesso}`,
      );
    }
  };

  // Tentativas de uso antes de qualquer autenticação

  console.log("\n\x1b[2m--- FASE 0: Comandos sem sessão ativa ---\x1b[0m");

  await executarEsperandoFalha(
    "org listar",
    "Executar comando de negócio sem estar autenticado",
  );

  await executarEsperandoFalha("login", "Tentar logar sem informar --user");

  await executarEsperandoFalha(
    "login --user fantasma",
    "Login com usuário que não existe no sistema",
  );

  await executarEsperandoFalha(
    "login --user admin --pass 123",
    "Tentar enviar a senha diretamente como parâmetro (--pass), prática insegura bloqueada pela CLI",
  );

  //  Login com credenciais erradas

  console.log("\n\x1b[2m--- FASE 1: Login com senha incorreta ---\x1b[0m");

  await executarEsperandoFalha(
    "login --user admin",
    "Login do administrador com senha incorreta",
  );

  // Administrador — falhas de cadastro, parâmetros e alteração de senha

  console.log(
    "\n\x1b[2m--- FASE 2: Administrador autenticado — cenários de falha ---\x1b[0m",
  );

  await executarNaCLI("login --user admin");

  await executarEsperandoFalha(
    "usuario cadastrar --user op_regina --papel PAPEL_QUE_NAO_EXISTE",
    "Cadastrar usuário com papel fora da lista de PapelUsuario",
  );

  await executarEsperandoFalha(
    "usuario cadastrar --papel OPERADOR_CADASTRO",
    "Cadastrar usuário sem informar --user",
  );

  await executarEsperandoFalha(
    "parametros configurar --aliquota 150 --depreciacao 20",
    "Configurar alíquota de imposto acima de 100%",
  );

  await executarEsperandoFalha(
    "parametros configurar --aliquota -5 --depreciacao 20",
    "Configurar alíquota de imposto negativa",
  );

  // Cadastros válidos, necessários para as fases seguintes

  await executarNaCLI(
    "usuario cadastrar --user op_regina --papel OPERADOR_CADASTRO",
  );

  await executarEsperandoFalha(
    "usuario cadastrar --user op_regina --papel OPERADOR_CADASTRO",
    "Cadastrar usuário com nome que já existe",
  );

  await executarNaCLI(
    "usuario cadastrar --user gestor_bruno --papel GESTOR_ALMOXARIFADO",
  );
  await executarNaCLI("usuario cadastrar --user aud_iris --papel AUDITOR");

  await executarEsperandoFalha(
    "lote criar --org qualquer --nf 1 --transp X",
    "Administrador tentar executar um comando fora do seu papel (lote criar é do Gestor)",
  );

  await executarEsperandoFalha(
    "senha alterar",
    "Alterar a própria senha informando a senha atual errada",
  );

  await executarNaCLI("logout");

  // Operador de Cadastro — falhas de RBAC e de cadastro de organização

  console.log(
    "\n\x1b[2m--- FASE 3: Operador de Cadastro — cenários de falha ---\x1b[0m",
  );

  await executarNaCLI("login --user op_regina");

  await executarEsperandoFalha(
    "usuario cadastrar --user hacker --papel ADMINISTRADOR",
    "Operador de Cadastro tentar executar um comando exclusivo do Administrador",
  );

  await executarEsperandoFalha(
    'org cadastrar --razao "Empresa Teste LTDA" --cnpj 11111111111111 --mensal 1000 --venc 2027-01-01',
    "Cadastrar organização com CNPJ de dígitos repetidos (dígitos verificadores inválidos)",
  );

  await executarEsperandoFalha(
    'org cadastrar --razao "Empresa Teste LTDA" --cnpj 123 --mensal 1000 --venc 2027-01-01',
    "Cadastrar organização com CNPJ com quantidade errada de dígitos",
  );

  await executarEsperandoFalha(
    'org cadastrar --razao "Empresa Sem Contrato" --cnpj 33000167000101',
    "Cadastrar organização sem informar --mensal e --venc (parâmetros obrigatórios)",
  );

  // Cadastro válido, necessário para as fases seguintes

  const logOrg = await executarNaCLI(
    'org cadastrar --razao "Hospital Vida Nova" --cnpj 33000167000101 --mensal 8000 --venc 2027-12-31',
  );
  const matchOrg =
    logOrg.match(/ID:\s*([A-Za-z0-9-]+)/i) || logOrg.match(/["']([^"']+)["']/);
  const orgId = matchOrg ? matchOrg[1] : "ORG-001";

  await executarEsperandoFalha(
    'org cadastrar --razao "Outra Clínica LTDA" --cnpj 33000167000101 --mensal 500 --venc 2027-06-01',
    "Cadastrar segunda organização com o mesmo CNPJ (violação de unicidade)",
  );

  await executarEsperandoFalha(
    "org renovar --id ORG-QUE-NAO-EXISTE --venc 2028-01-01",
    "Renovar contrato de uma organização com ID inexistente",
  );

  await executarNaCLI("logout");

  // Gestor de Almoxarifado — falhas de lote e equipamento

  console.log(
    "\n\x1b[2m--- FASE 4: Gestor de Almoxarifado — cenários de falha ---\x1b[0m",
  );

  await executarNaCLI("login --user gestor_bruno");

  await executarEsperandoFalha(
    `lote criar --org ${orgId} --nf 900 --transp TransSaude --data 2099-01-01`,
    "Criar lote com data de entrada futura",
  );

  await executarEsperandoFalha(
    `lote criar --org ${orgId} --nf 901 --transp TransSaude --data nao-e-uma-data`,
    "Criar lote com data em formato inválido",
  );

  await executarEsperandoFalha(
    `lote criar --org ${orgId} --nf 902 --transp TransSaude --data 2020-01-01`,
    "Criar lote com data de entrada anterior a 90 dias",
  );

  await executarEsperandoFalha(
    `lote criar --org ${orgId} --nf 903`,
    "Criar lote sem informar --transp (parâmetro obrigatório)",
  );

  // Lote válido, necessário para os testes de equipamento

  const logLote = await executarNaCLI(
    `lote criar --org ${orgId} --nf 904 --transp TransSaude --obs "Descarte hospitalar"`,
  );
  const matchLote = logLote.match(/ID:\s*([A-Za-z0-9-]+)/i);
  const loteId = matchLote ? matchLote[1] : "LOTE-1";

  await executarEsperandoFalha(
    `equipamento adicionar --lote ${loteId} --tipo CELULAR --marca X --modelo Y --ano 2020 --peso 1`,
    "Adicionar equipamento com tipo fora da lista de TipoEquipamento",
  );

  await executarEsperandoFalha(
    `equipamento adicionar --lote ${loteId} --tipo NOTEBOOK --marca Dell`,
    "Adicionar equipamento sem informar todos os parâmetros obrigatórios",
  );

  // Equipamento válido, necessário para os testes seguintes

  const logEquip = await executarNaCLI(
    `equipamento adicionar --lote ${loteId} --tipo NOTEBOOK --marca Dell --modelo XPS --ano 2019 --peso 2.1`,
  );
  const matchEquip = logEquip.match(/(GC-[A-Za-z0-9-]+)/i);
  const codEquip = matchEquip ? matchEquip[1] : "GC-NOT-0001";

  await executarEsperandoFalha(
    `equipamento movimentar --id ${codEquip} --status AGUARDANDO_DESMONTE`,
    "Movimentar equipamento para desmonte ANTES da triagem do lote",
  );

  await executarEsperandoFalha(
    `equipamento movimentar --id ${codEquip} --status STATUS_INEXISTENTE`,
    "Movimentar equipamento para um status fora da lista de StatusRastreamento",
  );

  await executarEsperandoFalha(
    `equipamento estado --id ${codEquip} --estado ESTADO_INEXISTENTE`,
    "Atualizar estado físico para um valor fora da lista de EstadoFisico",
  );

  await executarEsperandoFalha(
    `equipamento estado --id ${codEquip} --estado INSERVIVEL`,
    "Rebaixar estado físico em 2+ categorias (BOM_ESTADO -> INSERVIVEL) sem justificativa",
  );

  await executarEsperandoFalha(
    "equipamento estado --id ID-QUE-NAO-EXISTE --estado USADO_LEVE",
    "Atualizar estado físico de um equipamento com identificador inexistente",
  );

  await executarEsperandoFalha(
    "equipamento rastrear --id GC-FANTASMA-000000",
    "Rastrear um equipamento com código de barras inexistente",
  );

  await executarEsperandoFalha(
    "lote triagem --id LOTE-QUE-NAO-EXISTE",
    "Processar triagem de um lote com ID inexistente",
  );

  await executarNaCLI("logout");

  // Tentativas de escrita (somente leitura) e comando inválido

  console.log("\n\x1b[2m--- FASE 5: Auditor — cenários de falha ---\x1b[0m");

  await executarNaCLI("login --user aud_iris");

  await executarEsperandoFalha(
    `lote criar --org ${orgId} --nf 1 --transp X`,
    "Auditor (perfil somente-leitura) tentar criar um lote",
  );

  await executarEsperandoFalha(
    `equipamento estado --id ${codEquip} --estado NOVO`,
    "Auditor (perfil somente-leitura) tentar alterar o estado físico de um equipamento",
  );

  await executarEsperandoFalha(
    "relatorio status",
    "Solicitar relatório por status sem informar o parâmetro --status obrigatório",
  );

  await executarEsperandoFalha(
    "gerar-nota-fiscal-fantasma --id 1",
    "Digitar um comando que não existe em nenhum papel do sistema",
  );

  await executarNaCLI("logout");

  // Expiração de sessão por inatividade (30 minutos)

  console.log(
    "\n\x1b[2m--- FASE 6: Expiração de sessão por inatividade ---\x1b[0m",
  );

  await executarNaCLI("login --user admin");

  if (cli.sessaoAtual) {
    (cli.sessaoAtual as any).expiracao = new Date(Date.now() - 60 * 1000);
  }

  await executarEsperandoFalha(
    "usuario cadastrar --user tardio --papel AUDITOR",
    "Executar um comando após a sessão expirar por 30+ minutos de inatividade",
  );

  await executarEsperandoFalha(
    "usuario cadastrar --user tardio --papel AUDITOR",
    "Confirmar que, após a expiração, a sessão foi derrubada e o sistema volta a exigir login",
  );

  console.log(
    "\n\x1b[1m\x1b[31m================================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[31m                JORNADA DE CENÁRIOS DE FALHA EXECUTADA COM SUCESSO!               \x1b[0m",
  );
  console.log(
    "\x1b[1m\x1b[31m================================================================================\x1b[0m\n",
  );

  if (anomalias.length > 0) {
    console.log(
      "\x1b[1m\x1b[41m\x1b[37m ATENÇÃO: CENÁRIOS QUE DEVERIAM FALHAR MAS FORAM ACEITOS PELO SISTEMA \x1b[0m\n",
    );
    anomalias.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log("");
    process.exitCode = 1;
  } else {
    console.log(
      `\x1b[32mTodos os ${totalCenariosFalha} cenários de falha comportaram-se exatamente como esperado (rejeitados pela CLI).\x1b[0m\n`,
    );
  }

  process.exit(anomalias.length > 0 ? 1 : 0);
}

simularJornadaDeFalhas().catch((err) => {
  console.error("Falha inesperada na simulação de cenários de falha:", err);
  process.exitCode = 1;
});
