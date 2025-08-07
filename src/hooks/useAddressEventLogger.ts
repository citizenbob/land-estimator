import { AddressSuggestion } from '@app-types/localAddressTypes';
import {
  AddressSelectedEvent,
  EstimateButtonClickedEvent,
  EventMap,
  LogOptions
} from '@app-types/analytics';

export function useAddressEventLogger(
  logEvent: <T extends keyof EventMap>(
    eventName: T,
    data: EventMap[T],
    options?: LogOptions
  ) => void,
  query: string,
  suggestions: AddressSuggestion[]
) {
  const logAddressEvent = (
    suggestion: AddressSuggestion,
    eventType: 'address_selected' | 'estimate_button_clicked'
  ) => {
    if (!logEvent || !suggestion) return;

    if (eventType === 'address_selected') {
      const addressSelectedEvent: AddressSelectedEvent = {
        query: query,
        address_id: suggestion.place_id.toString(),
        position_in_results: suggestions.findIndex(
          (s) => s.place_id === suggestion.place_id
        )
      };
      logEvent('address_selected', addressSelectedEvent);
    } else if (eventType === 'estimate_button_clicked') {
      const estimateEvent: EstimateButtonClickedEvent = {
        address_id: suggestion.place_id.toString()
      };
      logEvent('estimate_button_clicked', estimateEvent);
    }
  };

  return { logAddressEvent };
}
