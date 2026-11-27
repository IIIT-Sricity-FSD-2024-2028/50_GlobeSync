// Thunks: fetchTravelerTickets, createTravelerTicket, replyTravelerTicket
import { supportTicketsApi } from '../../services/api';
import { travelerSupportActions } from './travelerSupport-slice';

export const fetchTravelerTickets = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerSupportActions.setLoading(true));
    dispatch(travelerSupportActions.setError(null));
    try {
      const data = await supportTicketsApi.getByTraveler(travelerId);
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerSupportActions.setTickets(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerSupportActions.setError(err.message || 'Failed to load support tickets.'));
      }
      return null;
    } finally {
      dispatch(travelerSupportActions.setLoading(false));
    }
  };
};

export const createTravelerTicket = (payload) => {
  return async (dispatch) => {
    dispatch(travelerSupportActions.setError(null));
    try {
      const created = await supportTicketsApi.create(payload);
      dispatch(travelerSupportActions.addTicket(created));
      return created;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerSupportActions.setError(err.message || 'Failed to submit support ticket.'));
      }
      throw err;
    }
  };
};

export const replyTravelerTicket = (ticketId, payload) => {
  return async (dispatch) => {
    dispatch(travelerSupportActions.setError(null));
    try {
      const updated = await supportTicketsApi.reply(ticketId, payload);
      if (updated) {
        dispatch(travelerSupportActions.updateTicket(updated));
      }
      return updated;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerSupportActions.setError(err.message || 'Failed to send ticket reply.'));
      }
      throw err;
    }
  };
};
