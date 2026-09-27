import { randomUUID } from "crypto";
import { PapelUsuario } from "../../types/Enums.ts";
import { Autenticavel } from "../../types/Interfaces.ts";

export class Sessao implements Autenticavel {
  token: string;
  usuario: string;
  papel: PapelUsuario;
  criacao: Date;
  expiracao: Date;

  constructor(usuario: string, papel: PapelUsuario) {
    this.token = randomUUID();
    this.usuario = usuario;
    this.papel = papel;
    this.criacao = new Date();
    this.expiracao = new Date(Date.now() + 30 * 60 * 1000);
  }

  autenticar(usuario: string, senha: string): boolean {
    return (
      this.isValida() && this.usuario.toLowerCase() === usuario.toLowerCase()
    );
  }

  isValida(): boolean {
    return new Date() < this.expiracao;
  }

  renovar(): void {
    this.expiracao = new Date(Date.now() + 30 * 60 * 1000);
  }

  renovarToken(): string {
    this.token = randomUUID();
    this.renovar();
    return this.token;
  }
}
