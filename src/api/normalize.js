export function getBrands(goods) {
  return [...new Set(goods.map((item) => item.brand?.trim()).filter(Boolean))].sort()
}

export function getOffers(goods) {
  const items = new Map()

  function addItem(item, analogue) {
    if (!item.brand || !item.number) return

    const id = item.goodsID || `${item.brand}:${item.number}`
    if (!items.has(id)) items.set(id, { ...item, id, analogue })
  }

  goods.forEach((item) => addItem(item, false))
  goods.forEach((item) => item.analogues?.forEach((analogue) => addItem(analogue, true)))

  return [...items.values()].flatMap((item) => {
    const warehouses = item.warehouses?.length ? item.warehouses : [{ stock: item.count ?? 0 }]

    return warehouses.map((warehouse, index) => ({
      id: `${item.id}:${warehouse.id ?? index}`,
      brand: item.brand,
      number: item.number,
      name: item.name || 'Название не указано',
      warehouse: warehouse.code || warehouse.id || '—',
      price: warehouse.price == null || warehouse.price === '' ? null : Number(warehouse.price),
      stock: Number(warehouse.stock) || 0,
      analogue: item.analogue,
    }))
  })
}
