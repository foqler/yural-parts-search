import { describe, expect, it } from 'vitest'
import { getBrands, getOffers } from './normalize'

describe('ответ Favorit Parts', () => {
  it('собирает уникальных производителей и пропускает пустую структуру', () => {
    const goods = [{}, { brand: '' }, { brand: 'MEYLE' }, { brand: 'FEBI' }, { brand: 'MEYLE' }]

    expect(getBrands(goods)).toEqual(['FEBI', 'MEYLE'])
  })

  it('показывает отдельное предложение для каждого склада, используя цену склада', () => {
    const goods = [
      {
        goodsID: '1',
        brand: 'MEYLE',
        number: '123',
        name: 'Фильтр',
        price: 1,
        count: 99,
        warehouses: [
          { id: 'a', code: 'КРД', price: 850.5, stock: 4 },
          { id: 'b', code: 'МСК', price: 910, stock: 8 },
        ],
      },
    ]

    expect(getOffers(goods)).toMatchObject([
      {
        brand: 'MEYLE',
        number: '123',
        name: 'Фильтр',
        warehouse: 'КРД',
        price: 850.5,
        stock: 4,
        analogue: false,
      },
      { warehouse: 'МСК', price: 910, stock: 8 },
    ])
  })

  it('добавляет вложенные аналоги и сохраняет нулевой остаток', () => {
    const goods = [
      {
        goodsID: '1',
        brand: 'MEYLE',
        number: '123',
        name: 'Фильтр',
        warehouses: [],
        analogues: [
          {
            goodsID: '2',
            brand: 'MANN',
            number: '456',
            name: 'Фильтр аналог',
            warehouses: [{ id: 'a', price: 0, stock: 0 }],
          },
        ],
      },
    ]

    expect(getOffers(goods)).toMatchObject([
      { brand: 'MEYLE', price: null, stock: 0 },
      { brand: 'MANN', price: 0, stock: 0, analogue: true },
    ])
  })

  it('пустая структура не становится пустой строкой в таблице', () => {
    expect(getOffers([{}])).toEqual([])
    expect(getOffers([{ brand: '', number: '', name: '', warehouses: [] }])).toEqual([])
  })

  it('не дублирует товар, который встретился и в выдаче, и в аналогах', () => {
    const item = {
      goodsID: '1',
      brand: 'MEYLE',
      number: '123',
      warehouses: [{ id: 'a', price: 800, stock: 2 }],
    }
    const other = { goodsID: '2', brand: 'FEBI', number: '456', warehouses: [], analogues: [item] }

    expect(getOffers([item, other]).filter((offer) => offer.brand === 'MEYLE')).toHaveLength(1)
  })
})
