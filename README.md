# Filão — monitor de escala da Biblioteca de Anúncios

Um robô abre a biblioteca de anúncios de cada concorrente todo dia, lê o número de anúncios ativos que aparece na tela e grava. O painel mostra quem está escalando e quem está morrendo, sem você digitar nada.

- **Dado exato**, não estimativa: é o mesmo número que a Meta te mostra.
- **Automático**: roda sozinho no GitHub, com seu computador desligado.
- **Seus arquivos ficam salvos**: os links e todo o histórico moram no repositório, versionados.

---

## Instalação (uma vez, ~15 minutos)

### 1. Suba o projeto para o GitHub
Crie um repositório novo (pode ser **privado**) e envie estes arquivos. Pelo site: **Add file → Upload files**, arraste tudo, **Commit**.

### 2. Dê permissão de escrita ao robô
**Settings → Actions → General → Workflow permissions** → marque **Read and write permissions** → **Save**.
Sem isso o robô lê os números mas não consegue salvar.

### 3. Publique o painel
**Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, pasta `/docs` → **Save**.
Em poucos minutos seu painel está em `https://SEUUSUARIO.github.io/NOMEDOREPO/`.
Repositório privado exige GitHub Pro para o Pages; se for o caso, deixe o repositório público (os links não são segredo) ou abra o `docs/index.html` direto do seu computador.

### 4. Cadastre seus anunciantes
Edite `data/anunciantes.json` (apague os dois exemplos). Cada entrada:

```json
{
  "id": "massageador-loja-x",
  "name": "Loja X — Massageador",
  "tag": "saúde",
  "notes": "oferta 2 por 97",
  "url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=1234567890&media_type=all"
}
```

Antes de copiar o link, deixe o filtro em **Anúncios ativos** e no **país** que você quer. O robô abre exatamente a página do link.
O painel tem um botão **+ Anunciante** que monta esse bloco pronto para você colar.

### 5. Rode a primeira coleta
**Actions → Coletar contagem de anúncios → Run workflow.** Acompanhe o log: cada anunciante sai com ✓ e o número. Depois disso roda sozinho todo dia às **07:00 de Brasília**.

Para mudar o horário, edite o `cron` em `.github/workflows/coletar.yml` (o horário é UTC: Brasília + 3h). Para coletar duas vezes ao dia, adicione outra linha `- cron: '0 22 * * *'`.

---

## Rodar no seu computador (opcional)

```bash
npm install
npx playwright install chromium
npm run coletar
```

Grava em `data/historico.json` igualzinho.

---

## O que esperar

- **Números acima de mil**: a Meta mostra `~1.200`. O arredondamento é dela, não do robô. Abaixo disso o número é cheio.
- **Se uma leitura falhar**, o log marca ✗ e aquele dia fica sem registro para o anunciante — o histórico continua íntegro e a próxima coleta segue normal.
- **Se a Meta mudar o layout**, o robô pode parar de achar o texto. Nesse caso é ajustar a função `extrairNumero` no `scraper/coletar.js` — cinco linhas.
- **Coletar muitos links de uma vez** aumenta a chance de bloqueio. Até uns 40 anunciantes com a pausa atual roda tranquilo. Acima disso, aumente o intervalo entre as visitas.

## Backup

O próprio Git é o backup: cada coleta vira um commit em `data/historico.json`. Nada se perde e dá para voltar no tempo.
