import { ComandoParsed } from "../types/Interfaces.ts";

export class ComandoParser {
  static parse(linha: string): ComandoParsed {
    const tokens = linha.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const flags: Record<string, string> = {};
    const args: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i].replace(/^"|"$/g, "");

      if (token.startsWith("--")) {
        const chave = token.slice(2);
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith("--")) {
          flags[chave] = tokens[i + 1].replace(/^"|"$/g, "");
          i++;
        } else {
          flags[chave] = "true";
        }
      } else {
        args.push(token);
      }
    }

    const acaoPrincipal = args.slice(0, 2).join(" ").toLowerCase();
    const argumentos = args.slice(2);

    return { acaoPrincipal, argumentos, flags };
  }
}
