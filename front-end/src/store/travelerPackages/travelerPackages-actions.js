// Thunks: fetchTravelerPackages
import { packagesApi } from '../../services/api';
import { travelerPackagesActions } from './travelerPackages-slice';

export const fetchTravelerPackages = () => {
  return async (dispatch) => {
    dispatch(travelerPackagesActions.setLoading(true));
    dispatch(travelerPackagesActions.setError(null));
    try {
      const data = await packagesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerPackagesActions.setPackages(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerPackagesActions.setError(err.message || 'Failed to load tour packages.'));
      }
      return null;
    } finally {
      dispatch(travelerPackagesActions.setLoading(false));
    }
  };
};
