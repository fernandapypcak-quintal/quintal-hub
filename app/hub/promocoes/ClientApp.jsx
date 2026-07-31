'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Minus, Trash2, Search, Save, X, Flame, TrendingDown, TrendingUp, ChefHat, Upload, FileSpreadsheet, History, PenLine, BookOpen, Check } from 'lucide-react'
import * as XLSX from 'xlsx'

const PRODUTOS = [{"produto": " VINHO QUENTE", "categoria": "DESTILADOS", "custo": 2.98, "preco": 19.99}, {"produto": "ABACAXI C/ CHOCOLATE", "categoria": "SOBREMESAS", "custo": 2.44, "preco": 18.99}, {"produto": "ABOBORA ASSADA", "categoria": "VEGGIE", "custo": 0.69, "preco": 10.99}, {"produto": "ABOBRINHA", "categoria": "VEGGIE", "custo": 1.35, "preco": 10.99}, {"produto": "ABSOLUT DOSE", "categoria": "OUTROS", "custo": 4.19, "preco": 26.99}, {"produto": "ABSOLUT GARRAFA", "categoria": "OUTROS", "custo": 69.9, "preco": 239.99}, {"produto": "AGUA C/ GAS", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 1.45, "preco": 6.99}, {"produto": "AGUA C/ GAS 2", "categoria": "OUTROS", "custo": 1.45, "preco": 6.99}, {"produto": "AGUA DE COCO", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 4.5, "preco": 11.99}, {"produto": "AGUA S/ GAS", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 1.3, "preco": 6.99}, {"produto": "AGUA S/ GAS 2", "categoria": "OUTROS", "custo": 1.3, "preco": 6.99}, {"produto": "AGUA TONICA", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 8.99}, {"produto": "AGUA TONICA DIET", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 2.8, "preco": 8.99}, {"produto": "ALHO PORÓ COM TOMATE CEREJA", "categoria": "VEGGIE", "custo": 2.95, "preco": 12.99}, {"produto": "ANEIS DE CEBOLA PRÉ-FORMADA", "categoria": "ACOMPANHAMENTOS", "custo": 2.9, "preco": 17.99}, {"produto": "APEROL SPRITZ", "categoria": "COQUETEIS", "custo": 11.45, "preco": 39.99}, {"produto": "ARROZ", "categoria": "ACOMPANHAMENTOS", "custo": 0.32, "preco": 9.99}, {"produto": "ARROZ BIRO BIRO", "categoria": "ACOMPANHAMENTOS", "custo": 1.96, "preco": 15.99}, {"produto": "ARROZ DOCE - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 1.91, "preco": 12.99}, {"produto": "BALDE BUDWEISER LONG", "categoria": "OUTROS", "custo": 26.62, "preco": 83.99}, {"produto": "BALDE BUDWEISER ZERO LONG", "categoria": "OUTROS", "custo": 29.46, "preco": 89.99}, {"produto": "BALDE CORONA ZERO LONG", "categoria": "OUTROS", "custo": 34.68, "preco": 95.99}, {"produto": "BALDE DE BECKS 600ML", "categoria": "OUTROS", "custo": 23.28, "preco": 87.99}, {"produto": "BALDE DE CORONA 600ML", "categoria": "OUTROS", "custo": 25.96, "preco": 79.99}, {"produto": "BALDE DE CORONA LONG", "categoria": "OUTROS", "custo": 33.72, "preco": 95.99}, {"produto": "BALDE DE ORIGINAL 600ML", "categoria": "OUTROS", "custo": 22.76, "preco": 79.99}, {"produto": "BALDE DE SPATEN 600ML", "categoria": "CERVEJA GARRAFA 600ML", "custo": 22.36, "preco": 79.99}, {"produto": "BALDE DE SPATEN LONG", "categoria": "OUTROS", "custo": 29.54, "preco": 89.99}, {"produto": "BALDE DE STELLA 600ML", "categoria": "OUTROS", "custo": 23.96, "preco": 83.99}, {"produto": "BALDE DE STELLA LONG ", "categoria": "OUTROS", "custo": 23.96, "preco": 89.99}, {"produto": "BALDE DE STELLA LONG SEM GLUTEN", "categoria": "OUTROS", "custo": 32.94, "preco": 89.99}, {"produto": "BALDE SRMINOFF ICE", "categoria": "OUTROS", "custo": 35.94, "preco": 99.99}, {"produto": "BANANA C/ CHOCOLATE", "categoria": "SOBREMESAS", "custo": 2.33, "preco": 18.99}, {"produto": "BASIL SMASH", "categoria": "OUTROS", "custo": 4.89, "preco": 39.99}, {"produto": "BATATA BOLINHA", "categoria": "VEGGIE", "custo": 0.44, "preco": 10.99}, {"produto": "BATATA SMILES", "categoria": "OUTROS", "custo": 4.16, "preco": 17.99}, {"produto": "BECKS LONG NECK", "categoria": "OUTROS", "custo": 4.86, "preco": 14.99}, {"produto": "BECKS LONG NECK 2", "categoria": "OUTROS", "custo": 4.86, "preco": 95.99}, {"produto": "BEEFEATER DOSE", "categoria": "OUTROS", "custo": 5.43, "preco": 30.99}, {"produto": "BEEFEATER GARRAFA", "categoria": "OUTROS", "custo": 67.99, "preco": 279.99}, {"produto": "BERINJELA", "categoria": "VEGGIE", "custo": 2.23, "preco": 10.99}, {"produto": "BERINJELA NO SHOYO", "categoria": "VEGGIE", "custo": 2.23, "preco": 12.99}, {"produto": "BLACK LABEL DOSE", "categoria": "OUTROS", "custo": 10.01, "preco": 42.99}, {"produto": "BLACK LABEL GARRAFA", "categoria": "OUTROS", "custo": 166.9, "preco": 420.99}, {"produto": "BOLINHO BACALHAU", "categoria": "BOTECO NO ESPETO", "custo": 3.96, "preco": 14.99}, {"produto": "BOLINHO DE PEPPERONI", "categoria": "OUTROS", "custo": 4.17, "preco": 13.99}, {"produto": "BOLINHO QUEIJO", "categoria": "BOTECO NO ESPETO", "custo": 3.4, "preco": 14.99}, {"produto": "BOLO ANIVERSARIO CHOCOLATE", "categoria": "SOBREMESAS", "custo": 80.11, "preco": 99.0}, {"produto": "BOULEVARDIER", "categoria": "OUTROS", "custo": 7.2, "preco": 38.99}, {"produto": "BOVINO", "categoria": "ESPETOS CLÁSSICOS", "custo": 3.8, "preco": 13.99}, {"produto": "BOVINO IN NATURA", "categoria": "OUTROS", "custo": 22.2, "preco": 29.99}, {"produto": "BRIGADEIRO", "categoria": "SOBREMESAS", "custo": 2.25, "preco": 16.99}, {"produto": "BUDWEISER LONG", "categoria": "CERVEJAS LONG NECK", "custo": 4.41, "preco": 13.99}, {"produto": "BUDWEISER ZERO", "categoria": "CERVEJAS LONG NECK", "custo": 4.85, "preco": 13.99}, {"produto": "CACHAÇA QUINTAL MEL E LIMÃO DOSE", "categoria": "DESTILADOS", "custo": 2.18, "preco": 14.99}, {"produto": "CACHAÇA QUINTAL MEL E LIMÃO GARRAFA", "categoria": "OUTROS", "custo": 25.5, "preco": 119.99}, {"produto": "CACHAÇA QUINTAL OURO DOSE", "categoria": "OUTROS", "custo": 1.25, "preco": 12.99}, {"produto": "CACHAÇA QUINTAL OURO GARRAFA", "categoria": "OUTROS", "custo": 18.8, "preco": 119.99}, {"produto": "CACHAÇA QUINTAL PRATA DOSE", "categoria": "OUTROS", "custo": 1.12, "preco": 12.99}, {"produto": "CACHAÇA QUINTAL PRATA GARRAFA", "categoria": "OUTROS", "custo": 16.9, "preco": 99.99}, {"produto": "CAIPIRINHA CACHACA NACIONAL", "categoria": "CAIPIRINHA", "custo": 5.0, "preco": 32.99}, {"produto": "CAIPIRINHA DO QUINTAL  OURO", "categoria": "CAIPIRINHA", "custo": 4.56, "preco": 34.99}, {"produto": "CAIPIRINHA DO QUINTAL MEL E LIMÃO", "categoria": "CAIPIRINHA", "custo": 5.0, "preco": 34.99}, {"produto": "CAIPIRINHA SAKE", "categoria": "CAIPIRINHA", "custo": 5.0, "preco": 32.99}, {"produto": "CAIPIRINHA VODKA NACIONAL", "categoria": "CAIPIRINHA", "custo": 5.0, "preco": 34.99}, {"produto": "CAJU AMIGO", "categoria": "OUTROS", "custo": 6.96, "preco": 38.99}, {"produto": "CALABRESA C/ PIMENTA", "categoria": "ESPETOS CLÁSSICOS", "custo": 1.66, "preco": 13.99}, {"produto": "CALABRESA C/ PIMENTA IN NATURA", "categoria": "OUTROS", "custo": 11.88, "preco": 29.99}, {"produto": "CALABRESA S/ PIMENTA", "categoria": "ESPETOS CLÁSSICOS", "custo": 2.1, "preco": 13.99}, {"produto": "CALABRESA S/ PIMENTA IN NATURA", "categoria": "OUTROS", "custo": 11.88, "preco": 29.99}, {"produto": "CALDO DE FEIJÃO", "categoria": "CALDOS", "custo": 0.53, "preco": 18.99}, {"produto": "CAMARAO BRASA", "categoria": "SELEÇÃO PREMIUM", "custo": 4.75, "preco": 19.99}, {"produto": "CAMPARI DOSE", "categoria": "OUTROS", "custo": 1.69, "preco": 16.99}, {"produto": "CAMPARI GARRAFA", "categoria": "OUTROS", "custo": 51.09, "preco": 139.99}, {"produto": "CANARINHO", "categoria": "OUTROS", "custo": 6.82, "preco": 37.99}, {"produto": "CANJICA - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 1.64, "preco": 12.99}, {"produto": "CARAMELITO", "categoria": "OUTROS", "custo": 12.9, "preco": 40.99}, {"produto": "CARRE DE CORDEIRO", "categoria": "SELEÇÃO PREMIUM", "custo": 7.45, "preco": 19.99}, {"produto": "CERVEJA BECKS 600 ML", "categoria": "CERVEJA GARRAFA 600ML", "custo": 5.82, "preco": 21.99}, {"produto": "CERVEJA IPA QUINTAL", "categoria": "OUTROS", "custo": 9.5, "preco": 26.99}, {"produto": "CERVEJA QUINTAL PILSEN", "categoria": "OUTROS", "custo": 8.5, "preco": 21.99}, {"produto": "CERVEJA SPATEN", "categoria": "CERVEJA GARRAFA 600ML", "custo": 5.59, "preco": 19.99}, {"produto": "CHANDON ROSE 750 ML", "categoria": "ESPUMANTES", "custo": 82.92, "preco": 239.99}, {"produto": "CHIVAS 12 DOSE", "categoria": "OUTROS", "custo": 7.31, "preco": 39.99}, {"produto": "CHIVAS 12 GARRAFA", "categoria": "OUTROS", "custo": 121.9, "preco": 390.99}, {"produto": "CHOPP  DOBRO", "categoria": "OUTROS", "custo": 3.23, "preco": 5.99}, {"produto": "CHOPP BRAHMA CANECA", "categoria": "CHOPP BRAHMA", "custo": 3.23, "preco": 12.99}, {"produto": "CHOPP OKTOBERFEST 500 ML", "categoria": "OUTROS", "custo": 4.9, "preco": 18.99}, {"produto": "CLERICOT", "categoria": "COQUETEIS", "custo": 21.32, "preco": 89.99}, {"produto": "COMBO ABSOLUT", "categoria": "COMBO", "custo": 83.49, "preco": 279.99}, {"produto": "COQUETEL FRUTAS", "categoria": "COQUETEIS", "custo": 2.56, "preco": 34.99}, {"produto": "COQUETEL JACK APPLE & TONIC", "categoria": "OUTROS", "custo": 12.9, "preco": 45.99}, {"produto": "CORACAO", "categoria": "ESPETOS CLÁSSICOS", "custo": 4.05, "preco": 13.99}, {"produto": "CORACAO IN NATURA", "categoria": "OUTROS", "custo": 24.32, "preco": 29.99}, {"produto": "CORONA 600ML", "categoria": "OUTROS", "custo": 6.49, "preco": 22.99}, {"produto": "CORONA CERO", "categoria": "CERVEJAS ESPECIAIS", "custo": 5.62, "preco": 15.99}, {"produto": "CORONA EXTRA", "categoria": "OUTROS", "custo": 5.62, "preco": 15.99}, {"produto": "CORONA LONG CARNAVAL", "categoria": "OUTROS", "custo": 5.6, "preco": 10.99}, {"produto": "COSTELA BOVINA", "categoria": "SELEÇÃO PREMIUM", "custo": 4.34, "preco": 15.99}, {"produto": "COXINHA FRANGO C/ REQUEIJÃO", "categoria": "BOTECO NO ESPETO", "custo": 3.9, "preco": 14.99}, {"produto": "CRISPY DE QUEIJO GOUDA", "categoria": "BOTECO NO ESPETO", "custo": 3.0, "preco": 17.99}, {"produto": "CUIABANA", "categoria": "SELEÇÃO PREMIUM", "custo": 4.23, "preco": 15.99}, {"produto": "CURAU - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 3.62, "preco": 12.99}, {"produto": "ESPANHOLA", "categoria": "COQUETEIS", "custo": 2.49, "preco": 37.99}, {"produto": "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "categoria": "BOTECO NO ESPETO", "custo": 2.84, "preco": 15.99}, {"produto": "ESPETO ICE TEA", "categoria": "OUTROS", "custo": 6.6, "preco": 37.99}, {"produto": "ESPETO MEDALHAO ALCATRA", "categoria": "SELEÇÃO PREMIUM", "custo": 6.86, "preco": 19.99}, {"produto": "ESPETO MEDALHÃO DE FRANGO", "categoria": "SELEÇÃO PREMIUM", "custo": 5.54, "preco": 19.99}, {"produto": "ESPETO MEDALHÃO MANDIOCA", "categoria": "SELEÇÃO PREMIUM", "custo": 3.66, "preco": 13.99}, {"produto": "ESPETO PROVOLONE DEFUMADO", "categoria": "SELEÇÃO PREMIUM", "custo": 4.1, "preco": 13.99}, {"produto": "EXPRESSO ", "categoria": "OUTROS", "custo": 1.5, "preco": 5.99}, {"produto": "EXPRESSO DESCAFEINADO", "categoria": "OUTROS", "custo": 1.5, "preco": 5.99}, {"produto": "FAROFA", "categoria": "OUTROS", "custo": 1.38, "preco": 9.99}, {"produto": "FAROFA  DA CASA", "categoria": "ACOMPANHAMENTOS", "custo": 1.47, "preco": 9.99}, {"produto": "FAROFA MARMITA", "categoria": "ACOMPANHAMENTOS", "custo": 1.38, "preco": 9.99}, {"produto": "FILE MIGNON BOVINO", "categoria": "SELEÇÃO PREMIUM", "custo": 8.45, "preco": 19.99}, {"produto": "FITZ FLORINDA", "categoria": "OUTROS", "custo": 3.38, "preco": 37.99}, {"produto": "FITZ GERALD", "categoria": "OUTROS", "custo": 9.81, "preco": 38.99}, {"produto": "FRANGO", "categoria": "ESPETOS CLÁSSICOS", "custo": 2.34, "preco": 13.99}, {"produto": "FRANGO 2", "categoria": "OUTROS", "custo": 2.34, "preco": 12.99}, {"produto": "FRANGO IN NATURA", "categoria": "OUTROS", "custo": 14.04, "preco": 29.99}, {"produto": "FRITAS", "categoria": "ACOMPANHAMENTOS", "custo": 2.4, "preco": 16.99}, {"produto": "FRUTAS PORÇÂO", "categoria": "OUTROS", "custo": 1.3, "preco": 10.99}, {"produto": "GELO DE COCO", "categoria": "OUTROS", "custo": 1.62, "preco": 12.99}, {"produto": "GIN  TANQUERAY", "categoria": "OUTROS", "custo": 97.8, "preco": 299.99}, {"produto": "GIN TANQUERAY DOSE", "categoria": "OUTROS", "custo": 7.82, "preco": 32.99}, {"produto": "GIN TÔNICA CLÁSSICO", "categoria": "COQUETEIS", "custo": 5.4, "preco": 37.99}, {"produto": "GIN TÔNICA DO QUINTAL", "categoria": "OUTROS", "custo": 4.41, "preco": 37.99}, {"produto": "GIN TÔNICA FRUTAS VERMELHAS", "categoria": "COQUETEIS", "custo": 4.62, "preco": 39.99}, {"produto": "GIN TÔNICA PINK", "categoria": "COQUETEIS", "custo": 6.07, "preco": 39.99}, {"produto": "GIN TÔNICA SICILIANO", "categoria": "OUTROS", "custo": 5.09, "preco": 39.99}, {"produto": "GOLD LABEL DOSE", "categoria": "OUTROS", "custo": 14.61, "preco": 60.99}, {"produto": "GOLD LABEL GARRAFA", "categoria": "OUTROS", "custo": 243.5, "preco": 690.99}, {"produto": "GOLD RUSH", "categoria": "OUTROS", "custo": 5.84, "preco": 38.99}, {"produto": "GUARANA", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "GUARANA ANTARTICA  ZERO", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "GUARANA LATA", "categoria": "OUTROS", "custo": 3.01, "preco": 8.99}, {"produto": "GUARANA ZERO LATA", "categoria": "OUTROS", "custo": 3.01, "preco": 8.99}, {"produto": "H2OH!", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 4.09, "preco": 10.99}, {"produto": "HUGO SPRIZ", "categoria": "OUTROS", "custo": 9.66, "preco": 39.99}, {"produto": "JACK APPLE DOSE", "categoria": "OUTROS", "custo": 8.45, "preco": 39.99}, {"produto": "JACK APPLE GARRAFA", "categoria": "OUTROS", "custo": 140.84, "preco": 390.99}, {"produto": "JACK DANIELS DOSE", "categoria": "OUTROS", "custo": 8.15, "preco": 39.99}, {"produto": "JACK DANIELS FIRE DOSE", "categoria": "OUTROS", "custo": 7.72, "preco": 39.99}, {"produto": "JACK DANIELS FIRE GARRAFA", "categoria": "OUTROS", "custo": 128.82, "preco": 390.99}, {"produto": "JACK DANIELS GARRAFA", "categoria": "OUTROS", "custo": 140.84, "preco": 390.99}, {"produto": "JACK DANIELS HONEY DOSE", "categoria": "OUTROS", "custo": 7.79, "preco": 39.99}, {"produto": "JACK DANIELS HONEY GARRAFA", "categoria": "OUTROS", "custo": 129.9, "preco": 390.99}, {"produto": "JACK E COKE", "categoria": "COQUETEIS", "custo": 10.24, "preco": 39.99}, {"produto": "JACK GENTLEMAN DOSE", "categoria": "OUTROS", "custo": 10.79, "preco": 48.99}, {"produto": "JARRA SUCO ABACAXI", "categoria": "OUTROS", "custo": 9.0, "preco": 41.99}, {"produto": "JARRA SUCO ABACAXI C HORTELÃ", "categoria": "OUTROS", "custo": 9.56, "preco": 41.99}, {"produto": "JARRA SUCO LARANJA", "categoria": "OUTROS", "custo": 3.25, "preco": 54.99}, {"produto": "JARRA SUCO LIMÃO", "categoria": "OUTROS", "custo": 5.58, "preco": 54.99}, {"produto": "JARRA SUCO MARACUJÁ", "categoria": "OUTROS", "custo": 12.0, "preco": 41.99}, {"produto": "JARRA SUCO MORANGO", "categoria": "OUTROS", "custo": 9.0, "preco": 41.99}, {"produto": "KAFTA", "categoria": "ESPETOS CLÁSSICOS", "custo": 2.87, "preco": 13.99}, {"produto": "KAFTA IN NATURA", "categoria": "OUTROS", "custo": 17.23, "preco": 29.99}, {"produto": "KIBE", "categoria": "BOTECO NO ESPETO", "custo": 3.8, "preco": 14.99}, {"produto": "KIT GIN", "categoria": "OUTROS", "custo": 29.5, "preco": 80.99}, {"produto": "LAMBRUSCO ", "categoria": "OUTROS", "custo": 34.88, "preco": 88.99}, {"produto": "LICOR 43 DOSE", "categoria": "OUTROS", "custo": 8.63, "preco": 32.99}, {"produto": "LICOR 43 GARRAFA", "categoria": "OUTROS", "custo": 143.99, "preco": 349.99}, {"produto": "LICOR BAUNY DOSE", "categoria": "DESTILADOS", "custo": 4.8, "preco": 14.99}, {"produto": "LIMONCELLO SPRITZ", "categoria": "OUTROS", "custo": 12.56, "preco": 39.99}, {"produto": "LONDON MULE", "categoria": "OUTROS", "custo": 3.95, "preco": 38.99}, {"produto": "MALZEBIER LONG", "categoria": "CERVEJAS LONG NECK", "custo": 5.02, "preco": 13.99}, {"produto": "MANDIOCA FRITA P", "categoria": "ACOMPANHAMENTOS", "custo": 1.8, "preco": 14.99}, {"produto": "MANGO NEGRONI", "categoria": "OUTROS", "custo": 7.58, "preco": 38.99}, {"produto": "MARGARITA DO QUINTAL", "categoria": "OUTROS", "custo": 12.98, "preco": 39.99}, {"produto": "MELANCITA GIN", "categoria": "OUTROS", "custo": 9.16, "preco": 39.99}, {"produto": "MELÃO GIN", "categoria": "OUTROS", "custo": 9.08, "preco": 44.99}, {"produto": "MILHO C/ MANTEIGA - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 3.15, "preco": 14.99}, {"produto": "MINI CHURROS C/ DOCE DE LEITE", "categoria": "SOBREMESAS", "custo": 3.8, "preco": 15.99}, {"produto": "MOJITO", "categoria": "OUTROS", "custo": 5.58, "preco": 38.99}, {"produto": "MONTILLA OURO DOSE", "categoria": "OUTROS", "custo": 1.55, "preco": 14.99}, {"produto": "MONTILLA PRATA DOSE", "categoria": "OUTROS", "custo": 1.55, "preco": 14.99}, {"produto": "MORANGO C/ CHOCOLATE", "categoria": "SOBREMESAS", "custo": 3.55, "preco": 18.99}, {"produto": "MOSCOW MULE GENGIBRE", "categoria": "OUTROS", "custo": 6.2, "preco": 36.99}, {"produto": "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE", "categoria": "DIRETO DA FAZENDA", "custo": 4.95, "preco": 14.99}, {"produto": "NEGRONI", "categoria": "COQUETEIS", "custo": 6.96, "preco": 39.99}, {"produto": "NORTON PORTEÑO CHARDONNAY", "categoria": "OUTROS", "custo": 32.88, "preco": 88.99}, {"produto": "NORTON PORTEÑO MALBEC", "categoria": "OUTROS", "custo": 32.88, "preco": 88.99}, {"produto": "OLDFESHIONED", "categoria": "OUTROS", "custo": 7.2, "preco": 38.99}, {"produto": "ORIGINAL 600", "categoria": "CERVEJA GARRAFA 600ML", "custo": 5.66, "preco": 19.99}, {"produto": "PANCETA", "categoria": "ESPETOS CLÁSSICOS", "custo": 3.67, "preco": 13.99}, {"produto": "PANCETA 2", "categoria": "OUTROS", "custo": 3.67, "preco": 12.99}, {"produto": "PANCETA IN NATURA", "categoria": "OUTROS", "custo": 22.04, "preco": 29.99}, {"produto": "PAO DE ALHO", "categoria": "ESPETOS CLÁSSICOS", "custo": 1.69, "preco": 13.99}, {"produto": "PENICILIN", "categoria": "OUTROS", "custo": 6.94, "preco": 39.99}, {"produto": "PEPSI", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "PEPSI LATA", "categoria": "OUTROS", "custo": 3.01, "preco": 10.99}, {"produto": "PEPSI LIGHT", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "PEPSI ZERO BLACK", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 2.39, "preco": 9.99}, {"produto": "PEPSI ZERO LATA", "categoria": "OUTROS", "custo": 3.01, "preco": 10.99}, {"produto": "PICANHA", "categoria": "SELEÇÃO PREMIUM", "custo": 9.8, "preco": 19.99}, {"produto": "PICANHA IN NATURA", "categoria": "OUTROS", "custo": 22.04, "preco": 69.99}, {"produto": "PINA COLADA", "categoria": "COQUETEIS", "custo": 7.88, "preco": 37.99}, {"produto": "PIRANGA", "categoria": "OUTROS", "custo": 6.17, "preco": 37.99}, {"produto": "PIRULITO - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 0.19, "preco": 2.0}, {"produto": "POLENTA FRITA", "categoria": "ACOMPANHAMENTOS", "custo": 1.82, "preco": 14.99}, {"produto": "PORÇÃO DE PASTÉIS", "categoria": "BOTECO NO ESPETO", "custo": 5.1, "preco": 17.99}, {"produto": "PUPUNHA C/ TOMATE SECO E RUCULA", "categoria": "VEGGIE", "custo": 2.98, "preco": 18.99}, {"produto": "PUPUNHA NA BRASA", "categoria": "VEGGIE", "custo": 3.12, "preco": 16.99}, {"produto": "PURPLE GIN", "categoria": "OUTROS", "custo": 9.6, "preco": 44.99}, {"produto": "PURPLE VODKA", "categoria": "OUTROS", "custo": 11.43, "preco": 39.99}, {"produto": "QUEIJO COALHO C/ MELACO", "categoria": "DIRETO DA FAZENDA", "custo": 2.6, "preco": 13.99}, {"produto": "QUEIJO COALHO C/ MELACO 2", "categoria": "OUTROS", "custo": 2.6, "preco": 13.99}, {"produto": "QUEIJO COALHO IN NATURA", "categoria": "OUTROS", "custo": 18.2, "preco": 29.99}, {"produto": "R BULLSUGARFREE", "categoria": "OUTROS", "custo": 6.4, "preco": 20.99}, {"produto": "RATATOUILLE", "categoria": "VEGGIE", "custo": 1.69, "preco": 11.99}, {"produto": "RED BULL", "categoria": "OUTROS", "custo": 6.83, "preco": 20.99}, {"produto": "RED BULL MELANCIA", "categoria": "OUTROS", "custo": 6.83, "preco": 20.99}, {"produto": "RED BULL MELÃO EDITION", "categoria": "OUTROS", "custo": 6.83, "preco": 20.99}, {"produto": "RED BULL POMELO SUGARFREE", "categoria": "OUTROS", "custo": 6.83, "preco": 20.99}, {"produto": "RED BULL TROPICAL", "categoria": "OUTROS", "custo": 6.83, "preco": 20.99}, {"produto": "RED LABEL DOSE", "categoria": "OUTROS", "custo": 4.99, "preco": 29.99}, {"produto": "RED LABEL GARRAFA", "categoria": "OUTROS", "custo": 83.22, "preco": 269.99}, {"produto": "SABOR DE MINAS DOSE", "categoria": "OUTROS", "custo": 3.21, "preco": 16.99}, {"produto": "SALADA CAPRESE", "categoria": "OUTROS", "custo": 7.63, "preco": 29.99}, {"produto": "SALADA DA CASA", "categoria": "SALADAS", "custo": 1.15, "preco": 29.99}, {"produto": "SALADA JULIANA", "categoria": "OUTROS", "custo": 2.19, "preco": 29.99}, {"produto": "SALSICHAO", "categoria": "ESPETOS CLÁSSICOS", "custo": 2.8, "preco": 14.99}, {"produto": "SALSICHAO 2", "categoria": "OUTROS", "custo": 2.8, "preco": 11.99}, {"produto": "SALSICHAO C/ PROVOLONE", "categoria": "SELEÇÃO PREMIUM", "custo": 3.8, "preco": 17.99}, {"produto": "SALTON", "categoria": "OUTROS", "custo": 27.99, "preco": 99.99}, {"produto": "SANGRIA", "categoria": "COQUETEIS", "custo": 21.09, "preco": 89.99}, {"produto": "SAO FRANCISCO DOSE", "categoria": "OUTROS", "custo": 1.54, "preco": 14.99}, {"produto": "SAO FRANCISCO GARRAFA", "categoria": "OUTROS", "custo": 24.92, "preco": 139.99}, {"produto": "SEX ON THE BEACH", "categoria": "OUTROS", "custo": 3.33, "preco": 38.99}, {"produto": "SHIMEJI", "categoria": "SELEÇÃO PREMIUM", "custo": 3.91, "preco": 15.99}, {"produto": "SMINORFF ICE", "categoria": "OUTROS", "custo": 6.15, "preco": 19.99}, {"produto": "SODA ITALIANA ", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 5.02, "preco": 16.99}, {"produto": "SODA LIMONADA", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "SODA LIMONADA DIET", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "SPATEN LONG NECK", "categoria": "OUTROS", "custo": 4.86, "preco": 14.99}, {"produto": "STELLA 550", "categoria": "CERVEJA GARRAFA 600ML", "custo": 5.99, "preco": 20.99}, {"produto": "STELLA LONG", "categoria": "CERVEJAS LONG NECK", "custo": 4.89, "preco": 14.99}, {"produto": "STELLA LONG S/ GLUTEN", "categoria": "OUTROS", "custo": 5.49, "preco": 14.99}, {"produto": "STELLA PURE GOLD 600 ", "categoria": "CERVEJA GARRAFA 600ML", "custo": 6.29, "preco": 15.99}, {"produto": "STICKS DE MUSSARELA", "categoria": "BOTECO NO ESPETO", "custo": 3.5, "preco": 14.99}, {"produto": "SUCO ABACAXI", "categoria": "SUCOS", "custo": 2.4, "preco": 9.99}, {"produto": "SUCO ABACAXI C/ HORTELA", "categoria": "OUTROS", "custo": 2.96, "preco": 9.99}, {"produto": "SUCO LARANJA", "categoria": "SUCOS", "custo": 0.65, "preco": 12.99}, {"produto": "SUCO LIMAO", "categoria": "OUTROS", "custo": 2.39, "preco": 12.99}, {"produto": "SUCO MARACUJA", "categoria": "SUCOS", "custo": 2.4, "preco": 9.99}, {"produto": "SUCO MORANGO", "categoria": "SUCOS", "custo": 1.8, "preco": 9.99}, {"produto": "SUKITA", "categoria": "BEBIDAS NÃO ALCOÓLICAS", "custo": 3.01, "preco": 9.99}, {"produto": "SUNSET MULE", "categoria": "OUTROS", "custo": 5.31, "preco": 39.99}, {"produto": "TEAJUCA", "categoria": "OUTROS", "custo": 6.03, "preco": 34.99}, {"produto": "TEQUILA  PRATA GARRAFA", "categoria": "OUTROS", "custo": 112.9, "preco": 290.99}, {"produto": "TEQUILA OURO DOSE", "categoria": "OUTROS", "custo": 9.0, "preco": 30.99}, {"produto": "TEQUILA OURO GARRAFA", "categoria": "OUTROS", "custo": 112.9, "preco": 290.99}, {"produto": "TEQUILA PRATA DOSE", "categoria": "OUTROS", "custo": 6.77, "preco": 30.99}, {"produto": "TROPICAL GIN", "categoria": "COQUETEIS", "custo": 8.35, "preco": 39.99}, {"produto": "TULIPA DE FRANGO", "categoria": "SELEÇÃO PREMIUM", "custo": 4.02, "preco": 13.99}, {"produto": "UVA C/ CHOCOLATE", "categoria": "SOBREMESAS", "custo": 3.21, "preco": 18.99}, {"produto": "VINAGRETE", "categoria": "ACOMPANHAMENTOS", "custo": 3.04, "preco": 9.99}, {"produto": "VINHO QUENTE - FESTA JUNINA", "categoria": "FESTA JUNINA ", "custo": 3.16, "preco": 19.99}, {"produto": "VISTAÑA CABERNET MERLOT 750ML", "categoria": "OUTROS", "custo": 34.86, "preco": 128.99}, {"produto": "VISTAÑA SAUVIGNON BLANC 750ML", "categoria": "OUTROS", "custo": 34.86, "preco": 128.99}];

