// app/hub/comercial/components/pages/MetasComercial.tsx
// Tela "Metas" do Comercial B2B — quem tem a permissão 'comercial-metas'
// (admin do hub) preenche a meta mensal da empresa em 3 faixas (R$). Ao salvar,
// grava NA PLANILHA "Comercial & Marketing — Quintal HUB" (aba metas_b2b_mensal),
// que o Resumo já usa. O editor é o mesmo das metas de Reservas.

'use client'

import MetasFaixasEditor from '@/app/hub/_componentes/MetasFaixasEditor'

export default function MetasComercial() {
  return (
    <MetasFaixasEditor
      titulo="Metas do Comercial B2B"
      descricao={
        <>
          Meta mensal da empresa em 3 faixas (sem divisão por casa). Ao salvar, os valores vão para a planilha
          <b> Comercial &amp; Marketing — Quintal HUB</b> (aba metas_b2b_mensal), que o Resumo já usa.
        </>
      }
      endpoint="/api/comercial/metas"
      formato="moeda"
    />
  )
}
