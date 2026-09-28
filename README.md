# AV1 | Técnicas de Programação

<p align="center">
  <img width="180" height="180" alt="♻️" src="https://github.com/user-attachments/assets/1f47d965-9605-42b7-b80f-b7eea9d559b6" />

  <h2 align="center">Greencode</h2>
</p>

<p align="center">
  | <a href="#papeis">Papéis</a> |
  <a href="#regras">Regras de Negócio</a> |
  <a href="#arquitetura">Arquitetura de Segurança</a> |
  <a href="#executar">Como executar</a> |
  <a href="#falhas">Cenários de Falha</a> |
  <a href="#conclusao">Considerações Finais</a> |
</p>

O **Greencode** é um sistema de linha de comando (CLI) desenvolvido em Node.js e TypeScript, projetado como o núcleo operacional para a gestão e logística reversa de resíduos eletrônicos.
Seu propósito é rastrear o fluxo completo de equipamentos de informática e telecomunicações obsoletos — desde a chegada dos lotes até o destino final (desmonte, reciclagem ou reuso),
garantindo auditoria, segurança e conformidade regulatória.

---

## 👥 Papéis e Permissões do Sistema <a id="papeis"></a>

A aplicação conta com Controle de Acesso Baseado em Papéis (RBAC), adaptando dinamicamente o menu CLI às permissões de cada usuário logado:

- **Administrador**: Responsável pela gestão de contas de acesso e parametrização global do sistema (alíquotas de impostos e coeficientes de depreciação de equipamentos).
- **Operador de Cadastro**: Cadastra e gerencia organizações clientes e seus respectivos contratos.
- **Gestor de Almoxarifado**: Controla o recebimento de lotes, triagem de equipamentos e alocação de códigos de barras internos.
- **Auditor**: Acesso estritamente de leitura para consulta de históricos de rastreabilidade e geração de relatórios.

## 📋 Funcionalidades e Regras de Negócio <a id="regras"></a>

- **Provisionamento Inicial**: Na primeira execução e quando há ausência do arquivo de configuração mestre, o sistema entra em modo de provisionamento para definir a senha do primeiro administrador e gerar a chave criptográfica mestra.
- **Validação de CNPJ**: Unicidade e verificação matemática rigorosa dos dígitos verificadores segundo a legislação brasileira.
- **Regras de Lotes**: Impedimento de cadastro de lotes com data de entrada futura ou anterior a mais de 90 dias.
- **Triagem e Transição de Status**: Um equipamento só pode ser movido para o status de _desmonte_ após passar pela triagem completa.
- **Mudança de Estado Físico**: Exigência de justificativa textual obrigatória sempre que o estado físico de um equipamento regredir duas ou mais categorias.
- **Interface CLI Avançada**: Desenvolvida com a biblioteca `readline`, contando com autocompletar de comandos, parâmetros posicionais/opcionais (`--org`, `--nf`, `--transp`), histórico persistente entre sessões e menus adaptativos ao perfil.

<br>

## 💻 Compatibilidade do Sistema

O sistema foi projetado e validado para execução nativa nos seguintes ambientes:

- **Windows**: Windows 10 ou superior.
- **Linux**: Ubuntu 24.04.3 LTS ou superior (e distribuições derivadas).

---

## 🛡️ Arquitetura de Segurança Adotada <a id="arquitetura"></a>

### 1. Algoritmos de Criptografia

#### 1.1) Criptografia de Arquivos com AES-256 (_Advanced Encryption Standard_ - 256 bits)

O AES-256 é o padrão recomendado para proteção de dados altamente sensíveis, tornando a informação virtualmente inviolável contra ataques de força bruta. Por utilizar criptografia simétrica, oferece alto desempenho com baixo consumo de poder computacional.

Ademais, é a escolha ideal para garantir a confidencialidade de grandes volumes de dados a longo prazo. No sistema, essa camada assegura que os arquivos de persistência gravados em disco (credenciais, organizações, lotes, equipamentos e movimentações) permaneçam estritamente confidenciais. Mesmo em caso de acesso não autorizado aos arquivos locais no sistema operacional, os dados permanecerão indecifráveis sem a chave mestra.

