export class ConsoleLogger {
  static sucesso(msg: string): void {
    console.log(`\x1b[32m[SUCESSO]\x1b[0m ${msg}`);
  }

  static info(msg: string): void {
    console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`);
  }

  static alerta(msg: string): void {
    console.log(`\x1b[33m[ALERTA]\x1b[0m ${msg}`);
  }

  static erro(msg: string): void {
    console.log(`\x1b[31m[ERRO]\x1b[0m ${msg}`);
  }
}
