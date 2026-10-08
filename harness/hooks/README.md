# Hook local

El hook pre-commit ejecuta `git diff --cached --check` para detectar whitespace conflictivo. No instala dependencias ni reemplaza tests. Se activa por checkout local con:

```powershell
git config core.hooksPath .githooks
```

Para desactivarlo en este checkout: `git config --unset core.hooksPath`.
