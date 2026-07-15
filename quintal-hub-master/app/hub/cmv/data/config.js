// URL do Apps Script — substitua após publicar
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyisrFoxxf9vYV0Kj2Hm_Iwu5a5KxUczTOWVYENU4PU6_vmVnzvzUgKOE73OABYp26Xg/exec';

// Mapa de lojas ZIG → loja normalizada + canal
export const MAPA_LOJAS = {
  'Quintal do Espeto Carinás':          { loja: 'CARINAS',       canal: 'CASA' },
  'Delivery Carinás':                   { loja: 'CARINAS',       canal: 'DELIVERY' },
  'Quintal do Espeto Lapa ':            { loja: 'LAPA',          canal: 'CASA' },
  'Delivery Lapa':                      { loja: 'LAPA',          canal: 'DELIVERY' },
  'Quintal do Espeto  V. Mariana':      { loja: 'VILA MARIANA',  canal: 'CASA' },
  'Delivery V. Mariana':                { loja: 'VILA MARIANA',  canal: 'DELIVERY' },
  'Quintal do Espeto Chac Sto Antonio': { loja: 'CHACARA',       canal: 'CASA' },
  'Delivery Chac. Sto Antonio':         { loja: 'CHACARA',       canal: 'DELIVERY' },
  'Quintal do Espeto Santo André':      { loja: 'SANTO ANDRE',   canal: 'CASA' },
  'Delivery Santo André':               { loja: 'SANTO ANDRE',   canal: 'DELIVERY' },
  'Quintal do Espeto Pavão':            { loja: 'PAVAO',         canal: 'CASA' },
  'Delivery Pavão':                     { loja: 'PAVAO',         canal: 'DELIVERY' },
  'Quintal do Espeto  V. Madalena':     { loja: 'VILA MADALENA', canal: 'CASA' },
  'Delivery Vila Madalena':             { loja: 'VILA MADALENA', canal: 'DELIVERY' },
  'Quintal do Espeto Perdizes':         { loja: 'PERDIZES',      canal: 'CASA' },
  'Delivery Perdizes':                  { loja: 'PERDIZES',      canal: 'DELIVERY' },
  'Quintal do Espeto Tatuapé':          { loja: 'TATUAPE',       canal: 'CASA' },
  'Delivery Tatuapé':                   { loja: 'TATUAPE',       canal: 'DELIVERY' },
  'Quintal do Espeto Santana':          { loja: 'SANTANA',       canal: 'CASA' },
  'Delivery Santana':                   { loja: 'SANTANA',       canal: 'DELIVERY' },
};

// Lojas ativas (as 10 unidades da rede) — usado para filtrar e normalizar
// Segmentação por porte
export const LOJAS_GRANDES = ['TATUAPÉ', 'CARINAS', 'SANTO ANDRÉ', 'SANTANA'];
export const LOJAS_MENORES = ['VILA MARIANA', 'PAVÃO', 'VILA MADALENA', 'LAPA', 'PERDIZES', 'CHÁCARA'];

export const LOJAS_ATIVAS = [
  'CARINAS', 'CHÁCARA', 'LAPA', 'PAVÃO', 'PERDIZES',
  'SANTANA', 'SANTO ANDRÉ', 'TATUAPÉ', 'VILA MADALENA', 'VILA MARIANA',
];

// Normaliza nomes de unidade vindos do desperdício
// (acentos, espaços, grafias diferentes → nome canônico)
export const NORMALIZA_UNIDADE = {
  // Carinás
  'CARINAS ':    'CARINAS',
  'CARINÁS':     'CARINAS',
  'CARINÁS ':    'CARINAS',
  'CARINAS':     'CARINAS',
  // Chácara
  'CHACARA':     'CHACARA',
  'CHÁCARA':     'CHACARA',
  'CHAC':        'CHACARA',
  // Lapa
  'LAPA':        'LAPA',
  // Pavão
  'PAVAO':       'PAVAO',
  'PAVÃO':       'PAVAO',
  // Perdizes
  'PERDIZES':    'PERDIZES',
  // Santana
  'SANTANA':     'SANTANA',
  // Santo André
  'SANTO ANDRÉ': 'SANTO ANDRE',
  'SANTO ANDRE': 'SANTO ANDRE',
  // Tatuapé
  'TATUAPÉ':     'TATUAPE',
  'TATUAPE':     'TATUAPE',
  // Vila Madalena
  'VILA MADALENA': 'VILA MADALENA',
  // Vila Mariana
  'VILA MARIANA':  'VILA MARIANA',
};

export function normalizaUnidade(raw) {
  // Nomes já chegam normalizados da planilha — só trim e uppercase
  return String(raw || '').toUpperCase().trim();
}

// Almoço: seg–sex, 11h–15h
export const ALMOCO_INICIO = 11;
export const ALMOCO_FIM    = 15;

// Meta CMV global
export const META_CMV = 0.35;
