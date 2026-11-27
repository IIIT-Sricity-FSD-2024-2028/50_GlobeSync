// Traveler expenses slice: stores itemized trip expenses, budget gauges, and partial warnings.
// Pure synchronous Immer reducers; async requests live in travelerExpenses-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  expenses: [],
  budgetGauges: [],
  loading: false,
  error: null,
  partialError: null,
};

const travelerExpensesSlice = createSlice({
  name: 'travelerExpenses',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setError(state, action) {
      state.error = action.payload ?? null;
    },
    setPartialError(state, action) {
      state.partialError = action.payload ?? null;
    },
    clearError(state) {
      state.error = null;
      state.partialError = null;
    },
    setExpenses(state, action) {
      state.expenses = Array.isArray(action.payload) ? action.payload : [];
    },
    setBudgetGauges(state, action) {
      state.budgetGauges = Array.isArray(action.payload) ? action.payload : [];
    },
    addExpense(state, action) {
      if (action.payload) state.expenses.unshift(action.payload);
    },
    updateExpense(state, action) {
      const updated = action.payload;
      const targetId = updated?.expenseId || updated?.id;
      const idx = state.expenses.findIndex((e) => (e.expenseId || e.id) === targetId);
      if (idx >= 0) state.expenses[idx] = { ...state.expenses[idx], ...updated };
    },
    removeExpense(state, action) {
      state.expenses = state.expenses.filter((e) => (e.expenseId || e.id) !== action.payload);
    },
    resetTravelerExpenses() {
      return initialState;
    },
  },
});

export const travelerExpensesActions = travelerExpensesSlice.actions;
export default travelerExpensesSlice;
