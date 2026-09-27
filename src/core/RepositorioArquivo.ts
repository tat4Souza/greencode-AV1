import fs from "fs";
import path from "path";
import { CriptografiaArquivo } from "./CriptografiaArquivo.ts";

export class RepositorioArquivo {
  diretorioBase: string;
  private chaveSecreta: string;

  constructor(diretorioBase: string, chaveSecreta: string) {
    this.diretorioBase = diretorioBase;
    this.chaveSecreta = chaveSecreta;

    if (!fs.existsSync(this.diretorioBase)) {
      fs.mkdirSync(this.diretorioBase, { recursive: true });
    }
  }

  listarEntidades<T = any>(nomeArquivo: string): T[] {
    const caminhoFinal = path.join(this.diretorioBase, nomeArquivo);

    if (!fs.existsSync(caminhoFinal)) {
      return [];
    }

    try {
      const conteudoCifrado = fs.readFileSync(caminhoFinal, "utf8");
      if (!conteudoCifrado.trim()) return [];

      const conteudoLegivel = CriptografiaArquivo.decifrar(
        conteudoCifrado,
        this.chaveSecreta,
      );

      return JSON.parse(conteudoLegivel) as T[];
    } catch (err) {
      console.error(
        `Falha ao ler o arquivo criptografado ${nomeArquivo}:`,
        err,
      );
      return [];
    }
  }

  carregarEntidade<T extends { id: string }>(
    nomeArquivo: string,
    id: string,
  ): T | null {
    const lista = this.listarEntidades<T>(nomeArquivo);
    const item = lista.find((entidade) => entidade.id === id);
    return item || null;
  }

  salvarEntidade<T extends { id: string }>(
    nomeArquivo: string,
    entidade: T,
  ): void {
    const lista = this.listarEntidades<T>(nomeArquivo);
    const index = lista.findIndex((item) => item.id === entidade.id);

    if (index >= 0) {
      lista[index] = entidade;
    } else {
      lista.push(entidade);
    }

    this.gravarArquivoAtomico(nomeArquivo, lista);
  }

  excluirEntidade<T extends { id: string }>(
    nomeArquivo: string,
    id: string,
  ): void {
    const lista = this.listarEntidades<T>(nomeArquivo);
    const listaFiltrada = lista.filter((item) => item.id !== id);
    this.gravarArquivoAtomico(nomeArquivo, listaFiltrada);
  }

  private gravarArquivoAtomico(nomeArquivo: string, dados: any[]): void {
    const caminhoFinal = path.join(this.diretorioBase, nomeArquivo);
    const caminhoTemporario = path.join(
      this.diretorioBase,
      `${nomeArquivo}.tmp`,
    );

    const jsonTexto = JSON.stringify(dados, null, 2);
    const conteudoCifrado = CriptografiaArquivo.cifrar(
      jsonTexto,
      this.chaveSecreta,
    );

    fs.writeFileSync(caminhoTemporario, conteudoCifrado, "utf8");
    fs.renameSync(caminhoTemporario, caminhoFinal);
  }
}
