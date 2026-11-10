# Logística Reversa — Varejo de Energia

Gestão do fluxo reverso de produtos vendidos por um e-commerce/varejo do setor de energia (painéis solares, inversores, baterias, medidores, iluminação LED, cabos): do retorno do produto até sua destinação final, com os custos e os impactos ambientais envolvidos.

## Pessoas e papéis

**Cliente**:
Pessoa física ou jurídica que comprou um produto do varejista e o devolve.
_Avoid_: Consumidor, comprador, usuário

**Operador de Recebimento**:
Papel responsável por registrar a chegada física dos produtos devolvidos.
_Avoid_: Almoxarife, recebedor

**Analista de Triagem**:
Papel responsável por inspecionar os itens devolvidos e decidir sua destinação.
_Avoid_: Inspetor, técnico

**Gestor**:
Papel que acompanha custos e indicadores e administra cadastros.
_Avoid_: Administrador, supervisor

## Catálogo

**Produto**:
Item do catálogo do varejista, com categoria, garantia e uma composição de materiais.
_Avoid_: SKU, mercadoria, artigo

**Material**:
Substância que compõe um produto (vidro, alumínio, lítio, cobre…), com fator de emissão evitada, preço de sucata e classificação de reciclável e perigoso.
_Avoid_: Insumo, componente, resíduo

**Composição**:
Massa, em kg, de cada material presente em uma unidade de um produto.
_Avoid_: Ficha técnica, BOM

## Fluxo reverso

**Devolução**:
Solicitação de retorno de um ou mais produtos de um cliente, com canal, motivo e status próprios.
_Avoid_: Pedido de devolução, RMA, chamado, retorno

**Item Devolvido**:
Uma unidade física dentro de uma devolução; é a unidade de inspeção, destinação e custo.
_Avoid_: Linha, produto devolvido

**Canal**:
Natureza do retorno: **Pós-venda** (retorno logo após a compra: arrependimento, defeito, avaria, garantia) ou **Pós-consumo** (produto em fim de vida útil entregue para destinação adequada).
_Avoid_: Tipo, origem

**Motivo**:
Razão declarada para a devolução, dentro de um canal (ex.: arrependimento, defeito, fim de vida útil).
_Avoid_: Causa, justificativa

**Status da Devolução**:
Etapa do ciclo de vida: Solicitada → Em trânsito → Recebida → Em triagem → Destinada → Encerrada; ou Recusada.
_Avoid_: Fase, estado

**Recusa**:
Encerramento de uma devolução sem aceitá-la, por estar fora da política (prazo, condição); possível em Solicitada ou Recebida.
_Avoid_: Cancelamento, rejeição

**Condição**:
Classificação de um item devolvido após inspeção: A (como novo), B (uso aparente, funcional), C (defeituoso reparável), D (irrecuperável).
_Avoid_: Estado, grade, qualidade

**Destinação**:
Caminho final de um item devolvido, em ordem de prioridade: Retorno ao estoque, Recondicionamento, Devolução ao fornecedor, Desmontagem para peças, Reciclagem, Descarte adequado.
_Avoid_: Disposição, destino, encaminhamento

**Segunda Vida**:
Recondicionamento de um produto de pós-consumo ainda funcional para revenda como usado; ele nunca volta ao estoque como novo.
_Avoid_: Seminovo, reuso

**Descarte adequado**:
Disposição final ambientalmente adequada (aterro industrial, coprocessamento) do que não pode ser reaproveitado; única destinação que não conta como reaproveitamento.
_Avoid_: Lixo, descarte

## Financeiro

**Custo Reverso**:
Gasto incorrido para fazer um item ou devolução percorrer o fluxo reverso (frete reverso, triagem, reparo, armazenagem, transporte/taxa de descarte, embalagem).
_Avoid_: Despesa, custo logístico

**Valor Recuperado**:
Receita obtida com a destinação (revenda, crédito do fornecedor, venda de sucata).
_Avoid_: Receita, ganho, reembolso

**Resultado Líquido**:
Valor recuperado menos custos reversos, de um item, devolução ou período.
_Avoid_: Lucro, saldo, margem

**Taxa de Recuperação de Valor**:
Fração do valor de venda dos itens devolvidos no pós-venda que voltou como valor recuperado; o pós-consumo não entra, pois não há venda de referência.
_Avoid_: ROI, retorno

**Taxa de Devolução**:
Unidades de um produto devolvidas no pós-venda divididas pelas unidades vendidas no mesmo período; o pós-consumo não entra.
_Avoid_: Índice de retorno, churn

## Indicadores ambientais

**Massa Desviada de Aterro**:
Massa de itens cuja destinação não é Descarte adequado.
_Avoid_: Resíduo evitado, lixo evitado

**Taxa de Reaproveitamento**:
Fração da massa destinada que foi desviada de aterro.
_Avoid_: Taxa de reciclagem, índice verde

**CO₂e Evitado**:
Emissões de gases de efeito estufa evitadas pelo reaproveitamento, estimadas pela massa de cada material e seu fator de emissão.
_Avoid_: Carbono economizado, pegada evitada

## Atendimento

**Venda**:
Registro, importado do e-commerce, de produtos entregues a um cliente em uma data; referência para prazos, garantia e taxa de devolução.
_Avoid_: Pedido, compra, ordem

**Portal do Cliente**:
Canal público pelo qual o cliente abre uma devolução e acompanha seu andamento.
_Avoid_: Área do cliente, site

**Protocolo**:
Código público que identifica uma devolução para o cliente.
_Avoid_: Ticket, número do chamado

**Alerta de Política**:
Aviso de que uma devolução de pós-venda está fora do prazo de arrependimento ou da garantia; não impede a abertura.
_Avoid_: Bloqueio, erro, pendência
