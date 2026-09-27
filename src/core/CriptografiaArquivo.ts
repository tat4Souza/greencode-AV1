import * as crypto from "node:crypto";

export class CriptografiaArquivo {
  private static readonly ALGORITHM = "aes-256-cbc";

  static gerarChave(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static cifrar(dados: string, chave: string): string {
    const key = crypto.createHash("sha256").update(chave).digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let cifrado = cipher.update(dados, "utf8", "hex");
    cifrado += cipher.final("hex");

    return `${iv.toString("hex")}:${cifrado}`;
  }

  static decifrar(dadosCifrados: string, chave: string): string {
    const [ivHex, textoCifrado] = dadosCifrados.split(":");
    if (!ivHex || !textoCifrado) {
      throw new Error("Conteúdo cifrado inválido ou corrompido");
    }

    const key = crypto.createHash("sha256").update(chave).digest();
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    let decifrado = decipher.update(textoCifrado, "hex", "utf8");
    decifrado += decipher.final("utf8");

    return decifrado;
  }
}
