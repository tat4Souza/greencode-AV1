export abstract class Validador {
  abstract validar(objeto: any): boolean;
  abstract obterMensagemErro(): string;
}

export class ValidadorCNPJ extends Validador {
  private erroMsg: string = "";

  validarCNPJ(cnpj: string): boolean {
    const limpo = cnpj.replace(/[^\d]/g, "");

    if (limpo.length !== 14 || /^(\d)\1+$/.test(limpo)) {
      this.erroMsg = "CNPJ deve conter 14 dígitos válidos e não repetidos.";
      return false;
    }

    const calcDigito = (fatia: string, pesos: number[]): number => {
      let soma = 0;
      for (let i = 0; i < fatia.length; i++) {
        soma += parseInt(fatia[i], 10) * pesos[i];
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = calcDigito(limpo.slice(0, 12), pesos1);
    const d2 = calcDigito(limpo.slice(0, 13), pesos2);

    const valido =
      d1 === parseInt(limpo[12], 10) && d2 === parseInt(limpo[13], 10);
    if (!valido) {
      this.erroMsg = "Dígitos verificadores do CNPJ são inválidos.";
    }
    return valido;
  }

  validar(objeto: any): boolean {
    return this.validarCNPJ(String(objeto));
  }

  obterMensagemErro(): string {
    return this.erroMsg;
  }
}

export class ValidadorDataEntrada extends Validador {
  private erroMsg: string = "";

  validarData(data: Date): boolean {
    const agora = new Date();
    const noventaDiasAtras = new Date();
    noventaDiasAtras.setDate(agora.getDate() - 90);

    if (data > agora) {
      this.erroMsg = "Data de entrada não pode ser futura.";
      return false;
    }

    if (data < noventaDiasAtras) {
      this.erroMsg = "Data de entrada não pode ser anterior a 90 dias.";
      return false;
    }

    return true;
  }

  validar(objeto: any): boolean {
    return this.validarData(new Date(objeto));
  }

  obterMensagemErro(): string {
    return this.erroMsg;
  }
}
