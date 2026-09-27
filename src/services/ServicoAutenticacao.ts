import { createHash, randomBytes } from "crypto";
import { RepositorioArquivo } from "../core/RepositorioArquivo.ts";
import { PapelUsuario } from "../types/Enums.ts";
import { JournalTransacao } from "../core/JournalTransacao.ts";
import { Credencial } from "../models/Usuario/Credencial.ts";
import { Sessao } from "../models/Usuario/Sessao.ts";

export class ServicoAutenticacao {
  private repositorio: RepositorioArquivo;
  private credenciais: Credencial[] = [];
  private sessoesAtivas: Sessao[] = [];
  private readonly ARQUIVO_CREDENCIAS = "credenciais.dat";

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.carregarCredenciais();
  }

  private carregarCredenciais(): void {
    const dados = this.repositorio.listarEntidades<Credencial>(
      this.ARQUIVO_CREDENCIAS,
    );

    this.credenciais = dados.map((c) => {
      const cred = new Credencial(c.usuario, c.hashSenha, c.salt, c.papel);
      cred.id = c.id;
      cred.ultimoAcesso = new Date(c.ultimoAcesso);
      return cred;
    });
  }

  provisionarPrimeiroAdmin(senhaDefinida: string): Credencial {
    this.carregarCredenciais();
    if (this.credenciais.length > 0) {
      throw new Error("O sistema já possui credenciais configuradas.");
    }

    if (!senhaDefinida || senhaDefinida.trim().length < 6) {
      throw new Error(
        "A senha do administrador deve possuir no mínimo 6 caracteres.",
      );
    }

    const salt = randomBytes(16).toString("hex");
    const hashSenha = createHash("sha256")
      .update(senhaDefinida + salt)
      .digest("hex");

    const admin = new Credencial(
      "admin",
      hashSenha,
      salt,
      PapelUsuario.ADMINISTRADOR,
    );

    new JournalTransacao(
      "PROVISIONAMENTO_INICIAL",
      "Credencial",
      null,
      { usuario: "admin", papel: PapelUsuario.ADMINISTRADOR },
      "SISTEMA",
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_CREDENCIAS, admin);
    this.credenciais.push(admin);

    return admin;
  }

  cadastroUsuario(
    usuario: string,
    senhaPlana: string,
    papel: PapelUsuario,
    usuarioLogado: string,
  ): Credencial {
    this.carregarCredenciais();

    const jaExiste = this.credenciais.some(
      (c) => c.usuario.toLowerCase() === usuario.toLowerCase(),
    );

    if (jaExiste) {
      throw new Error(`O usuário "${usuario}" já existe.`);
    }

    const salt = randomBytes(16).toString("hex");
    const hashSenha = createHash("sha256")
      .update(senhaPlana + salt)
      .digest("hex");
    const novaCredencial = new Credencial(usuario, hashSenha, salt, papel);

    new JournalTransacao(
      "CADASTRAR_USUARIO",
      "Credencial",
      null,
      { usuario, papel },
      usuarioLogado,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_CREDENCIAS, novaCredencial);
    this.credenciais.push(novaCredencial);

    return novaCredencial;
  }

  login(usuario: string, senha: string): Sessao {
    this.carregarCredenciais();
    const credencial = this.credenciais.find(
      (c) => c.usuario.toLowerCase() === usuario.toLowerCase(),
    );

    if (!credencial || !credencial.verificarSenha(senha)) {
      throw new Error("Credenciais inválidas");
    }

    credencial.atualizarUltimoAcesso();
    const novaSessao = new Sessao(credencial.usuario, credencial.papel);

    new JournalTransacao(
      "LOGIN",
      "Sessao",
      null,
      { usuario: credencial.usuario, token: novaSessao.token },
      credencial.usuario,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_CREDENCIAS, credencial);
    this.sessoesAtivas.push(novaSessao);

    return novaSessao;
  }

  logout(token: string): void {
    const sessao = this.sessoesAtivas.find((s) => s.token === token);
    if (sessao) {
      this.sessoesAtivas = this.sessoesAtivas.filter((s) => s.token !== token);
      new JournalTransacao(
        "LOGOUT",
        "Sessao",
        { token },
        null,
        sessao.usuario,
      ).registrar();
    }
  }

  validarToken(token: string): boolean {
    const sessaoIndex = this.sessoesAtivas.findIndex((s) => s.token === token);
    if (sessaoIndex === -1) {
      return false;
    }

    const sessao = this.sessoesAtivas[sessaoIndex];
    if (!sessao.isValida()) {
      this.sessoesAtivas.splice(sessaoIndex, 1);
      return false;
    }

    sessao.renovar();
    return true;
  }

  alterarSenhaUsuario(
    usuario: string,
    senhaAntiga: string,
    senhaNova: string,
  ): boolean {
    this.carregarCredenciais();
    const credencial = this.credenciais.find(
      (c) => c.usuario.toLowerCase() === usuario.toLowerCase(),
    );

    if (!credencial) {
      throw new Error("Utilizador não encontrado.");
    }

    if (!credencial.verificarSenha(senhaAntiga)) {
      throw new Error("Palavra-passe antiga incorreta.");
    }

    const dadosAntes = {
      usuario: credencial.usuario,
      hashSenha: credencial.hashSenha,
      salt: credencial.salt,
    };

    const novoSalt = randomBytes(16).toString("hex");
    const novoHash = createHash("sha256")
      .update(senhaNova + novoSalt)
      .digest("hex");

    credencial.salt = novoSalt;
    credencial.hashSenha = novoHash;

    const dadosDepois = {
      usuario: credencial.usuario,
      hashSenha: credencial.hashSenha,
      salt: credencial.salt,
    };

    new JournalTransacao(
      "ALTERAR_SENHA",
      "Credencial",
      dadosAntes,
      dadosDepois,
      credencial.usuario,
    ).registrar();

    this.repositorio.salvarEntidade(this.ARQUIVO_CREDENCIAS, credencial);

    return true;
  }
}
