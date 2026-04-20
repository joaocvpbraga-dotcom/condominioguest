# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deploy automatico das Edge Functions

O repositorio inclui o workflow [deploy-supabase-functions.yml](.github/workflows/deploy-supabase-functions.yml) que:

- faz deploy das funcoes `create-user`, `delete-user` e `update-role` (uma a uma);
- valida no fim se os 3 endpoints respondem com HTTP 200 no preflight `OPTIONS`.

O workflow executa em:

- push em `main`/`master` quando houver alteracoes em `supabase/functions/**`;
- execucao manual via `workflow_dispatch`.

### Requisitos no GitHub

Definir o secret do repositorio:

- `SUPABASE_ACCESS_TOKEN`: token pessoal do Supabase com permissao para deploy.

### Secrets das Edge Functions (Supabase)

Para envio de email em ocorrencias com prioridade urgente (`urgente`), define no projeto Supabase:

- `RESEND_API_KEY`: chave da API do Resend.
- `URGENT_ALERT_FROM_EMAIL`: remetente verificado (ex.: `CondoGest <alerts@seudominio.pt>`).

Sem estas variaveis, a ocorrencia continua a ser criada normalmente, mas o envio de email urgente fica desativado.

### Recuperacao manual local (Windows/PowerShell)

Caso precises de forcar deploy fora do GitHub Actions:

```powershell
$env:SUPABASE_ACCESS_TOKEN="SEU_TOKEN"
npm run supabase:deploy:functions
```

O comando acima usa [scripts/deploy-and-validate-functions.ps1](scripts/deploy-and-validate-functions.ps1) e tambem valida os endpoints no final.

## Monitorizacao automatica das Edge Functions

Existe um segundo workflow em [healthcheck-supabase-functions.yml](.github/workflows/healthcheck-supabase-functions.yml) para monitorizacao continua.

- corre automaticamente a cada 30 minutos;
- pode ser executado manualmente via `workflow_dispatch`;
- valida `create-user`, `delete-user` e `update-role` com preflight `OPTIONS`;
- falha o job se algum endpoint nao responder HTTP 200.
