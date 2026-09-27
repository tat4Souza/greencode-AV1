import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { GerenciadorConfiguracao } from "../src/core/ConfiguracaoMestre.ts";
import { RepositorioArquivo } from "../src/core/RepositorioArquivo.ts";
import { ServicoAutenticacao } from "../src/services/ServicoAutenticacao.ts";
import { ServicoOrganizacao } from "../src/services/ServicoOrganizacao.ts";
import { ServicoLote } from "../src/services/ServicoLote.ts";
import { ServicoEquipamento } from "../src/services/ServicoEquipamento.ts";
import { ServicoParametros } from "../src/services/ServicoParametros.ts";
import { CLIInterface } from "../src/cli/CLIIterface.ts";
import { ServicoRelatorio } from "../src/services/ServicoRelatorio.ts";
import { JournalTransacao } from "../src/core/JournalTransacao.ts";
import { LeitorSenha } from "../src/cli/LeitorSenha.ts";
import { Equipamento } from "../src/models/Equipamento.ts";
import {
  EstadoFisico,
  PapelUsuario,
  TipoEquipamento,
} from "../src/types/Enums.ts";

let total = 0;
let passou = 0;
const falhas: string[] = [];

async function esperarErro(nome: string, fn: () => any | Promise<any>) {
  total++;
  try {
    await fn();
    falhas.push(nome);
    console.log(
      `\x1b[31m[FALHOU]\x1b[0m ${nome} — esperava erro, mas a operação foi aceita.`,
    );
  } catch (e: any) {
    passou++;
    console.log(
      `\x1b[32m[OK]\x1b[0m ${nome} — rejeitado corretamente: "${e.message}"`,
    );
  }
}

async function esperarSucesso(nome: string, fn: () => any | Promise<any>) {
  total++;
  try {
    await fn();
    passou++;
    console.log(`\x1b[32m[OK]\x1b[0m ${nome} — aceito corretamente.`);
  } catch (e: any) {
    falhas.push(nome);
    console.log(
      `\x1b[31m[FALHOU]\x1b[0m ${nome} — deveria ter sido aceito, mas foi rejeitado: "${e.message}"`,
    );
  }
}

function afirmar(nome: string, condicao: boolean, detalhe: string = "") {
  total++;
  if (condicao) {
    passou++;
    console.log(`\x1b[32m[OK]\x1b[0m ${nome}`);
  } else {
    falhas.push(nome);
    console.log(`\x1b[31m[FALHOU]\x1b[0m ${nome} ${detalhe}`);
  }
}

