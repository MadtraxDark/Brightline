# Brightline

Aplicação local para acompanhar laudos e a avaliação de exemplo da IA. Os dados ficam no navegador.

## Instalar

```
npm install
```

## Desenvolvimento

```
npm run dev
```

O Vite mostra o endereço local no terminal.

## Testes

```
npm test
```

## Versão final

```
npm run build
npm run preview
```

`build` gera a pasta `dist`. `preview` abre essa pasta.

## Trocar os dados

- `src/data/reports.json`: laudos.
- `src/data/extractions_cache.json`: achados extraídos de cada laudo.
- `src/data/evaluation.json`: números e listas da tela Avaliação da IA. Enquanto forem dados de exemplo, mantenha `"example": true`.

## Login de demonstração

A tela `/login` é um portão visual, sem autenticação real. Qualquer e-mail e senha entram. Nenhum dado é enviado ou armazenado. A sessão dura até fechar a aba. Para ver a tela de novo, clique em Sair ou abra uma aba anônima.

## Zerar a demo

Use o botão **Resetar demo** no relógio da barra lateral, ou apague a chave `brightline:v1` do localStorage e recarregue a página.
