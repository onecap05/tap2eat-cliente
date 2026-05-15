import { TemporaryUnavailabilityReason } from '../commons/IAvailabilityConfigResponse';

export interface IPauseProductRequest {
  temporaryReason: TemporaryUnavailabilityReason;
  temporaryReasonDetail?: string | null;
}