#### 1.2) Hashing de Senhas com SHA-256 (_Secure Hash Algorithm 256-bit_)

Por ser um algoritmo de _hash_ criptográfico unidirecional (_one-way_), o SHA-256 garante que o texto puro da senha jamais seja armazenado. No escopo da aplicação, esse mecanismo assegura a integridade do controle de acesso, impedindo que inclusive os administradores do sistema consigam reverter o _hash_ para obter a senha original do usuário.

### 2. Política de Expiração de Sessão

Como o Greencode opera em ambiente de linha de comando (CLI), o encerramento automático de sessão por tempo limite de inatividade minimiza os riscos de acesso não autorizado decorrentes de terminais abandonados.

Esta abordagem adota boas práticas de segurança, garantindo:

- **Proteção em Dispositivos Compartilhados:** Evita o uso indevido da conta por terceiros caso o operador se ausente sem efetuar o _logout_;
- **Proteção de Dados Sensíveis:** Garante que informações confidenciais não fiquem expostas após um período de inatividade;
- **Gestão Eficiente de Recursos:** Auxilia na liberação de recursos do sistema ao encerrar sessões obsoletas.

### 3. Resiliência de Dados: Escrita Atômica e Journaling

#### 3.1) Escrita Atômica

As operações de gravação e atualização utilizam arquivos temporários seguidos de renomeação atômica no nível do sistema de arquivos. Em escritas tradicionais, interrupções repentinas (como falha de energia ou encerramento forçado) podem gerar arquivos corrompidos. Com a escrita atômica, esse risco é eliminado: o arquivo original só é substituído quando a nova versão estiver 100% gravada no disco.

#### 3.2) Journal de Transações

Todas as operações de alteração de estado são registradas em um log de _journal_ imutável antes da consolidação final no disco. Essa estratégia garante auditabilidade completa, rastreabilidade fiel de todas as ações executadas e capacidade de recuperação do histórico da plataforma em caso de falhas mecânicas ou de sistema.

#### 3.3) Política de Retenção e Rotação

O arquivo de _journal_ é mantido por um período mínimo de **180 dias**, contando com rotação automática de log sempre que o arquivo atingir o limite de **10 MB**. Essa política preserva a integridade do histórico operacional e assegura a sustentabilidade do armazenamento ao longo do ciclo de vida da aplicação.

<br>

---

## 🚀 Como executar: <a id="executar"></a>

### 1. Instalar dependências:

```bash
npm install
```

### 2. Compilar a aplicação (Build)

```bash
npm run build
```

### 3. Executar a aplicação

```bash
npm run start
```

### 4. Executar os scripts de teste

```bash
#Testa a jornada completa pela cli
npm run test

#Testa a jornada de falhas com os 37 possíveis cenários
npm run test:falhas

#Testa as regras de negócio exigidas
npm run test:regras
```

> 💡 Dica: _Em caso de dúvidas, consulte o arquivo `package.json` na raiz do projeto._

<br>

---

## 🚩 Cenários de Falha Testados e Respostas do Sistema <a id="falhas"></a>

> Todos os 37 cenários de falha previstos e testados no script `jornada_falhas.ts` foram validados com sucesso pela CLI. Abaixo consta o mapeamento completo dos testes de execução, divididos por perfil e fase
> de execução, com as respectivas saídas e níveis de severidade exibidos pelo sistema.

<br>

### 1. Acesso Global, Autenticação e Credenciais

| Cenário / Descrição do Teste   | Comando / Entrada               | Resposta do Sistema / Log Exibido                                                                                 | Severidade |
| :----------------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------- | :--------- |
| **Comando sem sessão ativa**   | `org listar`                    | `[ERRO] Acesso negado: Para prosseguir, efetue o login utilizando o comando: login --user <usuario>`              | `ERROR`    |
| **Login sem indicar `--user`** | `login`                         | `[ERRO] O nome de usuário é obrigatório. Uso: login --user <usuario>`                                             | `ERROR`    |
| **Usuário inexistente**        | `login --user fantasma`         | `[ERRO] Credenciais inválidas. Verifique o usuário e a senha informados.`                                         | `ERROR`    |
| **Passagem de senha via flag** | `login --user admin --pass 123` | `[ERRO] Por motivos de segurança, a senha não deve ser passada como parâmetro. Digite apenas: login --user admin` | `ERROR`    |
| **Senha incorreta no login**   | `login --user admin`            | `[ERRO] Credenciais inválidas. Verifique o usuário e a senha informados.`                                         | `ERROR`    |

