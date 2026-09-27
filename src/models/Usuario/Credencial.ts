import { createHash, randomUUID } from "crypto";
import { PapelUsuario } from "../../types/Enums.ts";
import { Autenticavel } from "../../types/Interfaces.ts";

export class Credencial implements Autenticavel {
  id: string;
  usuario: string;
  hashSenha: string;
  salt: string;
  ultimoAcesso: Date;
  papel: PapelUsuario;

  constructor(
    usuario: string,
    hashSenha: string,
    salt: string,
    papel: PapelUsuario,
  ) {
    this.id = randomUUID();
    this.usuario = usuario;
    this.hashSenha = hashSenha;
    this.salt = salt;
    this.ultimoAcesso = new Date();
    this.papel = papel;
  }

  autenticar(usuario: string, senha: string): boolean {
    if (this.usuario.toLowerCase() !== usuario.toLowerCase()) {
      return false;
    }
    return this.verificarSenha(senha);
  }

  renovarToken(): string {
    this.atualizarUltimoAcesso();
    return randomUUID();
  }

  verificarSenha(senhaPlana: string): boolean {
    const hashCalculado = createHash("sha256")
      .update(senhaPlana + this.salt)
      .digest("hex");
    return this.hashSenha === hashCalculado;
  }

  atualizarUltimoAcesso(): void {
    this.ultimoAcesso = new Date();
  }
}
