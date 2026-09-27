import fs from "fs";
import path from "path";

export class HistoricoCLI {
  private caminhoArquivo: string;

  constructor(pastaData: string = path.join(process.cwd(), "data")) {
    this.caminhoArquivo = path.join(pastaData, ".cli_history");
  }

  carregar(): string[] {
    try {
      if (fs.existsSync(this.caminhoArquivo)) {
        const conteudo = fs.readFileSync(this.caminhoArquivo, "utf-8");
        return conteudo.split("\n").filter((linha) => linha.trim().length > 0);
      }
    } catch {}
    return [];
  }

  adicionar(comando: string): void {
    if (!comando.trim()) return;
    try {
      fs.appendFileSync(this.caminhoArquivo, `${comando.trim()}\n`, "utf-8");
    } catch {}
  }
}
