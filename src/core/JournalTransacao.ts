import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

export class JournalTransacao {
  id: string;
  timestamp: Date;
  operacao: string;
  entidade: string;
  dadosAntes: any;
  dadosDepois: any;
  usuarioResponsavel: string;
  revertido: boolean;

  private static diretorioBase: string = path.join(process.cwd(), "data");

  static definirDiretorio(novoDiretorio: string): void {
    this.diretorioBase = novoDiretorio;
  }

  private static get caminhoArquivo(): string {
    return path.join(this.diretorioBase, "journal.log");
  }

  constructor(
    operacao: string,
    entidade: string,
    dadosAntes: any,
    dadosDepois: any,
    usuarioResponsavel: string,
  ) {
    this.id = randomUUID();
    this.timestamp = new Date();
    this.operacao = operacao;
    this.entidade = entidade;
    this.dadosAntes = dadosAntes;
    this.dadosDepois = dadosDepois;
    this.usuarioResponsavel = usuarioResponsavel;
    this.revertido = false;
  }

  registrar(): void {
    const pastaData = path.dirname(JournalTransacao.caminhoArquivo);
    if (!fs.existsSync(pastaData)) {
      fs.mkdirSync(pastaData, { recursive: true });
    }

    if (fs.existsSync(JournalTransacao.caminhoArquivo)) {
      const stats = fs.statSync(JournalTransacao.caminhoArquivo);
      const dezMegabytes = 10 * 1024 * 1024;
      if (stats.size >= dezMegabytes) {
        const backupPath = path.join(
          pastaData,
          `journal-${Date.now()}.log.bak`,
        );
        fs.renameSync(JournalTransacao.caminhoArquivo, backupPath);
      }
    }

    const linhaLog =
      JSON.stringify({
        id: this.id,
        timestamp: this.timestamp.toISOString(),
        operacao: this.operacao,
        entidade: this.entidade,
        dadosAntes: this.dadosAntes,
        dadosDepois: this.dadosDepois,
        usuarioResponsavel: this.usuarioResponsavel,
        revertido: this.revertido,
      }) + "\n";

    fs.appendFileSync(JournalTransacao.caminhoArquivo, linhaLog, "utf-8");
  }

  reverter(): boolean {
    this.revertido = true;
    return true;
  }

  static aplicarPoliticaRetencao(diasRetencaoMinima: number = 180): void {
    if (!fs.existsSync(this.caminhoArquivo)) return;

    const conteudo = fs.readFileSync(this.caminhoArquivo, "utf-8");
    const linhas = conteudo.split("\n").filter((l) => l.trim().length > 0);

    if (linhas.length === 0) return;

    const limite = new Date();
    limite.setDate(limite.getDate() - diasRetencaoMinima);

    const linhasRetidas = linhas.filter((linha) => {
      try {
        const registro = JSON.parse(linha);
        return new Date(registro.timestamp) >= limite;
      } catch {
        return true;
      }
    });

    if (linhasRetidas.length === linhas.length) return;

    const caminhoTemp = `${this.caminhoArquivo}.tmp`;
    const novoConteudo =
      linhasRetidas.length > 0 ? linhasRetidas.join("\n") + "\n" : "";
    fs.writeFileSync(caminhoTemp, novoConteudo, "utf-8");
    fs.renameSync(caminhoTemp, this.caminhoArquivo);
  }

  static limparBackupsAntigos(diasRetencaoMinima: number = 180): void {
    const pastaData = path.dirname(this.caminhoArquivo);
    if (!fs.existsSync(pastaData)) return;

    const limiteMs = Date.now() - diasRetencaoMinima * 24 * 60 * 60 * 1000;

    const arquivos = fs
      .readdirSync(pastaData)
      .filter((f) => f.startsWith("journal-") && f.endsWith(".log.bak"));

    for (const nomeArquivo of arquivos) {
      const caminho = path.join(pastaData, nomeArquivo);
      const stats = fs.statSync(caminho);
      if (stats.mtimeMs < limiteMs) {
        fs.unlinkSync(caminho);
      }
    }
  }
}
