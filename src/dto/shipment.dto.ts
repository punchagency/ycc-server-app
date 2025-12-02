import Validate from '../utils/Validate';

export class ShipmentDTO {
    static validateRateSelection(data: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.rateId || !Validate.stringLength(data.rateId, 1, 255)) {
            errors.push('Valid rate ID is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
