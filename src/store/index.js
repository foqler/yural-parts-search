import { configureStore } from '@reduxjs/toolkit'
import search from './searchSlice'
import { partsApi } from '../api/partsApi'

export function createStore() {
  return configureStore({
    reducer: { search, [partsApi.reducerPath]: partsApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(partsApi.middleware),
  })
}