async function main() {
  const pasta = path.join(process.cwd(), "data_teste_regras");
  if (fs.existsSync(pasta)) fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });
  GerenciadorConfiguracao.definirDiretorio(pasta);
  JournalTransacao.definirDiretorio(pasta);

  const chave = randomBytes(32).toString("hex");
  const repo = new RepositorioArquivo(pasta, chave);
  const auth = new ServicoAutenticacao(repo);
  const org = new ServicoOrganizacao(repo);
  const lote = new ServicoLote(repo);
  const equip = new ServicoEquipamento(repo);
  const relatorio = new ServicoRelatorio(repo);
  const params = new ServicoParametros(repo);

  auth.provisionarPrimeiroAdmin("Admin@1234");

  console.log("\n=== BLOCO 1: Autenticação e credenciais ===\n");

  await esperarErro(
    "Provisionar um segundo admin quando o sistema já foi inicializado",
    () => auth.provisionarPrimeiroAdmin("Outra@1234"),
  );

  await esperarErro("Login com senha incorreta", () =>
    auth.login("admin", "senhaErrada"),
  );

  await esperarErro("Login com usuário inexistente", () =>
    auth.login("fantasma", "qualquer"),
  );

  auth.cadastroUsuario(
    "op_teste",
    "Op@123456",
    PapelUsuario.OPERADOR_CADASTRO,
    "admin",
  );
  await esperarErro("Cadastrar usuário com nome já existente", () =>
    auth.cadastroUsuario(
      "op_teste",
      "Outra@123",
      PapelUsuario.OPERADOR_CADASTRO,
      "admin",
    ),
  );

  await esperarErro("Alterar senha informando a senha antiga incorreta", () =>
    auth.alterarSenhaUsuario("op_teste", "SenhaErrada", "NovaSenha@1"),
  );

  await esperarSucesso("Alterar senha com a senha antiga correta", () =>
    auth.alterarSenhaUsuario("op_teste", "Op@123456", "NovaSenha@1"),
  );

  console.log("\n=== BLOCO 2: Parâmetros globais ===\n");

  await esperarErro(
    "Configurar alíquota de imposto fora do intervalo 0-100 (150%)",
    () => params.atualizarParametros(150, 15, "admin"),
  );

  await esperarErro("Configurar alíquota de imposto negativa", () =>
    params.atualizarParametros(-5, 15, "admin"),
  );

  await esperarSucesso(
    "Configurar parâmetros globais com valores válidos",
    () => params.atualizarParametros(12, 20, "admin"),
  );

  console.log("\n=== BLOCO 3: Organização e CNPJ ===\n");

  await esperarErro(
    "Cadastrar organização com CNPJ com dígitos verificadores inválidos",
    () =>
      org.cadastrarOrganizacao(
        {
          razaoSocial: "Empresa Teste LTDA",
          cnpj: "11111111111111",
          valorMensal: 1000,
          dataVencimento: "2027-01-01",
        },
        "op_teste",
      ),
  );

  await esperarErro(
    "Cadastrar organização com CNPJ com quantidade errada de dígitos",
    () =>
      org.cadastrarOrganizacao(
        {
          razaoSocial: "Empresa Teste LTDA",
          cnpj: "123",
          valorMensal: 1000,
          dataVencimento: "2027-01-01",
        },
        "op_teste",
      ),
  );

  const orgValida = org.cadastrarOrganizacao(
    {
      razaoSocial: "Banco Nacional de Crédito S/A",
      cnpj: "33000167000101",
      valorMensal: 15000,
      dataVencimento: "2027-12-31",
    },
    "op_teste",
  );

  await esperarErro(
    "Cadastrar segunda organização com o mesmo CNPJ (unicidade)",
    () =>
      org.cadastrarOrganizacao(
        {
          razaoSocial: "Outra Razão Social LTDA",
          cnpj: "33000167000101",
          valorMensal: 500,
          dataVencimento: "2027-06-01",
        },
        "op_teste",
      ),
  );

  console.log(
    "\n=== BLOCO 4: Regras de data de entrada do lote (90 dias / data futura) ===\n",
  );

  const dataFutura = new Date();
  dataFutura.setDate(dataFutura.getDate() + 5);
  await esperarErro("Criar lote com data de entrada futura", () =>
    lote.criarLote(
      {
        dataEntrada: dataFutura,
        organizacaoId: orgValida.id,
        notaFiscal: "1",
        transportadora: "X",
      },
      "gestor_teste",
    ),
  );

  const dataAntiga = new Date();
  dataAntiga.setDate(dataAntiga.getDate() - 120);
  await esperarErro("Criar lote com data de entrada anterior a 90 dias", () =>
    lote.criarLote(
      {
        dataEntrada: dataAntiga,
        organizacaoId: orgValida.id,
        notaFiscal: "2",
        transportadora: "X",
      },
      "gestor_teste",
    ),
  );

  const loteValido = lote.criarLote(
    {
      dataEntrada: new Date(),
      organizacaoId: orgValida.id,
      notaFiscal: "88990",
      transportadora: "TransLog",
    },
    "gestor_teste",
  );
  afirmar(
    "Criar lote com data de entrada válida (hoje) é aceito",
    !!loteValido.id,
  );

  console.log(
    "\n=== BLOCO 5: Regras de triagem e movimentação de equipamento ===\n",
  );

  const codBarras = equip.gerarCodigoBarras(TipoEquipamento.NOTEBOOK, 1);
  const novoEquip = new Equipamento(
    codBarras,
    TipoEquipamento.NOTEBOOK,
    "Dell",
    "Latitude",
    2021,
    EstadoFisico.BOM_ESTADO,
    1.8,
    loteValido.id,
    0,
  );
  lote.adicionarEquipamentoLote(loteValido.id, novoEquip, "gestor_teste");

  await esperarErro(
    "Movimentar equipamento para AGUARDANDO_DESMONTE antes da triagem do lote",
    () =>
      equip.movimentarEquipamento(
        codBarras,
        "AGUARDANDO_DESMONTE" as any,
        "ALMOXARIFADO",
        "DESMONTE",
        "gestor_teste",
      ),
  );

  await esperarErro(
    "Alterar estado físico com rebaixamento de 2+ categorias SEM justificativa (BOM_ESTADO -> DANIFICADO_GRAVE)",
    () =>
      equip.atualizarEstadoFisico(
        codBarras,
        EstadoFisico.DANIFICADO_GRAVE,
        "",
        "gestor_teste",
      ),
  );

  await esperarSucesso(
    "Alterar estado físico com rebaixamento de 1 categoria SEM justificativa (BOM_ESTADO -> USADO_LEVE)",
    () =>
      equip.atualizarEstadoFisico(
        codBarras,
        EstadoFisico.USADO_LEVE,
        "",
        "gestor_teste",
      ),
  );

  await esperarSucesso(
    "Alterar estado físico com rebaixamento de 2+ categorias COM justificativa",
    () =>
      equip.atualizarEstadoFisico(
        codBarras,
        EstadoFisico.DANIFICADO_GRAVE,
        "Carcaça trincada após queda",
        "gestor_teste",
      ),
  );

  lote.processarTriagem(loteValido.id, "gestor_teste");

  await esperarSucesso(
    "Movimentar equipamento para AGUARDANDO_DESMONTE após a triagem do lote",
    () =>
      equip.movimentarEquipamento(
        codBarras,
        "AGUARDANDO_DESMONTE" as any,
        "ALMOXARIFADO",
        "DESMONTE",
        "gestor_teste",
      ),
  );

  await esperarErro("Rastrear equipamento com código inexistente", () =>
    equip.rastrearEquipamento("GC-NAOEXISTE-000000"),
  );

  console.log("\n=== BLOCO 6: Segregação de papéis via CLI (RBAC) ===\n");

  const senhasMockadas = ["Admin@1234", "NovaSenha@1"];
  LeitorSenha.lerSenha = async () => senhasMockadas.shift() || "x";

  const cli = new CLIInterface(auth, org, lote, equip, relatorio, params);

  await cli.processarComando("login --user admin");
  await esperarErro(
    'Administrador tentar executar comando de Gestor ("lote criar")',
    () =>
      cli.processarComando(
        `lote criar --org ${orgValida.id} --nf 1 --transp X`,
      ),
  );
  await cli.processarComando("logout");

  await cli.processarComando("login --user op_teste");
  afirmar(
    "Sessão de Operador de Cadastro autenticada com o papel correto",
    cli.sessaoAtual?.papel === PapelUsuario.OPERADOR_CADASTRO,
  );
  await esperarErro(
    'Operador de Cadastro tentar executar comando de Administrador ("usuario cadastrar")',
    () =>
      cli.processarComando(
        "usuario cadastrar --user hacker --papel ADMINISTRADOR",
      ),
  );
  await esperarErro(
    'Operador de Cadastro tentar executar comando de Auditor ("relatorio financeiro")',
    () => cli.processarComando("relatorio financeiro"),
  );
  await cli.processarComando("logout");

  console.log(
    '\n=== BLOCO 7: Flag --data em "lote criar" (regra dos 90 dias via CLI) ===\n',
  );

  auth.cadastroUsuario(
    "gestor_cli",
    "Gestor@1234",
    PapelUsuario.GESTOR_ALMOXARIFADO,
    "admin",
  );
  senhasMockadas.length = 0;
  senhasMockadas.push("Gestor@1234");

  await cli.processarComando("login --user gestor_cli");

  await esperarErro('"lote criar --data <futuro>" via CLI', () =>
    cli.processarComando(
      `lote criar --org ${orgValida.id} --nf 900 --transp X --data 2099-01-01`,
    ),
  );

  await esperarErro('"lote criar --data <texto inválido>" via CLI', () =>
    cli.processarComando(
      `lote criar --org ${orgValida.id} --nf 901 --transp X --data nao-e-uma-data`,
    ),
  );

  await esperarErro('"lote criar --data <mais de 90 dias atrás>" via CLI', () =>
    cli.processarComando(
      `lote criar --org ${orgValida.id} --nf 902 --transp X --data 2020-01-01`,
    ),
  );

  const dezDiasAtras = new Date();
  dezDiasAtras.setDate(dezDiasAtras.getDate() - 10);
  const dezDiasAtrasStr = dezDiasAtras.toISOString().split("T")[0];
  await esperarSucesso(
    `"lote criar --data ${dezDiasAtrasStr}" (10 dias atrás, válida) via CLI`,
    () =>
      cli.processarComando(
        `lote criar --org ${orgValida.id} --nf 903 --transp X --data ${dezDiasAtrasStr}`,
      ),
  );

  await cli.processarComando("logout");

  console.log(
    "\n=== BLOCO 9: Expiração de sessão por inatividade (30 min) ===\n",
  );

  senhasMockadas.push("Admin@1234");
  await cli.processarComando("login --user admin");
  if (cli.sessaoAtual) {
    (cli.sessaoAtual as any).expiracao = new Date(Date.now() - 60 * 1000);
  }
  afirmar(
    "Sessão é considerada inválida após passar do tempo de expiração",
    !cli.sessaoAtual!.isValida(),
  );

  await cli.processarComando("ajuda"); // qualquer comando deve detectar a expiração
  afirmar(
    "CLI derruba a sessão automaticamente ao detectar expiração por inatividade",
    cli.sessaoAtual === null,
  );

  console.log("\n=== BLOCO 10: Persistência criptografada e journal ===\n");

  const caminhoCredenciais = path.join(pasta, "credenciais.dat");
  const conteudoBruto = fs.readFileSync(caminhoCredenciais, "utf-8");
  let pareceJsonPlano = false;
  try {
    const parsed = JSON.parse(conteudoBruto);
    pareceJsonPlano =
      Array.isArray(parsed) && parsed.some((c: any) => "hashSenha" in c);
  } catch {
    pareceJsonPlano = false;
  }
  afirmar(
    "Arquivo credenciais.dat NÃO está em texto plano (está de fato cifrado em disco)",
    !pareceJsonPlano,
    "— o arquivo foi lido como JSON legível, o que indica ausência de criptografia.",
  );

  const caminhoJournal = path.join(process.cwd(), "data", "journal.log");
  afirmar(
    "Journal de transações (data/journal.log) existe e recebeu registros durante os testes",
    fs.existsSync(caminhoJournal) && fs.statSync(caminhoJournal).size > 0,
  );

  console.log(
    "\n=== BLOCO 11: Política de retenção do journal (mínimo 180 dias) ===\n",
  );

  const registroAntigo = {
    id: "teste-antigo",
    timestamp: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    operacao: "TESTE_RETENCAO",
    entidade: "Teste",
    dadosAntes: null,
    dadosDepois: null,
    usuarioResponsavel: "teste",
    revertido: false,
  };
  fs.appendFileSync(
    caminhoJournal,
    JSON.stringify(registroAntigo) + "\n",
    "utf-8",
  );

  const linhasAntesRetencao = fs
    .readFileSync(caminhoJournal, "utf-8")
    .trim()
    .split("\n").length;

  JournalTransacao.aplicarPoliticaRetencao(180);

  const linhasDepoisRetencao = fs
    .readFileSync(caminhoJournal, "utf-8")
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const sobrouRegistroAntigo = linhasDepoisRetencao.some((l) =>
    l.includes("teste-antigo"),
  );

  afirmar(
    "aplicarPoliticaRetencao(180) remove do journal.log registros com mais de 180 dias",
    linhasDepoisRetencao.length === linhasAntesRetencao - 1 &&
      !sobrouRegistroAntigo,
    `(linhas antes: ${linhasAntesRetencao}, depois: ${linhasDepoisRetencao.length})`,
  );

  console.log(
    "\n================================================================",
  );
  console.log(`RESULTADO FINAL: ${passou}/${total} verificações passaram.`);
  if (falhas.length > 0) {
    console.log(`\x1b[31mFalharam ${falhas.length}:\x1b[0m`);
    falhas.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(
    "================================================================\n",
  );

  process.exit(falhas.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Falha inesperada na execução dos testes:", err);
  process.exit(1);
});
