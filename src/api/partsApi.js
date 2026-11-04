import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { getBrands, getOffers } from './normalize'

export const partsApi = createApi({
  reducerPath: 'partsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${window.location.origin}/api/`, timeout: 16000 }),
  endpoints: (builder) => ({
    getConfig: builder.query({
      query: () => 'config',
    }),
    getBrands: builder.query({
      query: (number) => ({ url: 'search', params: { number } }),
      transformResponse: (response) => getBrands(response.goods),
    }),
    getOffers: builder.query({
      query: ({ number, brand }) => ({ url: 'search', params: { number, brand } }),
      transformResponse: (response) => getOffers(response.goods),
    }),
  }),
})

export const { useGetConfigQuery, useGetBrandsQuery, useGetOffersQuery } = partsApi