function normalizar(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatR$(v) {
  if (!isFinite(v)) return "R$ 0,0";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPct(v) {
  if (!isFinite(v)) return "0,0%";
  return (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

const CATEGORIAS = ["TODAS", ...Array.from(new Set(PRODUTOS.map((p) => p.categoria))).sort()];

// Cardápios fixos — pacotes "à vontade" com lista de itens pronta (baseado
// no material de marketing recebido). Preço sugerido é opcional; a
// quantidade de cada item entra como 1 por padrão, editável ao carregar.
const CARDAPIOS_PADRAO = [
  {
    id: "festival-cerveja-e-churrasco",
    nome: "Festival Cerveja e Churrasco à Vontade",
    precoSugerido: 99.99,
    itens: [
      "BOVINO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PAO DE ALHO", "SALSICHAO", "PANCETA",
      "ORIGINAL 600", "CERVEJA SPATEN", "BUDWEISER ZERO", "STELLA 550",
      "AGUA S/ GAS", "AGUA C/ GAS", "GUARANA", "GUARANA ANTARTICA  ZERO", "PEPSI", "PEPSI ZERO BLACK",
      "SODA LIMONADA", "SODA LIMONADA DIET", "SUKITA", "AGUA TONICA", "AGUA TONICA DIET",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "MANDIOCA FRITA P",
      "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA",
      "QUEIJO COALHO C/ MELACO", "MINI CHURROS C/ DOCE DE LEITE",
      "BOLINHO QUEIJO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA",
    ],
  },
  {
    id: "rodizio-espetos-classicos",
    nome: "Rodízio de Espetos Clássicos",
    precoSugerido: null,
    itens: [
      "BOVINO", "CALABRESA C/ PIMENTA", "CALABRESA S/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PANCETA", "SALSICHAO", "PAO DE ALHO",
      "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE", "QUEIJO COALHO C/ MELACO",
      "ABOBRINHA", "BERINJELA", "BATATA BOLINHA",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA", "MANDIOCA FRITA P",
      "BOLINHO QUEIJO", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA",
    ],
  },
];

const CHAVE_CARDAPIOS_CUSTOM = "quintal_cardapios_custom_v1";

// Grupos de itens reaproveitados entre os cardápios corporativos
const CLASSICOS_QUINTAL = ["BOVINO", "FRANGO", "KAFTA", "CORACAO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "PANCETA", "SALSICHAO", "PAO DE ALHO"];
const DIRETO_FAZENDA = ["QUEIJO COALHO C/ MELACO", "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE"];
const VEGGIE_CORP = ["ABOBRINHA", "BATATA BOLINHA", "BERINJELA", "PUPUNHA C/ TOMATE SECO E RUCULA", "PUPUNHA NA BRASA"];
const ACOMPANHAMENTOS_CORP = ["ARROZ", "ARROZ BIRO BIRO", "FRITAS", "FAROFA  DA CASA", "MANDIOCA FRITA P", "POLENTA FRITA", "VINAGRETE", "ANEIS DE CEBOLA PRÉ-FORMADA"];
const SOBREMESAS_CORP = ["ABACAXI C/ CHOCOLATE", "BANANA C/ CHOCOLATE", "BRIGADEIRO", "MINI CHURROS C/ DOCE DE LEITE", "MORANGO C/ CHOCOLATE", "UVA C/ CHOCOLATE"];
const BOTECO_SIMPLES = ["STICKS DE MUSSARELA"];
const BOTECO_COMPLETO = ["BOLINHO BACALHAU", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA"];
const BEBIDAS_SEM_ALCOOL = ["AGUA S/ GAS", "AGUA C/ GAS", "AGUA TONICA", "AGUA TONICA DIET", "GUARANA", "PEPSI", "SUKITA", "SODA LIMONADA", "SODA LIMONADA DIET"];
const CERVEJAS_CORP = ["BECKS LONG NECK", "BUDWEISER ZERO", "ORIGINAL 600", "CERVEJA SPATEN", "STELLA 550", "STELLA PURE GOLD 600"];
const DRINKS_Q2 = ["CAIPIRINHA CACHACA NACIONAL", "CAIPIRINHA VODKA NACIONAL", "GIN TÔNICA PINK", "GIN TÔNICA CLÁSSICO"];
const DRINKS_Q3 = [...DRINKS_Q2, "CAIPIRINHA DO QUINTAL MEL E LIMÃO"];
const SELECAO_PREMIUM = ["CAMARAO BRASA", "CARRE DE CORDEIRO", "COSTELA BOVINA", "FILE MIGNON BOVINO", "PICANHA", "SALSICHAO C/ PROVOLONE", "SHIMEJI", "TULIPA DE FRANGO"];

// Cardápios corporativos (eventos fechados) — preço é o valor de tabela por
// pessoa, ANTES da taxa de serviço de +10% que aparece nos materiais de
// marketing. Some itens dos folhetos (ex: Linguiça Cuiabana, sabores
// específicos de caipirinha/caipiroska) não têm equivalente exato no
// catálogo e ficaram fora — dá pra adicionar na mão ao carregar.
const CARDAPIOS_CORPORATIVOS = [
  { id: "corp-quintal1-padrao", nome: "Corporativo Quintal 1 (padrão)", precoSugerido: 229.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-padrao", nome: "Corporativo Quintal 2 (padrão)", precoSugerido: 265.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-padrao", nome: "Corporativo Quintal 3 (padrão)", precoSugerido: 284.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal1-fimdeano", nome: "Corporativo Quintal 1 (Fim de Ano 2026)", precoSugerido: 252.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-fimdeano", nome: "Corporativo Quintal 2 (Fim de Ano 2026)", precoSugerido: 292.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-fimdeano", nome: "Corporativo Quintal 3 (Fim de Ano 2026)", precoSugerido: 313.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal4-fimdeano", nome: "Corporativo Quintal 4 — sem álcool (Fim de Ano 2026)", precoSugerido: 179.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL] },
];

function statusCmv(cmvPct) {
  if (!isFinite(cmvPct)) return { label: "—", cor: "#71717a", bg: "#F4F4F0", border: "#E8E8E2" };
  if (cmvPct >= 0.8) return { label: "CRÍTICO", cor: "#8C1414", bg: "#FEF2F2", border: "#FEE2E2" };
  if (cmvPct >= 0.35) return { label: "ATENÇÃO", cor: "#B45309", bg: "#FFFBEB", border: "#FEF3C7" };
  return { label: "OK", cor: "#97A624", bg: "#F0FDF4", border: "#DCFCE7" };
}

// Catálogo de custo/preço é único para toda a rede (validado nas planilhas
// de CMV de Maio/Junho 2026 — mesmos valores em todas as lojas), então este
// simulador não precisa de filtro por loja. allowedLojas fica disponível
// caso um dia o catálogo passe a variar por unidade.
export default function SimuladorPromocoesClientApp({ allowedLojas = '*', mostrarBarraVoltar = true }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODAS");
  const [carrinho, setCarrinho] = useState([]);
  const [nomePromo, setNomePromo] = useState("");
  const [modoPreco, setModoPreco] = useState("fixo");
  const [precoFixo, setPrecoFixo] = useState("");
  const [percDesconto, setPercDesconto] = useState("");
  const [cenarios, setCenarios] = useState([]);
  const [pessoas, setPessoas] = useState("1");
  const [modoOrigem, setModoOrigem] = useState("manual"); // 'manual' | 'historico'
  const [arquivos, setArquivos] = useState([]); // [{nome, loja, periodo}]
  const [linhasHistorico, setLinhasHistorico] = useState([]); // dados brutos agregados
  const [palavrasExcluir, setPalavrasExcluir] = useState(
    "FUNCIONARIO, SOCIO, HOLDING, SUPERVISAO, DIRETORIA, COLABORADOR"
  );
  const [promoSelecionada, setPromoSelecionada] = useState(null);
  const [usosReferencia, setUsosReferencia] = useState("1");
  const [erroImportacao, setErroImportacao] = useState(null);
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);

  // ---------- Cardápios fixos ----------
  const [cardapiosCustom, setCardapiosCustom] = useState([]);
  const [criandoCardapio, setCriandoCardapio] = useState(false);
  const [novoCardapioNome, setNovoCardapioNome] = useState("");
  const [novoCardapioPreco, setNovoCardapioPreco] = useState("");
  const [novoCardapioItens, setNovoCardapioItens] = useState([]); // array de nomes de produto
  const [buscaCardapio, setBuscaCardapio] = useState("");

  useEffect(() => {
    try {
      const salvos = window.localStorage.getItem(CHAVE_CARDAPIOS_CUSTOM);
      if (salvos) setCardapiosCustom(JSON.parse(salvos));
    } catch (e) {
      // localStorage indisponível — sem problema, só não persiste
    }
  }, []);

  function salvarCardapiosCustom(lista) {
    setCardapiosCustom(lista);
    try {
      window.localStorage.setItem(CHAVE_CARDAPIOS_CUSTOM, JSON.stringify(lista));
    } catch (e) {
      // ignora se não conseguir persistir
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return PRODUTOS.filter((p) => {
      const matchBusca = termo === "" || normalizar(p.produto).includes(termo);
      const matchCat = categoria === "TODAS" || p.categoria === categoria;
      return matchBusca && matchCat;
    }).slice(0, 60);
  }, [busca, categoria]);

  function adicionarItem(produto) {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto === produto.produto);
      if (existe) {
        return prev.map((i) => (i.produto === produto.produto ? { ...i, qtd: i.qtd + 1 } : i));
      }
      return [...prev, { ...produto, qtd: 1, custoOverride: null, precoOverride: null }];
    });
  }

  function alterarQtd(produto, delta) {
    setCarrinho((prev) =>
      prev
        .map((i) =>
          i.produto === produto
            ? { ...i, qtd: Math.max(0.1, +(i.qtd + delta).toFixed(2)), qtdTexto: undefined }
            : i
        )
        .filter((i) => i.qtd > 0)
    );
  }

  function definirQtd(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, qtdTexto: valor, qtd: isFinite(num) && num > 0 ? num : i.qtd } : i))
    );
  }

  function definirCusto(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, custoOverride: valor, custo: isFinite(num) ? num : i.custo } : i))
    );
  }

  function definirPreco(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, precoOverride: valor, preco: isFinite(num) ? num : i.preco } : i))
    );
  }

  function removerItem(produto) {
    setCarrinho((prev) => prev.filter((i) => i.produto !== produto));
  }

  const multiplicador = (() => {
    const n = parseFloat((pessoas || "1").replace(",", "."));
    return isFinite(n) && n > 0 ? n : 1;
  })();

  const custoTotal = carrinho.reduce((acc, i) => acc + i.custo * i.qtd, 0) * multiplicador;
  const valorCardapio = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0) * multiplicador;

  // ---------- Importação do relatório "Promoções utilizadas" da ZIG ----------
  async function handleArquivos(fileList) {
    setErroImportacao(null);
    setCarregandoArquivo(true);
    const novosArquivos = [];
    const linhasNovas = [];
    try {
      for (const file of Array.from(fileList)) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        let lojaPeriodo = { loja: "", periodo: "" };

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

          // tenta achar o título pra extrair loja/período (linha 0, coluna B geralmente)
          for (const linha of raw.slice(0, 4)) {
            const texto = (linha || []).find((c) => typeof c === "string" && c.includes("Promoções utilizadas de"));
            if (texto) {
              const m = texto.match(/Promoções utilizadas de (.+?) entre (\d{2}\/\d{2}\/\d{4}) e (\d{2}\/\d{2}\/\d{4})/);
              if (m) lojaPeriodo = { loja: m[1], periodo: `${m[2]} a ${m[3]}` };
            }
          }

          // acha a linha de cabeçalho (Produto / Promoção / Categoria / Quantidade de usos / Desconto total)
          const idxHeader = raw.findIndex(
            (linha) => linha && typeof linha[0] === "string" && linha[0].trim() === "Produto" && typeof linha[1] === "string" && linha[1].trim() === "Promoção"
          );
          if (idxHeader === -1) continue;

          for (let i = idxHeader + 1; i < raw.length; i++) {
            const linha = raw[i];
            if (!linha || !linha[0] || !linha[1]) continue;
            linhasNovas.push({
              produto: String(linha[0]).trim(),
              promocao: String(linha[1]).trim(),
              categoria: linha[2] ? String(linha[2]).trim() : "",
              usos: Number(linha[3]) || 0,
              desconto: Number(linha[4]) || 0,
            });
          }
        }
        novosArquivos.push({ nome: file.name, ...lojaPeriodo });
      }

      if (linhasNovas.length === 0) {
        setErroImportacao("Não encontrei o formato esperado (colunas Produto / Promoção / Categoria / Quantidade de usos / Desconto total). Confere se é o export direto da ZIG.");
      } else {
        setArquivos((prev) => [...prev, ...novosArquivos]);
        setLinhasHistorico((prev) => [...prev, ...linhasNovas]);
      }
    } catch (e) {
      setErroImportacao("Não consegui ler esse arquivo. Confere se é um .xlsx válido exportado da ZIG.");
    } finally {
      setCarregandoArquivo(false);
    }
  }

  function limparHistorico() {
    setArquivos([]);
    setLinhasHistorico([]);
    setPromoSelecionada(null);
    setErroImportacao(null);
  }

  // Agrupa as linhas brutas por Promoção, somando usos/desconto por produto
  const gruposHistorico = useMemo(() => {
    const grupos = {};
    for (const l of linhasHistorico) {
      if (!grupos[l.promocao]) grupos[l.promocao] = { nome: l.promocao, produtos: {}, totalDesconto: 0, maxUsos: 0 };
      const g = grupos[l.promocao];
      if (!g.produtos[l.produto]) g.produtos[l.produto] = { produto: l.produto, categoria: l.categoria, usos: 0, desconto: 0 };
      g.produtos[l.produto].usos += l.usos;
      g.produtos[l.produto].desconto += l.desconto;
      g.totalDesconto += l.desconto;
    }
    for (const g of Object.values(grupos)) {
      g.maxUsos = Math.max(1, ...Object.values(g.produtos).map((p) => p.usos));
      g.listaProdutos = Object.values(g.produtos).sort((a, b) => b.usos - a.usos);
    }
    return grupos;
  }, [linhasHistorico]);

  // Remove promoções que batem com as palavras-chave de exclusão (funcionário, sócio, holding...)
  const gruposFiltrados = useMemo(() => {
    const keywords = palavrasExcluir
      .split(",")
      .map((k) => normalizar(k.trim()))
      .filter(Boolean);
    return Object.values(gruposHistorico)
      .filter((g) => !keywords.some((kw) => kw && normalizar(g.nome).includes(kw)))
      .sort((a, b) => b.totalDesconto - a.totalDesconto);
  }, [gruposHistorico, palavrasExcluir]);

  function abrirPreviewPromo(nome) {
    setPromoSelecionada(nome);
    setUsosReferencia(String(gruposHistorico[nome]?.maxUsos ?? 1));
  }

  function carregarPromoNoSimulador() {
    const grupo = gruposHistorico[promoSelecionada];
    if (!grupo) return;
    const ref = parseFloat((usosReferencia || "1").replace(",", ".")) || 1;
    let naoEncontrados = 0;

    const novoCarrinho = grupo.listaProdutos.map((p) => {
      const doCatalogo = PRODUTOS.find((c) => normalizar(c.produto) === normalizar(p.produto));
      if (!doCatalogo) naoEncontrados += 1;
      const qtdMedia = +(p.usos / ref).toFixed(3);
      return {
        produto: p.produto,
        categoria: doCatalogo?.categoria || p.categoria || "OUTROS",
        custo: doCatalogo?.custo ?? 0,
        preco: doCatalogo?.preco ?? 0,
        qtd: qtdMedia > 0 ? qtdMedia : 0.1,
        custoOverride: null,
        precoOverride: null,
      };
    });

    setCarrinho(novoCarrinho);
    setNomePromo(grupo.nome);
    setPessoas("1");
    setErroImportacao(
      naoEncontrados > 0
        ? `Carregado. ${naoEncontrados} produto(s) não bateram com o catálogo atual e entraram com custo/venda em R$ 0 — confere e ajusta na lista à direita.`
        : null
    );
  }
  // ---------------------------------------------------------------------

  // ---------- Cardápios fixos: carregar / criar / salvar ----------
  function carregarCardapio(cardapio) {
    let naoEncontrados = 0;
    const novoCarrinho = cardapio.itens.map((nomeProduto) => {
      const doCatalogo = PRODUTOS.find((c) => normalizar(c.produto) === normalizar(nomeProduto));
      if (!doCatalogo) naoEncontrados += 1;
      return {
        produto: doCatalogo ? doCatalogo.produto : nomeProduto,
        categoria: doCatalogo?.categoria || "OUTROS",
        custo: doCatalogo?.custo ?? 0,
        preco: doCatalogo?.preco ?? 0,
        qtd: 1,
        custoOverride: null,
        precoOverride: null,
      };
    });

    setCarrinho(novoCarrinho);
    setNomePromo(cardapio.nome);
    setPessoas("1");
    if (cardapio.precoSugerido != null) {
      setModoPreco("fixo");
      setPrecoFixo(String(cardapio.precoSugerido).replace(".", ","));
    }
    setErroImportacao(
      naoEncontrados > 0
        ? `Carregado. ${naoEncontrados} produto(s) não bateram com o catálogo atual e entraram com custo/venda em R$ 0 — confere e ajusta na lista à direita.`
        : null
    );
  }

  function alternarItemNovoCardapio(nomeProduto) {
    setNovoCardapioItens((prev) =>
      prev.includes(nomeProduto) ? prev.filter((p) => p !== nomeProduto) : [...prev, nomeProduto]
    );
  }

  function salvarNovoCardapio() {
    if (!novoCardapioNome.trim() || novoCardapioItens.length === 0) return;
    const precoNum = parseFloat((novoCardapioPreco || "").replace(",", "."));
    const novo = {
      id: "custom-" + Date.now(),
      nome: novoCardapioNome.trim(),
      precoSugerido: isFinite(precoNum) && precoNum > 0 ? precoNum : null,
      itens: [...novoCardapioItens],
    };
    salvarCardapiosCustom([...cardapiosCustom, novo]);
    setCriandoCardapio(false);
    setNovoCardapioNome("");
    setNovoCardapioPreco("");
    setNovoCardapioItens([]);
    setBuscaCardapio("");
  }

  function removerCardapioCustom(id) {
    salvarCardapiosCustom(cardapiosCustom.filter((c) => c.id !== id));
  }

  const precoPromoNum =
    modoPreco === "fixo"
      ? parseFloat((precoFixo || "0").replace(",", ".")) * multiplicador
      : valorCardapio * (1 - parseFloat((percDesconto || "0").replace(",", ".")) / 100);

  const precoPromo = isFinite(precoPromoNum) ? precoPromoNum : 0;
  const descontoRS = valorCardapio - precoPromo;
  const descontoPct = valorCardapio > 0 ? descontoRS / valorCardapio : 0;
  const cmvPct = precoPromo > 0 ? custoTotal / precoPromo : Infinity;
  const mcRS = precoPromo - custoTotal;
  const mcPct = precoPromo > 0 ? mcRS / precoPromo : 0;
  const markup = custoTotal > 0 ? precoPromo / custoTotal : 0;
  const status = statusCmv(cmvPct);

  const temItens = carrinho.length > 0 && precoPromo > 0;

  function salvarCenario() {
    if (!temItens) return;
    setCenarios((prev) => [
      ...prev,
      {
        id: Date.now(),
        nome: nomePromo || "Sem nome",
        itens: carrinho.length,
        precoPromo,
        custoTotal,
        cmvPct,
        mcRS,
        status,
      },
    ]);
  }

  function removerCenario(id) {
    setCenarios((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#0D0D0D" }}>
      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #E8E8E2; border-radius: 8px; }
      `}</style>

      {/* Voltar ao HUB */}
      {mostrarBarraVoltar && (
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Simulador de Promoções</span>
      </div>
      )}

      <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#8C1414", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Simulador de CMV de Promoção</div>
            <div style={{ fontSize: 13, color: "#71717a" }}>Monte um pacote, defina o preço e veja se vale a pena antes de lançar</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setModoOrigem("manual")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "manual" ? tabAtiva : {}) }}
          >
            <PenLine size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Montar do zero
          </button>
          <button
            onClick={() => setModoOrigem("historico")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "historico" ? tabAtiva : {}) }}
          >
            <History size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Carregar histórico (ZIG)
          </button>
          <button
            onClick={() => setModoOrigem("cardapios")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "cardapios" ? tabAtiva : {}) }}
          >
            <BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Cardápios fixos
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 20 }}>
          {/* Catálogo */}
          {modoOrigem === "manual" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
              Catálogo ({PRODUTOS.length} itens · custo e preço de cardápio da rede)
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, outline: "none" }}
              />
            </div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13, marginBottom: 10, color: "#3f3f46", background: "#fff" }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div style={{ maxHeight: 480, overflowY: "auto", borderTop: "1px solid #F0F0F0" }}>
              {produtosFiltrados.length === 0 && (
                <div style={{ padding: "20px 4px", color: "#9ca3af", fontSize: 13 }}>Nenhum produto encontrado.</div>
              )}
              {produtosFiltrados.map((p) => (
                <div
                  key={p.produto}
                  onClick={() => adicionarItem(p)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 4px",
                    borderBottom: "1px solid #F4F4F0",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.produto}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.categoria}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontSize: 12, textAlign: "right", color: "#3f3f46" }}>
                      <div>custo {formatR$(p.custo)}</div>
                      <div style={{ color: "#9ca3af" }}>cardápio {formatR$(p.preco)}</div>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Plus size={14} color="#fff" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Histórico ZIG */}
          {modoOrigem === "historico" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
              Histórico de promoções (relatório ZIG)
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, lineHeight: 1.5 }}>
              Exporta o relatório <strong>"Promoções utilizadas"</strong> da ZIG (um ou mais meses/lojas) e sobe aqui. A gente soma o consumo real de cada produto por promoção e calcula a média por uso — sem precisar escolher produto na mão.
            </div>

            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                border: "1.5px dashed #E8E8E2", borderRadius: 10, padding: "18px 12px",
                cursor: "pointer", marginBottom: 12, color: "#71717a", fontSize: 13, fontWeight: 500,
                background: "#FAFAF8",
              }}
            >
              <Upload size={16} />
              {carregandoArquivo ? "Lendo arquivo..." : "Selecionar .xlsx da ZIG (pode ser mais de um)"}
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={(e) => e.target.files && handleArquivos(e.target.files)}
                style={{ display: "none" }}
              />
            </label>

            {erroImportacao && (
              <div style={{ fontSize: 12, color: "#B45309", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
                {erroImportacao}
              </div>
            )}

            {arquivos.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3 }}>Arquivos carregados</span>
                  <button onClick={limparHistorico} style={{ fontSize: 11, color: "#8C1414", background: "none", border: "none", cursor: "pointer" }}>
                    limpar tudo
                  </button>
                </div>
                {arquivos.map((a, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3f3f46", padding: "4px 0" }}>
                    <FileSpreadsheet size={13} color="#9ca3af" />
                    <span style={{ fontWeight: 500 }}>{a.loja || a.nome}</span>
                    {a.periodo && <span style={{ color: "#9ca3af" }}>· {a.periodo}</span>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Excluir promoções que contenham (separado por vírgula)</label>
              <input
                value={palavrasExcluir}
                onChange={(e) => setPalavrasExcluir(e.target.value)}
                style={{ ...inputMini, padding: "8px 10px", fontFamily: "inherit" }}
              />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Essas costumam ser desconto de time (funcionário, sócio, holding, supervisão etc.), não promoção pro cliente.
              </div>
            </div>

            {linhasHistorico.length > 0 && (
              <div style={{ maxHeight: 320, overflowY: "auto", borderTop: "1px solid #F0F0F0" }}>
                {gruposFiltrados.length === 0 && (
                  <div style={{ padding: "16px 4px", color: "#9ca3af", fontSize: 13 }}>
                    Nenhuma promoção sobrou depois do filtro — revê as palavras-chave acima.
                  </div>
                )}
                {gruposFiltrados.map((g) => (
                  <div key={g.nome}>
                    <div
                      onClick={() => abrirPreviewPromo(g.nome)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 4px", borderBottom: "1px solid #F4F4F0", cursor: "pointer",
                        background: promoSelecionada === g.nome ? "#FAFAF8" : "transparent",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{g.nome}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{g.listaProdutos.length} produtos distintos</div>
                      </div>
                      <div className="font-mono" style={{ fontSize: 12, color: "#3f3f46", textAlign: "right" }}>
                        <div>{formatR$(g.totalDesconto)} desconto</div>
                        <div style={{ color: "#9ca3af" }}>até {g.maxUsos} usos</div>
                      </div>
                    </div>

                    {promoSelecionada === g.nome && (
                      <div style={{ background: "#FAFAF8", borderRadius: 10, padding: 12, margin: "8px 0" }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={label}>Usos de referência (nº de vezes que a promoção foi usada)</label>
                          <input
                            value={usosReferencia}
                            onChange={(e) => setUsosReferencia(e.target.value)}
                            style={{ ...inputMini, width: 100, padding: "7px 9px" }}
                          />
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                            padrão = maior nº de usos entre os produtos ({g.maxUsos}). Ajusta se souber o nº real de pacotes vendidos.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          {g.listaProdutos.slice(0, 8).map((p) => {
                            const ref = parseFloat((usosReferencia || "1").replace(",", ".")) || 1;
                            return (
                              <div key={p.produto} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "#3f3f46" }}>
                                <span>{p.produto}</span>
                                <span className="font-mono" style={{ color: "#9ca3af" }}>{(p.usos / ref).toFixed(2)} / uso</span>
                              </div>
                            );
                          })}
                          {g.listaProdutos.length > 8 && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>+ {g.listaProdutos.length - 8} produto(s)</div>
                          )}
                        </div>
                        <button
                          onClick={carregarPromoNoSimulador}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: "#0D0D0D", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                          Carregar essa promoção no simulador →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Cardápios fixos */}
          {modoOrigem === "cardapios" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
              Cardápios fixos
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, lineHeight: 1.5 }}>
              Pacotes "à vontade" com lista de itens pronta. Clica pra carregar no simulador (quantidade entra como 1 por item, editável) ou cadastra um novo.
            </div>

            {!criandoCardapio && (
              <div style={{ maxHeight: 420, overflowY: "auto", borderTop: "1px solid #F0F0F0", marginBottom: 12 }}>
                {[
                  { titulo: "À vontade / Rodízio", lista: CARDAPIOS_PADRAO },
                  { titulo: "Corporativo — eventos fechados", lista: CARDAPIOS_CORPORATIVOS },
                  ...(cardapiosCustom.length ? [{ titulo: "Cadastrados por vocês", lista: cardapiosCustom }] : []),
                ].map((grupo) => (
                  <div key={grupo.titulo}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3, padding: "10px 4px 4px" }}>
                      {grupo.titulo}
                    </div>
                    {grupo.lista.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid #F4F4F0" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.nome}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {c.itens.length} itens{c.precoSugerido != null ? ` · sugestão ${formatR$(c.precoSugerido)}/pessoa` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => carregarCardapio(c)}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#0D0D0D", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                          >
                            Carregar →
                          </button>
                          {c.id.startsWith("custom-") && (
                            <button onClick={() => removerCardapioCustom(c.id)} style={{ ...btnCirc, color: "#8C1414" }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!criandoCardapio ? (
              <button
                onClick={() => setCriandoCardapio(true)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px dashed #E8E8E2", background: "#FAFAF8", color: "#3f3f46", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                + Cadastrar novo cardápio
              </button>
            ) : (
              <div>
                <input
                  value={novoCardapioNome}
                  onChange={(e) => setNovoCardapioNome(e.target.value)}
                  placeholder="Nome do cardápio (ex: Feijoada do Quintal)"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 8, outline: "none" }}
                />
                <input
                  value={novoCardapioPreco}
                  onChange={(e) => setNovoCardapioPreco(e.target.value)}
                  placeholder="Preço sugerido por pessoa (opcional, ex: 89,90)"
                  inputMode="decimal"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 10, outline: "none" }}
                />

                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
                  <input
                    value={buscaCardapio}
                    onChange={(e) => setBuscaCardapio(e.target.value)}
                    placeholder="Buscar produto pra adicionar..."
                    style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, outline: "none" }}
                  />
                </div>

                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                  {novoCardapioItens.length} item(ns) selecionado(s)
                </div>

                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #F0F0F0", borderRadius: 8, marginBottom: 12 }}>
                  {PRODUTOS.filter((p) => normalizar(p.produto).includes(normalizar(buscaCardapio))).slice(0, 60).map((p) => {
                    const selecionado = novoCardapioItens.includes(p.produto);
                    return (
                      <div
                        key={p.produto}
                        onClick={() => alternarItemNovoCardapio(p.produto)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 10px", borderBottom: "1px solid #F4F4F0", cursor: "pointer",
                          background: selecionado ? "#F0FDF4" : "transparent",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{p.produto}</span>
                        {selecionado && <Check size={14} color="#97A624" />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setCriandoCardapio(false); setNovoCardapioNome(""); setNovoCardapioPreco(""); setNovoCardapioItens([]); setBuscaCardapio(""); }}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E8E2", background: "#fff", color: "#3f3f46", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNovoCardapio}
                    disabled={!novoCardapioNome.trim() || novoCardapioItens.length === 0}
                    style={{
                      flex: 1, padding: "9px 12px", borderRadius: 8, border: "none",
                      background: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "#E8E8E2" : "#0D0D0D",
                      color: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "#9ca3af" : "#fff",
                      fontSize: 13, fontWeight: 600, cursor: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Salvar cardápio
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Montagem do pacote */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
                Pacote / Promoção
              </div>
              <input
                value={nomePromo}
                onChange={(e) => setNomePromo(e.target.value)}
                placeholder="Nome da promoção (ex: Pacote 04 - Sexta do Espeto)"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 12, outline: "none" }}
              />

              {carrinho.length === 0 && (
                <div style={{ padding: "24px 8px", textAlign: "center", color: "#9ca3af", fontSize: 13, border: "1px dashed #E8E8E2", borderRadius: 10 }}>
                  Clique nos produtos ao lado para montar o pacote
                </div>
              )}

              {carrinho.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.9fr auto", gap: 6, padding: "0 4px", fontSize: 10.5, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <div>Produto</div>
                    <div>Qtd.</div>
                    <div>Custo un.</div>
                    <div>Cardápio un.</div>
                    <div></div>
                  </div>
                  {carrinho.map((i) => {
                    const itemCmv = i.preco > 0 ? i.custo / i.preco : 0;
                    const itemStatus = statusCmv(itemCmv);
                    return (
                      <div key={i.produto} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.9fr auto", gap: 6, alignItems: "center", padding: "7px 8px", background: "#FAFAF8", borderRadius: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.produto}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: itemStatus.cor, background: itemStatus.bg, border: `1px solid ${itemStatus.border}`, padding: "1px 6px", borderRadius: 999 }}>
                            CMV item {formatPct(itemCmv)}
                          </span>
                        </div>
                        <input
                          value={i.qtdTexto !== undefined ? i.qtdTexto : i.qtd}
                          onChange={(e) => definirQtd(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <input
                          value={i.custoOverride !== null ? i.custoOverride : i.custo}
                          onChange={(e) => definirCusto(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <input
                          value={i.precoOverride !== null ? i.precoOverride : i.preco}
                          onChange={(e) => definirPreco(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => alterarQtd(i.produto, -1)} style={btnCirc}>
                            <Minus size={12} />
                          </button>
                          <button onClick={() => alterarQtd(i.produto, 1)} style={btnCirc}>
                            <Plus size={12} />
                          </button>
                          <button onClick={() => removerItem(i.produto)} style={{ ...btnCirc, color: "#b3261e" }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    Custo e cardápio vêm do catálogo da rede, mas dá pra sobrescrever aqui pra testar valores diferentes — não altera o catálogo original.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Nº de pessoas / multiplicador de consumo (opcional)</label>
                <input
                  value={pessoas}
                  onChange={(e) => setPessoas(e.target.value)}
                  placeholder="1"
                  inputMode="decimal"
                  style={{ ...inputMini, width: 100, padding: "8px 10px" }}
                />
                <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 8 }}>
                  Multiplica custo E preço (no modo "preço fixo") pelo nº de pessoas — deixa em 1 pra ver o valor por pessoa, ou aumenta pra projetar o evento inteiro.
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setModoPreco("fixo")}
                  style={{ ...tab, ...(modoPreco === "fixo" ? tabAtiva : {}) }}
                >
                  Preço fixo do pacote
                </button>
                <button
                  onClick={() => setModoPreco("desconto")}
                  style={{ ...tab, ...(modoPreco === "desconto" ? tabAtiva : {}) }}
                >
                  % de desconto s/ cardápio
                </button>
              </div>

              {modoPreco === "fixo" ? (
                <div>
                  <label style={label}>Preço por pessoa (R$)</label>
                  <input
                    value={precoFixo}
                    onChange={(e) => setPrecoFixo(e.target.value)}
                    placeholder="ex: 49,90"
                    inputMode="decimal"
                    style={inputBig}
                  />
                  {parseFloat((pessoas || "1").replace(",", ".")) > 1 && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      Total pro evento ({pessoas} pessoas): {formatR$((parseFloat((precoFixo || "0").replace(",", ".")) || 0) * (parseFloat((pessoas || "1").replace(",", ".")) || 1))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={label}>Desconto sobre o valor de cardápio (%)</label>
                  <input
                    value={percDesconto}
                    onChange={(e) => setPercDesconto(e.target.value)}
                    placeholder="ex: 20"
                    inputMode="decimal"
                    style={inputBig}
                  />
                  <div className="font-mono" style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    Valor de cardápio somado: {formatR$(valorCardapio)} → preço calculado: {formatR$(precoPromo)}
                  </div>
                </div>
              )}
            </div>

            {/* Resultado */}
            <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", textTransform: "uppercase" }}>Resultado da simulação</div>
                <div style={{ padding: "4px 12px", borderRadius: 999, background: status.bg, color: status.cor, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
                  {status.label}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Metrica label="Custo total" valor={formatR$(custoTotal)} />
                <Metrica label="Preço da promoção" valor={formatR$(precoPromo)} />
                <Metrica label="Valor de cardápio" valor={formatR$(valorCardapio)} />
                <Metrica label="Desconto concedido" valor={`${formatR$(descontoRS)} · ${formatPct(descontoPct)}`} />
                <Metrica destaque label="% CMV" valor={formatPct(isFinite(cmvPct) ? cmvPct : 0)} cor={status.cor} />
                <Metrica destaque label="Margem de contribuição" valor={`${formatR$(mcRS)} · ${formatPct(mcPct)}`} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#71717a", marginBottom: 14 }}>
                {mcRS >= 0 ? <TrendingUp size={14} color="#1f7a4d" /> : <TrendingDown size={14} color="#b3261e" />}
                Mark-up de {markup.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x sobre o custo · Meta de CMV da rede: 35%
              </div>

              <button
                onClick={salvarCenario}
                disabled={!temItens}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: temItens ? "#0D0D0D" : "#E8E8E2",
                  color: temItens ? "#fff" : "#9ca3af",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: temItens ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Save size={15} /> Salvar cenário para comparar
              </button>
            </div>
          </div>
        </div>

        {/* Comparação de cenários */}
        {cenarios.length > 0 && (
          <div style={{ marginTop: 20, background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <ChefHat size={14} /> Cenários salvos para comparação
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#9ca3af", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <th style={th}>Promoção</th>
                    <th style={th}>Itens</th>
                    <th style={th}>Preço</th>
                    <th style={th}>Custo</th>
                    <th style={th}>% CMV</th>
                    <th style={th}>Margem R$</th>
                    <th style={th}>Status</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cenarios.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #F0F0F0" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{c.nome}</td>
                      <td style={td}>{c.itens}</td>
                      <td className="font-mono" style={td}>{formatR$(c.precoPromo)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.custoTotal)}</td>
                      <td className="font-mono" style={td}>{formatPct(c.cmvPct)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.mcRS)}</td>
                      <td style={td}>
                        <span style={{ padding: "3px 9px", borderRadius: 999, background: c.status.bg, color: c.status.cor, border: `1px solid ${c.status.border}`, fontSize: 11, fontWeight: 700 }}>
                          {c.status.label}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => removerCenario(c.id)} style={{ ...btnCirc, color: "#b3261e" }}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metrica({ label, valor, destaque, cor }) {
  return (
    <div style={{ padding: "10px 12px", background: destaque ? "#FAFAF8" : "transparent", borderRadius: 10, border: destaque ? "1px solid #E8E8E2" : "none" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: destaque ? 18 : 15, fontWeight: 700, color: cor || "#0D0D0D" }}>
        {valor}
      </div>
    </div>
  );
}

const btnCirc = {
  width: 24,
  height: 24,
  borderRadius: 7,
  border: "1px solid #E8E8E2",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const tab = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #E8E8E2",
  background: "#fff",
  color: "#71717a",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const tabAtiva = {
  background: "#0D0D0D",
  color: "#fff",
  border: "1px solid #0D0D0D",
};

const label = {
  display: "block",
  fontSize: 11.5,
  color: "#9ca3af",
  marginBottom: 4,
};

const inputMini = {
  width: "100%",
  padding: "6px 7px",
  borderRadius: 6,
  border: "1px solid #E8E8E2",
  fontSize: 12.5,
  outline: "none",
  fontFamily: "'DM Mono', ui-monospace, monospace",
};

const inputBig = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #E8E8E2",
  fontSize: 16,
  fontWeight: 600,
  outline: "none",
};

const th = { padding: "6px 10px" };
const td = { padding: "8px 10px" };