---

### 2. Perfil: Administrador

| Cenário / Descrição do Teste  | Comando / Entrada                                                 | Resposta do Sistema / Log Exibido                                                                                              | Severidade |
| :---------------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------- |
| **Papel de usuário inválido** | `usuario cadastrar --user op_regina --papel PAPEL_QUE_NAO_EXISTE` | `[ERRO] Papel inválido "PAPEL_QUE_NAO_EXISTE". Opções aceitas: ADMINISTRADOR, OPERADOR_CADASTRO, GESTOR_ALMOXARIFADO, AUDITOR` | `ERROR`    |
| **Cadastro sem `--user`**     | `usuario cadastrar --papel OPERADOR_CADASTRO`                     | `[ERRO] Especificar o nome do usuário (--user) é obrigatório.`                                                                 | `ERROR`    |
| **Alíquota acima de 100%**    | `parametros configurar --aliquota 150 --depreciacao 20`           | `[ERRO] A alíquota de impostos deve estar entre 0% e 100%.`                                                                    | `ERROR`    |
| **Alíquota negativa**         | `parametros configurar --aliquota -5 --depreciacao 20`            | `[ERRO] A alíquota de impostos deve estar entre 0% e 100%.`                                                                    | `ERROR`    |
| **Usuário duplicado**         | `usuario cadastrar --user op_regina --papel OPERADOR_CADASTRO`    | `[ERRO] O usuário "op_regina" já existe.`                                                                                      | `ERROR`    |
| **Violação de escopo (RBAC)** | `lote criar --org qualquer --nf 1 --transp X`                     | `[ERRO] Comando "lote criar" não reconhecido para o perfil Administrador.`                                                     | `ERROR`    |
| **Senha atual incorreta**     | `senha alterar`                                                   | `[ERRO] Palavra-passe antiga incorreta.`                                                                                       | `ERROR`    |

---

### 3. Perfil: Operador de Cadastro

| Cenário / Descrição do Teste         | Comando / Entrada                                                                                  | Resposta do Sistema / Log Exibido                                                                                                                       | Severidade |
| :----------------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------- |
| **Violação de escopo (RBAC)**        | `usuario cadastrar --user hacker --papel ADMINISTRADOR`                                            | `[ERRO] Comando "usuario cadastrar" não reconhecido para Operador de Cadastro.`                                                                         | `ERROR`    |
| **CNPJ com dígitos repetidos**       | `org cadastrar --razao "Empresa Teste LTDA" --cnpj 11111111111111 --mensal 1000 --venc 2027-01-01` | `[ERRO] CNPJ inválido: CNPJ deve conter 14 dígitos válidos e não repetidos.`                                                                            | `ERROR`    |
| **CNPJ com tamanho incorreto**       | `org cadastrar --razao "Empresa Teste LTDA" --cnpj 123 --mensal 1000 --venc 2027-01-01`            | `[ERRO] CNPJ inválido: CNPJ deve conter 14 dígitos válidos e não repetidos.`                                                                            | `ERROR`    |
| **Parâmetros obrigatórios ausentes** | `org cadastrar --razao "Empresa Sem Contrato" --cnpj 33000167000101`                               | `[ERRO] Uso: org cadastrar --razao <nome> --cnpj <cnpj> --mensal <valor> --venc <AAAA-MM-DD> [--ie <ie>] [--end <end>] [--tel <tel>] [--email <email>]` | `ERROR`    |
| **CNPJ duplicado**                   | `org cadastrar --razao "Outra Clínica LTDA" --cnpj 33000167000101 --mensal 500 --venc 2027-06-01`  | `[ERRO] Já existe uma organização cadastrada com o CNPJ 33000167000101`                                                                                 | `ERROR`    |
| **ID de organização inexistente**    | `org renovar --id ORG-QUE-NAO-EXISTE --venc 2028-01-01`                                            | `[ERRO] Organização com ID "ORG-QUE-NAO-EXISTE" não encontrada.`                                                                                        | `ERROR`    |

