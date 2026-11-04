import { createSlice } from '@reduxjs/toolkit'

const searchSlice = createSlice({
  name: 'search',
  initialState: { number: '', brand: '' },
  reducers: {
    numberChanged(state, action) {
      state.number = action.payload
      state.brand = ''
    },
    brandSelected(state, action) {
      state.brand = action.payload
    },
  },
})

export const { numberChanged, brandSelected } = searchSlice.actions
export default searchSlice.reducer
