import { password } from "@inquirer/prompts";

export class LeitorSenha {
  static async lerSenha(promptTexto: string): Promise<string> {
    const senha = await password({
      message: promptTexto.replace(/:\s*$/, ""),
      mask: "*",
    });

    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }

    return senha.trim();
  }
}