---

### 4. Perfil: Gestor de Almoxarifado

| Cenário / Descrição do Teste                 | Comando / Entrada                                                                           | Resposta do Sistema / Log Exibido                                                                                                                          | Severidade |
| :------------------------------------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- |
| **Data de lote futura**                      | `lote criar --org <id> --nf 900 --transp TransSaude --data 2099-01-01`                      | `[ERRO] Data de entrada inválida: Data de entrada não pode ser futura.`                                                                                    | `ERROR`    |
| **Data em formato inválido**                 | `lote criar --org <id> --nf 901 --transp TransSaude --data nao-e-uma-data`                  | `[ERRO] Data "nao-e-uma-data" inválida. Utilize o formato AAAA-MM-DD.`                                                                                     | `ERROR`    |
| **Data anterior a 90 dias**                  | `lote criar --org <id> --nf 902 --transp TransSaude --data 2020-01-01`                      | `[ERRO] Data de entrada inválida: Data de entrada náo pode ser anterior a 90 dias.`                                                                        | `ERROR`    |
| **Parâmetros obrigatórios ausentes**         | `lote criar --org <id> --nf 903`                                                            | `[ERRO] Uso: lote criar --org <id> --nf <numero> --transp <nome> [--obs <texto>] [--data <AAAA-MM-DD>]`                                                    | `ERROR`    |
| **Tipo de equipamento inválido**             | `equipamento adicionar --lote <id> --tipo CELULAR --marca X --modelo Y --ano 2020 --peso 1` | `[ERRO] Tipo inválido "CELULAR". Valores aceitos: COMPUTADOR_MESA, NOTEBOOK, MONITOR, IMPRESSORA, SERVIDOR, ROTEADOR, CABO_ESTRUTURADO, FONTE_ALIMENTACAO` | `ERROR`    |
| **Campos obrigatórios ausentes**             | `equipamento adicionar --lote <id> --tipo NOTEBOOK --marca Dell`                            | `[ERRO] Uso: equipamento adicionar --lote <id> --tipo <TIPO> --marca <m> --modelo <mod> --ano <ano> --peso <kg>`                                           | `ERROR`    |
| **Desmonte sem triagem**                     | `equipamento movimentar --id GC-NOT-816502 --status AGUARDANDO_DESMONTE`                    | `[ERRO] Equipamento só pode ser encaminhado para desmonte após triagem completa.`                                                                          | `ERROR`    |
| **Status de rastreio inválido**              | `equipamento movimentar --id GC-NOT-816502 --status STATUS_INEXISTENTE`                     | `[ERRO] Status de rastreamento inválido "STATUS_INEXISTENTE". Valores aceitos: ...`                                                                        | `ERROR`    |
| **Estado físico inválido**                   | `equipamento estado --id GC-NOT-816502 --estado ESTADO_INEXISTENTE`                         | `[ERRO] Estado físico inválido "ESTADO_INEXISTENTE". Valores aceitos: ...`                                                                                 | `ERROR`    |
| **Rebaixamento de estado sem justificativa** | `equipamento estado --id GC-NOT-816502 --estado INSERVIVEL`                                 | `[ERRO] Rebaixamento de 2 ou mais categorias (BOM_ESTADO -> INSERVIVEL) exige justificativa textual obrigatória.`                                          | `ERROR`    |
| **Equipamento inexistente**                  | `equipamento estado --id ID-QUE-NAO-EXISTE --estado USADO_LEVE`                             | `[ERRO] Equipamento com identificador "ID-QUE-NAO-EXISTE" não encontrado.`                                                                                 | `ERROR`    |
| **Código de barras inexistente**             | `equipamento rastrear --id GC-FANTASMA-000000`                                              | `[ERRO] Equipamento com identificador "GC-FANTASMA-000000" não encontrado.`                                                                                | `ERROR`    |
| **Lote para triagem inexistente**            | `lote triagem --id LOTE-QUE-NAO-EXISTE`                                                     | `[ERRO] Lote com ID "LOTE-QUE-NAO-EXISTE" não encontrado.`                                                                                                 | `ERROR`    |

