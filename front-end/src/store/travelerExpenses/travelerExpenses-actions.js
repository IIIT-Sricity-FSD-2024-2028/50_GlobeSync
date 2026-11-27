// Thunks: fetchTravelerExpenses, createTravelerExpense, updateTravelerExpense, deleteTravelerExpense
import { expensesApi, tripsApi } from '../../services/api';
import { travelerTripsActions } from '../travelerTrips/travelerTrips-slice';
import { travelerExpensesActions } from './travelerExpenses-slice';

export const fetchTravelerExpenses = (travelerId) => {
  return async (dispatch, getState) => {
    dispatch(travelerExpensesActions.setLoading(true));
    dispatch(travelerExpensesActions.setError(null));
    dispatch(travelerExpensesActions.setPartialError(null));
    try {
      let tripsList = getState()?.travelerTrips?.trips;
      if (!Array.isArray(tripsList) || tripsList.length === 0) {
        const tripsData = await tripsApi.getByTraveler(travelerId);
        tripsList = Array.isArray(tripsData) ? tripsData : [];
        dispatch(travelerTripsActions.setTrips(tripsList));
      }

      if (tripsList.length === 0) {
        dispatch(travelerExpensesActions.setExpenses([]));
        dispatch(travelerExpensesActions.setBudgetGauges([]));
        return [];
      }

      const tripIds = tripsList.map((t) => t.tripId || t.id);
      const [expenseGroups, gauges] = await Promise.all([
        Promise.all(tripIds.map((id) => expensesApi.getByTrip(id))),
        Promise.all(tripIds.map((id) => expensesApi.getBudgetGauge(id))),
      ]);

      const flatExpenses = expenseGroups.flatMap((items) => (Array.isArray(items) ? items : []));
      dispatch(travelerExpensesActions.setExpenses(flatExpenses));
      dispatch(travelerExpensesActions.setBudgetGauges(Array.isArray(gauges) ? gauges : []));
      return flatExpenses;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerExpensesActions.setError(err.message || 'Failed to load expense records from backend.'));
      }
      return null;
    } finally {
      dispatch(travelerExpensesActions.setLoading(false));
    }
  };
};

export const createTravelerExpense = (payload) => {
  return async (dispatch) => {
    dispatch(travelerExpensesActions.setError(null));
    try {
      const created = await expensesApi.create(payload);
      dispatch(travelerExpensesActions.addExpense(created));
      return created;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerExpensesActions.setError(err.message || 'Failed to create expense.'));
      }
      throw err;
    }
  };
};

export const updateTravelerExpense = (id, payload) => {
  return async (dispatch) => {
    dispatch(travelerExpensesActions.setError(null));
    try {
      const updated = await expensesApi.update(id, payload);
      dispatch(travelerExpensesActions.updateExpense(updated));
      return updated;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerExpensesActions.setError(err.message || 'Failed to update expense.'));
      }
      throw err;
    }
  };
};

export const deleteTravelerExpense = (id) => {
  return async (dispatch) => {
    dispatch(travelerExpensesActions.setError(null));
    try {
      await expensesApi.delete(id);
      dispatch(travelerExpensesActions.removeExpense(id));
      return true;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerExpensesActions.setError(err.message || 'Failed to delete expense.'));
      }
      throw err;
    }
  };
};
