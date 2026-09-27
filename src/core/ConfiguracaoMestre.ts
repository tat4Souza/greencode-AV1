import path from "path";
import fs from "fs";
import { CriptografiaArquivo } from "./CriptografiaArquivo.ts";

export interface DadosConfiguracaoMestre {
  chaveCriptografiaMestre: string;
  dataCriacao: string;
  inicializado: boolean;
}

export class GerenciadorConfiguracao {
  private static diretorioBase: string = path.join(process.cwd(), "data");

  static definirDiretorio(novoDiretorio: string): void {
    this.diretorioBase = novoDiretorio;
  }

  private static get caminhoConfig(): string {
    return path.join(this.diretorioBase, "config.master.json");
  }

  static existeConfiguracao(): boolean {
    return fs.existsSync(this.caminhoConfig);
  }

  static obterChaveMestra(): string {
    if (!this.existeConfiguracao()) {
      throw new Error(
        "Configuração mestre inexistente. O sistema necessita de provisionamento.",
      );
    }
    const conteudo = fs.readFileSync(this.caminhoConfig, "utf8");
    const config: DadosConfiguracaoMestre = JSON.parse(conteudo);
    return config.chaveCriptografiaMestre;
  }

  static criarConfiguracaoMestre(): string {
    const pastaData = path.dirname(this.caminhoConfig);
    if (!fs.existsSync(pastaData)) {
      fs.mkdirSync(pastaData, { recursive: true });
    }

    const novaChave = CriptografiaArquivo.gerarChave();
    const config: DadosConfiguracaoMestre = {
      chaveCriptografiaMestre: novaChave,
      dataCriacao: new Date().toISOString(),
      inicializado: true,
    };
    const caminhoTemp = `${this.caminhoConfig}.tmp`;
    fs.writeFileSync(caminhoTemp, JSON.stringify(config, null, 2), "utf8");
    fs.renameSync(caminhoTemp, this.caminhoConfig);

    return novaChave;
  }
}
