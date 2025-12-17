// Google Maps Places API type declarations
declare namespace google.maps.places {
  class Autocomplete {
    constructor(input: HTMLInputElement, options?: AutocompleteOptions)
    addListener(event: string, handler: () => void): void
    getPlace(): PlaceResult
  }

  interface AutocompleteOptions {
    types?: string[]
    fields?: string[]
    componentRestrictions?: { country: string | string[] }
  }

  interface PlaceResult {
    address_components?: AddressComponent[]
    formatted_address?: string
  }

  interface AddressComponent {
    long_name: string
    short_name: string
    types: string[]
  }
}

declare namespace google.maps.event {
  function clearInstanceListeners(instance: object): void
}

interface Window {
  google?: {
    maps?: {
      places?: typeof google.maps.places
      event: typeof google.maps.event
    }
  }
}
