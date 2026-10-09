# DashInfojobs Tech

Dashboard estático da Aray Soluções para acompanhar três abas do Google Planilhas: **Vagas InfoJobs**, **Vagas** e **Candidaturas**.

Site: https://llongaray.github.io/DashInfojobs-Tech/

## Organização

- `index.html`: documento e carregamento dos arquivos.
- `assets/css/dashboard.css`: layout responsivo baseado no protótipo MagicPath.
- `assets/js/config.js`: identificadores públicos da integração.
- `assets/js/data.js`: mapeamento dos cabeçalhos, filtros, contagens e validação dos links.
- `assets/js/app.js`: navegação, indicadores, gráficos, tabelas, etapas e detalhes.
- `assets/js/auth.js`: Google OAuth, consulta das abas e ciclo de vida da sessão.

## Uso

Entre com uma conta Google que tenha acesso à planilha. A visão geral mostra indicadores independentes por aba; as oportunidades das duas fontes podem se repetir. Em Oportunidades, escolha a fonte e combine pesquisa, modalidade, status e compatibilidade. Em Candidaturas, alterne entre lista e etapas. Os detalhes mostram todos os campos recebidos da linha.

A consulta lê A:J por inteiro em cada aba, sem o antigo limite de 1.000 linhas. Atualiza a cada 60 segundos enquanto a página está visível; há atualização manual e ao retornar à aba. A autorização expira conforme o prazo fornecido pelo Google: será necessário entrar novamente. Não há atualização em segundo plano com o navegador fechado.

## Configuração Google

No projeto Google Cloud, habilite Google Sheets API e configure um cliente OAuth do tipo Aplicativo da Web. A origem JavaScript autorizada é `https://llongaray.github.io` (sem o caminho do repositório). A integração usa pop-up do Google Identity Services e o escopo `https://www.googleapis.com/auth/spreadsheets.readonly`.

Enquanto o aplicativo estiver em testes, adicione as contas permitidas em Google Auth Platform → Público-alvo → Usuários de teste. A planilha deve permanecer restrita às contas autorizadas.

O ID do cliente e o ID da planilha são públicos. **Nunca adicione client_secret, arquivos de credenciais, tokens ou cópias dos dados ao repositório.** O acesso à API depende do token temporário do usuário e das permissões do Google. Dados e token são mantidos apenas em memória, e removidos ao sair, ao expirar a sessão ou ao perder a autorização. Falhas temporárias de rede preservam os últimos dados com aviso.

## Desenvolvimento e publicação

Sem instalação ou compilação: sirva a pasta com `python -m http.server 8000`. Para login local, cadastre a origem de desenvolvimento no cliente OAuth. Abra o site por HTTP(S); não por `file://`.

GitHub Pages: Deploy from a branch → `main` → `/ (root)`. Mantenha os arquivos de assets junto ao HTML. Ao atualizar arquivos, incremente a versão nos URLs do HTML para evitar cache antigo.

## Validação

Navegação, filtros, paginação, dados vazios e conteúdo não confiável foram verificados com DOM simulado. Leitura de mais de 1.000 linhas, erros da API, expiração e saída foram verificados com respostas Google simuladas. A instalação do navegador de testes estava indisponível neste ambiente; isso não substitui a revisão visual no navegador nem o teste de consentimento na conta real do usuário.
