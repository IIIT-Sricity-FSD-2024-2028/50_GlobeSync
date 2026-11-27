// Thunks: fetchTravelerMessages, retryFetchGuides, sendTravelerMessage
import { guidesApi, messagesApi } from '../../services/api';
import { travelerMessagesActions } from './travelerMessages-slice';

export const fetchTravelerMessages = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerMessagesActions.setLoading(true));
    dispatch(travelerMessagesActions.setError(null));
    try {
      const data = await messagesApi.getByUser('traveler', travelerId);
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerMessagesActions.setMessages(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerMessagesActions.setError(err.message || 'Failed to load messages.'));
      }
      return null;
    } finally {
      dispatch(travelerMessagesActions.setLoading(false));
    }
  };
};

export const retryFetchGuides = () => {
  return async (dispatch) => {
    dispatch(travelerMessagesActions.setGuidesWarning(null));
    try {
      const data = await guidesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerMessagesActions.setGuides(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerMessagesActions.setGuidesWarning(err.message || 'Could not load guides directory.'));
      }
      return [];
    }
  };
};

export const sendTravelerMessage = (payload) => {
  return async (dispatch) => {
    dispatch(travelerMessagesActions.setIsSending(true));
    try {
      const created = await messagesApi.create(payload);
      dispatch(travelerMessagesActions.appendMessage(created));
      return created;
    } catch (err) {
      throw err;
    } finally {
      dispatch(travelerMessagesActions.setIsSending(false));
    }
  };
};