---

### 5. Perfil: Auditor e Comandos Gerais

| Cenário / Descrição do Teste                | Comando / Entrada                                     | Resposta do Sistema / Log Exibido                                           | Severidade |
| :------------------------------------------ | :---------------------------------------------------- | :-------------------------------------------------------------------------- | :--------- |
| **Tentar criar lote (Somente Leitura)**     | `lote criar --org <id> --nf 1 --transp X`             | `[ERRO] Comando "lote criar" não reconhecido para Auditor.`                 | `ERROR`    |
| **Tentar alterar estado (Somente Leitura)** | `equipamento estado --id GC-NOT-816502 --estado NOVO` | `[ERRO] Comando "equipamento estado" não reconhecido para Auditor.`         | `ERROR`    |
| **Relatório sem parâmetro obrigatório**     | `relatorio status`                                    | `[ERRO] Uso: relatorio status --status <RECEBIDO\|AGUARDANDO_TRIAGEM\|...>` | `ERROR`    |
| **Comando inexistente**                     | `gerar-nota-fiscal-fantasma --id 1`                   | `[ERRO] Comando "gerar-nota-fiscal-fantasma" não reconhecido para Auditor.` | `ERROR`    |

---

### 6. Inatividade e Expiração de Sessão

| Cenário / Descrição do Teste        | Comando / Entrada                                 | Resposta do Sistema / Log Exibido                                                                    | Severidade |
| :---------------------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------------- | :--------- |
| **Sessão inativa por 30+ minutos**  | `usuario cadastrar --user tardio --papel AUDITOR` | `[ALERTA] Sua sessão expirou por inatividade (limite de 30 min). Faça login novamente.`              | `WARN`     |
| **Execução imediata pós-expiração** | `usuario cadastrar --user tardio --papel AUDITOR` | `[ERRO] Acesso negado: Para prosseguir, efetue o login utilizando o comando: login --user <usuario>` | `ERROR`    |

<br>

---

## 📝 Considerações finais para a próxima etapa: <a id="conclusao"></a>

A estrutura desenvolvida para o **GreenCode** nesta etapa CLI cria uma base sólida, organizada e segura. Como as regras de negócio, as validações e as travas de segurança foram mantidas separadas da interface de terminal, o sistema está pronto para evoluir para a Web e para um banco de dados relacional de forma simples e direta.

### 1. Preparação para a Interface Web

- **Regras de Negócio Isoladas:** Todo o funcionamento do sistema (triagem de equipamentos, controle de lotes, validação de regras e permissões) já está pronto em módulos independentes. Para criar a versão Web, basta conectar esses módulos a uma API (como REST), sem precisar refazer as regras que garantem o funcionamento do negócio.
- **Segurança e Acesso na Web:** O modelo atual de permissões por perfil (RBAC) e tempo de expiração de sessão será adaptado para o padrão Web através de tokens de acesso (como JWT), mantendo os mesmos níveis de proteção e controle de usuário.

### 2. Transição para Banco de Dados Relacional

- **Estrutura de Dados Pronta para Tabelas:** As informações salvas atualmente nos arquivos do sistema (Organizações, Lotes, Equipamentos, Usuários e Histórico) já seguem uma estrutura organizada. Isso facilita a criação direta das tabelas no banco de dados relacional, garantindo que relacionamentos (como vincular um equipamento a um lote) e regras de unicidade (como não repetir CNPJ) funcionem de forma nativa.
- **Rastreabilidade Automática com _Triggers_:** Para manter a regra do _Journal_ (histórico imutável de todas as ações), será utilizado de **gatilhos (_triggers_)** diretamente no banco de dados. Assim, sempre que houver uma movimentação em alguma entidade, o próprio banco registrará automaticamente esse evento na tabela de histórico. Isso garante que nenhum dado seja alterado sem deixar um registro do que aconteceu.

<br>

---

<sub>Taís Souza · 2º DSM · Fatec SJC · 2026-2</sub>

---
