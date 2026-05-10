# Máscara de telefone — Framer Code Override

Cole este código no painel de Code Overrides do Framer.
Aplique o override `withPhoneMaskAndNameValidation` nos campos de telefone e nome do formulário.

## Problema resolvido

O `handleBlur` original usava `alert()` + `setTimeout(() => focus())`, o que forçava o foco de volta
ao campo de telefone quando o usuário tentava ir para o próximo campo. Isso fazia o Framer resetar
o valor do input. A validação por `alert` foi removida; a máscara continua funcionando normalmente.

## Código

```javascript
import { forwardRef } from "react"

const processing = new WeakSet()

function setReactValue(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
    )?.set
    nativeSetter?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
}

export function withPhoneMaskAndNameValidation(Component) {
    return forwardRef((props, ref) => {
        function applyPhoneMask(event) {
            const input = event.target
            if (processing.has(input)) return

            let value = input.value.replace(/\D/g, "")
            if (value.length > 11) value = value.slice(0, 11)

            if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
            }

            processing.add(input)
            setReactValue(input, value)
            processing.delete(input)
        }

        function restrictNameInput(event) {
            const input = event.target
            if (processing.has(input)) return

            const regex = /^[a-zA-ZÀ-ſ\s]*$/
            if (!regex.test(input.value)) {
                const cleaned = input.value.replace(/[^a-zA-ZÀ-ſ\s]/g, "")
                processing.add(input)
                setReactValue(input, cleaned)
                processing.delete(input)
            }
        }

        function handleMount(el) {
            if (!el || el.__fdListenersAttached) return

            const input = el.querySelector("input")
            if (!input) return

            if (input.type === "tel") {
                input.addEventListener("input", applyPhoneMask)
            }

            if (input.name === "name" || input.name === "Name") {
                input.addEventListener("input", restrictNameInput)
            }

            el.__fdListenersAttached = true
        }

        return (
            <Component
                {...props}
                ref={(el) => {
                    handleMount(el)
                    if (typeof ref === "function") ref(el)
                    else if (ref) ref.current = el
                }}
            />
        )
    })
}
```

## O que mudou

- **Raiz do problema:** o Framer usa React controlado internamente. Setar `event.target.value` diretamente bypassa o estado do React, então na próxima re-renderização (ao mudar de campo) o React sobrescrevia o DOM com seu estado original, limpando o valor mascarado.
- **Solução:** `setReactValue` usa o native setter do `HTMLInputElement` + `dispatchEvent("input")` para atualizar o estado interno do React junto com o DOM.
- **`WeakSet processing`:** evita recursão infinita — quando `dispatchEvent` re-dispara o evento `input`, o handler detecta que aquele input já está sendo processado e retorna imediatamente.
- Removido `handleBlur` com `alert` + `focus()` (versão anterior) — também causava reset do campo.
