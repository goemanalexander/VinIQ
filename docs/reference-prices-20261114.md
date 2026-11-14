# Reference prices researched 14 November 2026

Observed EUR shop prices per 750 ml bottle, including VAT and excluding shipping.
These are individual retail references, not Vivino average prices, guaranteed
resale proceeds, lowest-price claims or an automatically refreshed feed. Match
the exact wine/vintage; unpriced wines remain unknown. Existing paid prices remain
unchanged. Offers marked sold out are explicitly identified in the detail UI.

| Wine | Vintage | EUR | Source | Availability / qualification |
| --- | --- | ---: | --- | --- |
| Cellier des Princes Châteauneuf-du-Pape Rouge | 2025 | 17.99 | [ALDI Belgium](https://www.aldi.be/product/chateauneuf-du-pape-aop-cellier-des-princes-4974.html) | Listed price; local stock not checked |
| Bennati Amarone della Valpolicella | 2021 | 21.95 | [Vivino Belgium](https://www.vivino.com/BE/nl/) | Belgian offers listing; other countries show different prices |
| Gran Sasso Tre Autoctoni | N.V. | 10.95 | [Vivino](https://www.vivino.com/nl/it-gran-sasso-tre-autoctoni/w/2616834?price_id=40402922) | Belgian shipping locale; offer price rather than crossed-out 12.95 |
| Bufalo Nero Governo | 2023 | 8.99 | [Wijncentrale / Wijnbeurs listing](https://www.wijncentrale.be/wijn/bufalo-nero-governo-2/) | Sold out; historical offer listing, not the available 2024 |
| Don Carón Gran Reserva | 2018 | 9.99 | [Wijnbeurs Belgium](https://www.wijnbeurs.be/don-caron-gran-reserva) | Listed, in stock |
| Cantina Sava Ritardatario Primitivo di Manduria | 2022 | 16.39 | [Vinopio Belgium](https://www.vinopio.be/cantina-sava-primitivo-ritardatario-italiaanse-rode-wijn-puglia.html) | Listed, in stock; EAN 8019873968968 |
| Villa Portici Rosso Appassimento Puglia | N.V. | 10.99 | [Wijnbeurs Belgium](https://www.wijnbeurs.be/vila-portici-rosso-appassimento-puglia) | Sold out; no vintage given on the product page |
| Mastieri Primitivo | 2024 | 11.99 | [Wijncentrale / Wijnbeurs listing](https://www.wijncentrale.be/wijn/mastieri-primitivo/) | Sold out; historical listing |
| Les Mémoires d’Excellence Cévennes | 2023 | 12.99 | [Bourse du Vin Belgium](https://www.bourseduvin.be/les-memoires-dexcellence-cevennes) | Product page currently shows 12.99; search snippets show an older 9.99 offer |
| Roberto Crosio Canavese Barbera (listed as Goccianera) | 2021 | 19.49 | [Entrepot du Vin producer catalogue](https://www.entrepotduvin.be/wijnbouwers/cantine-crosio-candia-canavese-erbaluce-di-caluso-itali%C3%AB) | Single-bottle catalogue price; 17.87 requires 12 bottles |
| Roberto Crosio Primavite Erbaluce di Caluso | 2022 | 19.50 | [Svinando Belgium](https://www.svinando.be/cantine-crosio-primavite-erbaluce-di-caluso-docg-2022) | Listed, in stock; 750 ml |

No value imported for Marufa 2012, Blanc d'Enguera 2019, or Ghita 2024:
exact current EUR retail references could not be verified. Exclude Brazilian
import prices, restaurant prices, other vintages and crowdsourced estimates.
Vivino's Ritardatario 2022 page offered the **2021** vintage, so its price is rejected.

## Application and rollback

`appendReferencePrices` is explicit maintenance code and is never called on app
startup. Back up the latest cloud revision in a Neon snapshot or untouched backup branch before applying.
Use synthetic fixtures and an isolated database branch for verification. The
function validates vintage, bottle size, positive amount, URL and duplicate IDs;
it appends valuations/events without modifying wines, bottles or acquisitions.

Apply with an owner + expected revision + exact old payload compare-and-swap,
incrementing revision. Read back the complete payload. On rollback, restore the
backed-up payload using the same compare-and-swap on the new revision/payload,
and increment revision again. Stop if later edits exist. Existing valuation
history is retained, and rerunning the same dated batch is idempotent.
