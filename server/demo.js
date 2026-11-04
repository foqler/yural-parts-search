const products = [
  {
    goodsID: 'febi-01089',
    number: '01089',
    brand: 'FEBI',
    name: 'Натяжитель приводного ремня',
    warehouses: [
      { id: 'krd', code: 'КРД', price: 2450, stock: 12 },
      { id: 'msk', code: 'МСК', price: 2380, stock: 34 },
    ],
    analogues: [
      {
        goodsID: 'ina-534',
        number: '534 0118 20',
        brand: 'INA',
        name: 'Натяжитель поликлинового ремня',
        warehouses: [{ id: 'krd', code: 'КРД', price: 3190, stock: 6 }],
      },
      {
        goodsID: 'gates-t38148',
        number: 'T38148',
        brand: 'GATES',
        name: 'Натяжной ролик приводного ремня',
        warehouses: [{ id: 'msk', code: 'МСК', price: 2840.5, stock: 18 }],
      },
      {
        goodsID: 'snr-ga353',
        number: 'GA353.59',
        brand: 'SNR',
        name: 'Натяжитель ремня в сборе',
        warehouses: [{ id: 'rst', code: 'РСТ', price: 2650, stock: 0 }],
      },
    ],
  },
  {
    goodsID: 'swag-01089',
    number: '01089',
    brand: 'SWAG',
    name: 'Натяжитель приводного ремня',
    warehouses: [{ id: 'msk', code: 'МСК', price: 2570, stock: 8 }],
    analogues: [],
  },
  {
    goodsID: 'mann-w914',
    number: 'W 914/2',
    brand: 'MANN-FILTER',
    name: 'Масляный фильтр',
    warehouses: [
      { id: 'krd', code: 'КРД', price: 690, stock: 42 },
      { id: 'rst', code: 'РСТ', price: 715, stock: 16 },
    ],
    analogues: [
      {
        goodsID: 'bosch-p3274',
        number: 'P 3274',
        brand: 'BOSCH',
        name: 'Фильтр масла двигателя',
        warehouses: [{ id: 'msk', code: 'МСК', price: 580, stock: 25 }],
      },
    ],
  },
  {
    goodsID: 'meyle-716',
    number: '7160500039S',
    brand: 'MEYLE',
    name: 'Комплект рычагов задней подвески',
    warehouses: [{ id: 'mc2', code: 'МС2', price: 12533.62, stock: 20 }],
    analogues: [
      {
        goodsID: 'mapco-53612',
        number: '53612/1',
        brand: 'MAPCO',
        name: 'Комплект рычагов задней подвески с болтами',
        warehouses: [{ id: 'pt4', code: 'ПТ4', price: 8680.2, stock: 10 }],
      },
      {
        goodsID: 'meyle-716-k',
        number: '7160500039/SK',
        brand: 'MEYLE',
        name: 'Рычаги задней подвески на одну сторону',
        count: 0,
        warehouses: [],
      },
    ],
  },
]

export function searchDemo(number, brand) {
  const goods = products
    .filter(
      (item) =>
        item.number.replaceAll(' ', '').toUpperCase() === number.replaceAll(' ', '').toUpperCase(),
    )
    .filter((item) => !brand || item.brand === brand)
    .map((item) => ({ ...item, analogues: brand ? item.analogues : [] }))

  return { goods: goods.length ? goods : [{}] }
}
