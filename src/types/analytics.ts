export interface AddressSelectedEvent {
  query: string;
  address_id: string;
  position_in_results: number;
}

export interface EstimateButtonClickedEvent {
  address_id: string;
}

export interface EventMap {
  address_selected: AddressSelectedEvent;
  estimate_button_clicked: EstimateButtonClickedEvent;
}

export interface LogOptions {
  toMixpanel?: boolean;
  toFirestore?: boolean;
}
